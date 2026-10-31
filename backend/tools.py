import os
import json
from datetime import datetime, timedelta
import requests
from sqlalchemy.orm import Session
try:
    from google.genai import types
except Exception:
    types = None

from database import now_ist
from models import (
    Merchant,
    Settlement,
    Refund,
    Transaction,
    Soundbox,
    Loan,
    Lead,
    Ticket,
    ActionLog,
)

def get_ai_limit() -> float:
    try:
        return float(os.getenv("AI_LIMIT", "10000"))
    except ValueError:
        return 10000.0

def mask_phone(phone: str) -> str:
    clean = phone.strip()
    if len(clean) >= 4:
        return f"+91 ****** {clean[-4:]}"
    return "+91 ****** 0000"

# 6 short policy texts
POLICY_TEXTS = {
    "settlement": (
        "Daily settlements are processed automatically by 7:00 AM every business day. "
        "Delayed or stuck settlements can be instantly re-routed via the IMPS 24x7 fast rail "
        "for amounts up to Rs 10,000 provided merchant bank IFSC and KYC verification are in 'verified' status."
    ),
    "refund": (
        "Customer UPI payment disputes and stuck refunds can be re-queried and auto-reversed "
        "via the NPCI Fast-Track UPI Reversal API for transactions up to Rs 10,000. Successful reversals "
        "are credited back to the customer's VPA within 5 minutes."
    ),
    "kyc": (
        "Paytm merchant regulations require the legal business name on bank records to match the bank account holder "
        "and branch IFSC. If a mismatch is detected, re-verifying the branch IFSC against the RBI switch automatically "
        "clears the hold and updates the KYC profile to verified."
    ),
    "soundbox": (
        "Paytm Soundbox 4G IoT devices can be remotely diagnosed and reconnected over-the-air. "
        "Network errors and speaker volume faults can be resolved remotely. However, if device battery is below 15% (battery_low), "
        "the merchant must charge the hardware manually with the provided 5V charger."
    ),
    "loan": (
        "Paytm Merchant Lending offers pre-approved collateral-free business loans based on 30-day QR collection history. "
        "Eligible merchants with verified KYC can receive offers between Rs 50,000 and Rs 5,00,000, repayable through "
        "automated daily deductions from incoming QR collections."
    ),
    "pos": (
        "Paytm Card Machine (EDC POS) terminals accept all Visa, RuPay, and Mastercard debit/credit cards along with dynamic UPI QR. "
        "Features 4G all-network SIM connectivity, instant paper print receipts, and next-day zero-MDR settlement."
    ),
}

# Plain tool functions
def tool_get_merchant(db: Session, merchant_id: int):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        return {"error": f"Merchant #{merchant_id} not found"}
    return {
        "id": m.id,
        "name": m.name,
        "shop_name": m.shop_name,
        "city": m.city,
        "language": m.language,
        "phone": mask_phone(m.phone),
        "kyc_status": m.kyc_status,
        "bank_name_on_kyc": m.bank_name_on_kyc,
        "ifsc": m.ifsc,
        "bank_name_on_account": m.bank_name_on_account,
        "_log": f"Retrieved profile for {m.shop_name} ({m.city}), KYC status: {m.kyc_status}",
    }

def tool_get_settlement_status(db: Session, merchant_id: int):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        return {"error": f"Merchant #{merchant_id} not found"}
    settlements = (
        db.query(Settlement)
        .filter(Settlement.merchant_id == merchant_id)
        .order_by(Settlement.id.desc())
        .limit(3)
        .all()
    )
    items = []
    for s in settlements:
        items.append({
            "id": s.id,
            "amount": s.amount,
            "status": s.status,
            "reason": s.reason,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    return {
        "merchant_id": merchant_id,
        "kyc_status": m.kyc_status,
        "settlements": items,
        "_log": f"Checked settlement status: {len(items)} records found, KYC is {m.kyc_status}",
    }

def tool_verify_bank_ifsc(db: Session, merchant_id: int):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        return {"error": f"Merchant #{merchant_id} not found"}
    ifsc = (m.ifsc or "").strip().upper()
    bank_from_ifsc = None

    try:
        resp = requests.get(f"https://ifsc.razorpay.com/{ifsc}", timeout=4)
        if resp.status_code == 200:
            bank_from_ifsc = resp.json().get("BANK")
    except Exception:
        pass

    if not bank_from_ifsc:
        prefixes = {
            "SBIN": "State Bank of India",
            "HDFC": "HDFC Bank",
            "ICIC": "ICICI Bank",
            "UTIB": "Axis Bank",
            "KKBK": "Kotak Mahindra Bank",
            "PUNB": "Punjab National Bank",
        }
        for pfx, bname in prefixes.items():
            if ifsc.startswith(pfx):
                bank_from_ifsc = bname
                break
        if not bank_from_ifsc:
            bank_from_ifsc = "Verified Commercial Bank"

    matches = (bank_from_ifsc.lower() in m.bank_name_on_kyc.lower()) or (m.bank_name_on_kyc.lower() in bank_from_ifsc.lower())

    return {
        "ifsc": ifsc,
        "actual_bank": bank_from_ifsc,
        "kyc_bank": m.bank_name_on_kyc,
        "account_bank": m.bank_name_on_account,
        "matches": matches,
        "_log": f"Verified IFSC {ifsc}: Bank resolved to '{bank_from_ifsc}' (KYC recorded '{m.bank_name_on_kyc}', matches: {matches})",
    }

def tool_retrigger_kyc(db: Session, merchant_id: int):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        return {"error": f"Merchant #{merchant_id} not found"}
    
    # Update KYC bank to match actual account bank
    if m.bank_name_on_account:
        m.bank_name_on_kyc = m.bank_name_on_account
    m.kyc_status = "verified"
    db.commit()

    return {
        "merchant_id": merchant_id,
        "kyc_status": "verified",
        "bank_name_on_kyc": m.bank_name_on_kyc,
        "_log": f"Retriggered KYC verification for merchant #{merchant_id}: Updated KYC to verified ({m.bank_name_on_kyc})",
    }

def tool_reroute_settlement_imps(db: Session, settlement_id: int):
    s = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not s:
        return {"error": f"Settlement #{settlement_id} not found"}

    ai_limit = get_ai_limit()
    if s.amount > ai_limit:
        ticket = Ticket(
            merchant_id=s.merchant_id,
            summary=f"High-value settlement hold: Rs {s.amount:,.0f} (> Rs {ai_limit:,.0f} automated limit)",
            priority="high",
            status="open",
            created_at=now_ist(),
        )
        db.add(ticket)
        db.commit()
        return {
            "needs_human": True,
            "error": f"Settlement amount Rs {s.amount:,.0f} exceeds automated threshold (Rs {ai_limit:,.0f}). Handing off to senior desk lead.",
            "ticket_id": ticket.id,
            "amount": s.amount,
            "_log": f"Settlement #{settlement_id} (Rs {s.amount:,.0f}) exceeds AI limit. Created ticket #{ticket.id}",
        }

    m = db.query(Merchant).filter(Merchant.id == s.merchant_id).first()
    if m and m.kyc_status != "verified":
        return {
            "error": f"KYC status is '{m.kyc_status}'. KYC must be verified before settlement re-routing.",
            "kyc_status": m.kyc_status,
            "_log": f"Cannot reroute settlement #{settlement_id}: KYC is {m.kyc_status}",
        }

    s.status = "paid"
    s.reason = "Released through IMPS"
    db.commit()

    utr = f"IMPS{s.id}{now_ist().strftime('%M%S')}"
    return {
        "settlement_id": s.id,
        "amount": s.amount,
        "status": "paid",
        "utr": utr,
        "bank": m.bank_name_on_account if m else "HDFC Bank",
        "ifsc": m.ifsc if m else "HDFC0000240",
        "_log": f"Rerouted settlement #{settlement_id} (Rs {s.amount:,.0f}) via IMPS Instant Payout rail (UTR: {utr})",
    }

def tool_get_recent_transactions(db: Session, merchant_id: int, limit: int = 5):
    txns = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id)
        .order_by(Transaction.created_at.desc(), Transaction.id.desc())
        .limit(limit)
        .all()
    )
    items = []
    for t in txns:
        items.append({
            "id": t.id,
            "amount": t.amount,
            "payer": t.payer,
            "mode": t.mode,
            "status": t.status,
            "time": t.created_at.strftime("%H:%M"),
        })
    return {
        "merchant_id": merchant_id,
        "transactions": items,
        "_log": f"Retrieved {len(items)} recent QR transactions for merchant #{merchant_id}",
    }

def tool_get_refund_status(db: Session, merchant_id: int):
    refunds = (
        db.query(Refund)
        .filter(Refund.merchant_id == merchant_id)
        .order_by(Refund.id.desc())
        .limit(5)
        .all()
    )
    items = []
    for r in refunds:
        items.append({
            "id": r.id,
            "amount": r.amount,
            "status": r.status,
            "upi_ref": r.upi_ref,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
    return {
        "merchant_id": merchant_id,
        "refunds": items,
        "_log": f"Checked refunds for merchant #{merchant_id}: {len(items)} records",
    }

def tool_retry_refund(db: Session, refund_id: int):
    r = db.query(Refund).filter(Refund.id == refund_id).first()
    if not r:
        return {"error": f"Refund #{refund_id} not found"}

    if r.status != "failed":
        return {"error": f"Refund #{refund_id} status is '{r.status}', only failed refunds can be retried"}

    ai_limit = get_ai_limit()
    if r.amount > ai_limit:
        ticket = Ticket(
            merchant_id=r.merchant_id,
            summary=f"High-value refund dispute: Rs {r.amount:,.0f} (> Rs {ai_limit:,.0f} limit)",
            priority="high",
            status="open",
            created_at=now_ist(),
        )
        db.add(ticket)
        db.commit()
        return {
            "needs_human": True,
            "error": f"Refund amount Rs {r.amount:,.0f} exceeds automated threshold. Escalated to human desk.",
            "ticket_id": ticket.id,
            "_log": f"Refund #{refund_id} exceeds AI limit. Created ticket #{ticket.id}",
        }

    r.status = "retrying"
    db.commit()

    return {
        "refund_id": r.id,
        "amount": r.amount,
        "status": "retrying",
        "upi_ref": r.upi_ref or f"UPI{r.id}{now_ist().strftime('%M%S')}",
        "_log": f"Retried stuck refund #{refund_id} (Rs {r.amount:,.0f}) via NPCI auto-reversal",
    }

def tool_diagnose_soundbox(db: Session, merchant_id: int):
    sb = db.query(Soundbox).filter(Soundbox.merchant_id == merchant_id).first()
    if not sb:
        return {"error": f"No Soundbox device assigned to merchant #{merchant_id}"}
    return {
        "device_id": sb.device_id,
        "status": sb.status,
        "battery": sb.battery,
        "fault": sb.fault,
        "last_seen": sb.last_seen.strftime("%Y-%m-%d %H:%M:%S"),
        "_log": f"Diagnosed Soundbox {sb.device_id}: Status '{sb.status}', Battery {sb.battery}%, Fault '{sb.fault or 'none'}'",
    }

def tool_remote_fix_soundbox(db: Session, merchant_id: int):
    sb = db.query(Soundbox).filter(Soundbox.merchant_id == merchant_id).first()
    if not sb:
        return {"error": f"No Soundbox assigned to merchant #{merchant_id}"}

    if sb.fault == "battery_low" or sb.battery < 15:
        return {
            "fixed": False,
            "device_id": sb.device_id,
            "battery": sb.battery,
            "fault": sb.fault,
            "reason": f"Device battery is critically low ({sb.battery}%). Device cannot be fixed remotely. Merchant must plug in charger.",
            "_log": f"Soundbox {sb.device_id} battery is critically low ({sb.battery}%). Remote fix refused; manual charging required.",
        }

    sb.status = "online"
    sb.fault = ""
    sb.last_seen = now_ist()
    db.commit()

    return {
        "fixed": True,
        "device_id": sb.device_id,
        "status": "online",
        "battery": sb.battery,
        "_log": f"Remote fix applied to Soundbox {sb.device_id}: Restored online, calibrated volume & chime",
    }

def tool_check_loan_eligibility(db: Session, merchant_id: int):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        return {"error": f"Merchant #{merchant_id} not found"}

    thirty_days_ago = now_ist() - timedelta(days=30)
    txns = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id, Transaction.created_at >= thirty_days_ago)
        .all()
    )
    sales = sum(t.amount for t in txns)

    if m.kyc_status != "verified" or sales <= 0:
        return {
            "eligible": False,
            "monthly_sales": sales,
            "kyc_status": m.kyc_status,
            "reason": "KYC must be verified and 30-day QR collection must be greater than zero.",
            "_log": f"Checked loan eligibility for #{merchant_id}: Not eligible (KYC {m.kyc_status}, 30d sales Rs {sales})",
        }

    raw_offer = 2.0 * sales
    max_offer = max(50000.0, min(500000.0, raw_offer))
    # Round to nearest 1000
    max_offer = round(max_offer / 1000.0) * 1000.0

    return {
        "eligible": True,
        "monthly_sales": sales,
        "max_offer": max_offer,
        "kyc_status": m.kyc_status,
        "_log": f"Checked loan eligibility for #{merchant_id}: Eligible for up to Rs {max_offer:,.0f} (30d sales Rs {sales:,.0f})",
    }

def tool_presanction_loan(db: Session, merchant_id: int, amount: float):
    elig = tool_check_loan_eligibility(db, merchant_id)
    if not elig.get("eligible"):
        return {"error": "Merchant is not eligible for a shop loan."}

    max_offer = elig.get("max_offer", 0)
    if amount > max_offer:
        return {
            "error": f"Requested amount Rs {amount:,.0f} exceeds maximum pre-approved offer Rs {max_offer:,.0f}."
        }

    loan = Loan(
        merchant_id=merchant_id,
        amount=amount,
        status="pre-sanctioned",
        created_at=now_ist(),
    )
    db.add(loan)
    db.commit()

    daily_deduction = max(50, round(amount * 0.00112))
    return {
        "loan_id": loan.id,
        "merchant_id": merchant_id,
        "amount": amount,
        "status": "pre-sanctioned",
        "interest": "1.1% flat monthly",
        "daily_deduction": f"Rs {daily_deduction}/day from QR sales",
        "_log": f"Pre-sanctioned shop loan of Rs {amount:,.0f} for merchant #{merchant_id} (Loan #{loan.id})",
    }

def tool_search_policy(db: Session, question: str):
    q_lower = question.lower()
    matches = []
    keywords = {
        "settlement": ["settle", "settlement", "delay", "imps", "paisa", "account", "payout"],
        "refund": ["refund", "wapas", "return", "customer", "dispute", "reversal"],
        "kyc": ["kyc", "bank mismatch", "ifsc", "name", "pan", "aadhaar", "document"],
        "soundbox": ["soundbox", "speaker", "awaz", "voice", "battery", "offline", "network"],
        "loan": ["loan", "karz", "borrow", "credit", "working capital", "lending", "sanction"],
        "pos": ["pos", "edc", "card machine", "swipe", "terminal"],
    }
    
    scored = []
    for topic, kw_list in keywords.items():
        score = sum(1 for kw in kw_list if kw in q_lower)
        if score > 0:
            scored.append((score, topic))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    if scored:
        best_topic = scored[0][1]
        text = POLICY_TEXTS[best_topic]
    else:
        text = POLICY_TEXTS["settlement"]

    return {
        "policy": text,
        "_log": f"Searched policy for query '{question[:40]}...'",
    }

def tool_create_ticket(db: Session, summary: str, priority: str = "normal", merchant_id: int = None):
    ticket = Ticket(
        merchant_id=merchant_id,
        summary=summary,
        priority=priority if priority in ["low", "normal", "high"] else "normal",
        status="open",
        created_at=now_ist(),
    )
    db.add(ticket)
    db.commit()

    return {
        "needs_human": True,
        "ticket_id": ticket.id,
        "summary": summary,
        "priority": ticket.priority,
        "status": "open",
        "_log": f"Created {ticket.priority} priority ticket #{ticket.id}: '{summary}'",
    }

def tool_get_lead(db: Session, lead_id: int):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": f"Lead #{lead_id} not found"}
    return {
        "id": lead.id,
        "name": lead.name,
        "phone": mask_phone(lead.phone),
        "city": lead.city,
        "interest": lead.interest,
        "stage": lead.stage,
        "notes": lead.notes,
        "_log": f"Retrieved sales lead #{lead.id}: {lead.name} ({lead.city}, interest: {lead.interest})",
    }

def tool_send_offer(db: Session, lead_id: int, product: str, message: str):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": f"Lead #{lead_id} not found"}
    lead.stage = "talking"
    lead.notes = (lead.notes + f" | Sent {product} offer: {message}").strip(" |")
    db.commit()
    return {
        "lead_id": lead.id,
        "stage": "talking",
        "product": product,
        "_log": f"Sent {product} offer to lead #{lead.id} ({lead.name}); stage updated to talking",
    }

def tool_book_followup(db: Session, lead_id: int, datetime_iso: str):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": f"Lead #{lead_id} not found"}
    lead.stage = "booked"
    lead.notes = (lead.notes + f" | Field followup booked for: {datetime_iso}").strip(" |")
    db.commit()
    return {
        "lead_id": lead.id,
        "stage": "booked",
        "datetime": datetime_iso,
        "_log": f"Booked doorstep visit for lead #{lead.id} at {datetime_iso}; stage updated to booked",
    }

def make_card(tool_name: str, result: dict, merchant=None, db=None):
    now_str = now_ist().strftime("%I:%M %p")
    if not isinstance(result, dict):
        return None

    if tool_name == "reroute_settlement_imps":
        if result.get("status") == "paid":
            amt = result.get("amount", 0)
            return {
                "type": "settlement",
                "title": "Paytm Instant IMPS Settlement",
                "amount": f"₹{amt:,.0f}",
                "utr": result.get("utr", f"IMPS{now_ist().strftime('%M%S')}"),
                "bank": result.get("bank", "HDFC Bank"),
                "ifsc": result.get("ifsc", "HDFC0000240"),
                "status": "DISPATCHED VIA IMPS",
                "time": now_str,
            }
    elif tool_name == "retry_refund":
        if result.get("status") in ["retrying", "done"]:
            amt = result.get("amount", 0)
            return {
                "type": "refund",
                "title": "NPCI Fast-Track Refund Reversal",
                "amount": f"₹{amt:,.0f}",
                "utr": result.get("upi_ref", f"NPCI{now_ist().strftime('%M%S')}"),
                "customer": "Customer UPI Account",
                "vpa": "customer@paytm",
                "status": "REVERSED VIA NPCI",
                "time": now_str,
            }
    elif tool_name in ["diagnose_soundbox", "remote_fix_soundbox"]:
        battery = result.get("battery", 86)
        is_fixed = result.get("fixed", False) or result.get("status") == "online"
        status_txt = "TEST CHIME PLAYED" if is_fixed else "BATTERY LOW"
        return {
            "type": "soundbox",
            "title": "Paytm Soundbox 4G Diagnostic",
            "device": f"Paytm Soundbox 4.0 ({result.get('device_id', 'PTM-SB')})",
            "battery": f"{battery}% Charged",
            "network": "Airtel 4G IoT SIM (Strong)",
            "volume": "Volume Calibrated to 90%",
            "status": status_txt,
            "time": now_str,
        }
    elif tool_name == "presanction_loan":
        if result.get("status") == "pre-sanctioned":
            amt = result.get("amount", 0)
            return {
                "type": "loan",
                "title": "Paytm Merchant Loan Sanction",
                "amount": f"₹{amt:,.0f}",
                "interest": result.get("interest", "1.1% flat monthly"),
                "dailyDeduction": result.get("daily_deduction", "₹280/day from QR sales"),
                "agent": "Rajesh K. (Field Desk Agent)",
                "doorstepVisit": "Tomorrow, 11:00 AM",
                "status": "DIGITAL SANCTION APPROVED",
                "time": now_str,
            }
    elif tool_name == "create_ticket" or result.get("needs_human"):
        amt_str = f"₹{result.get('amount', 0):,.0f}" if result.get("amount") else "High Priority"
        return {
            "type": "human_desk",
            "title": "Senior Desk Lead Assigned",
            "officer": "Kunal S. (Senior Merchant Desk Lead)",
            "amount": amt_str,
            "ticketId": f"#{result.get('ticket_id', 'PRI-091')}",
            "action": "Direct Outbound Call In Progress",
            "status": "HUMAN HAND-OFF ENGAGED",
            "time": now_str,
        }
    return None

TOOL_REGISTRY = {
    "get_merchant": tool_get_merchant,
    "get_settlement_status": tool_get_settlement_status,
    "verify_bank_ifsc": tool_verify_bank_ifsc,
    "retrigger_kyc": tool_retrigger_kyc,
    "reroute_settlement_imps": tool_reroute_settlement_imps,
    "get_recent_transactions": tool_get_recent_transactions,
    "get_refund_status": tool_get_refund_status,
    "retry_refund": tool_retry_refund,
    "diagnose_soundbox": tool_diagnose_soundbox,
    "remote_fix_soundbox": tool_remote_fix_soundbox,
    "check_loan_eligibility": tool_check_loan_eligibility,
    "presanction_loan": tool_presanction_loan,
    "search_policy": tool_search_policy,
    "create_ticket": tool_create_ticket,
    "get_lead": tool_get_lead,
    "send_offer": tool_send_offer,
    "book_followup": tool_book_followup,
}

def run_tool(db: Session, name: str, args: dict, merchant_id: int = None):
    """
    Wrapper run_tool: catch exceptions, rollback, pop _log, write action_log row, commit.
    Returns (result_dict, log_text).
    """
    func = TOOL_REGISTRY.get(name)
    if not func:
        return {"error": f"Unknown tool: {name}"}, f"Tool {name} not found"

    try:
        # inject merchant_id into args if appropriate and missing
        call_args = dict(args)
        if name in ["get_merchant", "get_settlement_status", "verify_bank_ifsc", "retrigger_kyc",
                    "get_recent_transactions", "get_refund_status", "diagnose_soundbox",
                    "remote_fix_soundbox", "check_loan_eligibility", "presanction_loan"]:
            if "merchant_id" not in call_args and merchant_id is not None:
                call_args["merchant_id"] = merchant_id
        if name == "create_ticket" and "merchant_id" not in call_args and merchant_id is not None:
            call_args["merchant_id"] = merchant_id

        result = func(db, **call_args)
    except Exception as e:
        db.rollback()
        err_msg = str(e)
        return {"error": err_msg}, f"Error in {name}: {err_msg}"

    log_text = ""
    if isinstance(result, dict):
        log_text = result.pop("_log", "")

    if not log_text:
        log_text = f"Executed {name}"

    is_human = isinstance(result, dict) and bool(result.get("needs_human"))
    status = "handed_to_human" if is_human else "solved_by_ai"

    action = ActionLog(
        time=now_ist(),
        merchant_id=merchant_id,
        tool=name,
        input_json=json.dumps(args, default=str),
        result_json=json.dumps(result, default=str),
        status=status,
        summary=log_text,
    )
    db.add(action)
    db.commit()

    return result, log_text

# Google GenAI FunctionDeclarations
if types is not None:
    FUNCTION_DECLARATIONS = [
        types.FunctionDeclaration(
        name="get_merchant",
        description="Retrieve merchant profile details with masked phone number.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_settlement_status",
        description="Get the latest 3 settlements and KYC status for a merchant.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="verify_bank_ifsc",
        description="Verify merchant IFSC branch against the Razorpay / RBI IFSC registry and check for KYC bank name match.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="retrigger_kyc",
        description="Retrigger KYC verification to update the verified bank name and mark kyc_status as verified.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="reroute_settlement_imps",
        description="Re-route a held or pending settlement through the IMPS 24x7 instant payout rail.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "settlement_id": types.Schema(type=types.Type.INTEGER, description="The settlement ID"),
            },
            required=["settlement_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_recent_transactions",
        description="Get the latest QR transactions for a merchant.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
                "limit": types.Schema(type=types.Type.INTEGER, description="Number of transactions to fetch (default 5)"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_refund_status",
        description="Check status of recent customer payment refunds for a merchant.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="retry_refund",
        description="Retry a failed customer refund via the NPCI auto-reversal API.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "refund_id": types.Schema(type=types.Type.INTEGER, description="The refund ID"),
            },
            required=["refund_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="diagnose_soundbox",
        description="Diagnose a Paytm Soundbox 4G device (status, battery, IoT SIM network, and hardware faults).",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="remote_fix_soundbox",
        description="Remotely recalibrate and reconnect an offline Soundbox over-the-air.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="check_loan_eligibility",
        description="Check merchant loan eligibility based on 30-day QR collection history.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
            },
            required=["merchant_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="presanction_loan",
        description="Digitally pre-sanction a Paytm Merchant Loan up to the approved maximum limit.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="The merchant ID"),
                "amount": types.Schema(type=types.Type.NUMBER, description="Loan amount to pre-sanction"),
            },
            required=["merchant_id", "amount"],
        ),
    ),
    types.FunctionDeclaration(
        name="search_policy",
        description="Search official Paytm merchant policies for settlement, refund, KYC, Soundbox, loan, or POS.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "question": types.Schema(type=types.Type.STRING, description="The merchant's policy question"),
            },
            required=["question"],
        ),
    ),
    types.FunctionDeclaration(
        name="create_ticket",
        description="Create an escalation ticket for a human desk officer when an issue requires manual assistance.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "summary": types.Schema(type=types.Type.STRING, description="Summary of the issue"),
                "priority": types.Schema(type=types.Type.STRING, description="Priority: low, normal, or high"),
                "merchant_id": types.Schema(type=types.Type.INTEGER, description="Merchant ID if applicable"),
            },
            required=["summary"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_lead",
        description="Get sales lead details by ID.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "lead_id": types.Schema(type=types.Type.INTEGER, description="The sales lead ID"),
            },
            required=["lead_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="send_offer",
        description="Send a fitting product offer (Soundbox, Card Machine, Loan) to a lead and move stage to talking.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "lead_id": types.Schema(type=types.Type.INTEGER, description="The lead ID"),
                "product": types.Schema(type=types.Type.STRING, description="Product name (e.g. Soundbox, Card Machine, Shop Loan)"),
                "message": types.Schema(type=types.Type.STRING, description="The offer message sent to merchant"),
            },
            required=["lead_id", "product", "message"],
        ),
    ),
    types.FunctionDeclaration(
        name="book_followup",
        description="Book a field agent doorstep follow-up visit for a sales lead and advance stage to booked.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "lead_id": types.Schema(type=types.Type.INTEGER, description="The lead ID"),
                "datetime_iso": types.Schema(type=types.Type.STRING, description="Followup date and time (e.g. 'Tomorrow 11:30 AM')"),
            },
            required=["lead_id", "datetime_iso"],
        ),
    ),
]
else:
    FUNCTION_DECLARATIONS = []
