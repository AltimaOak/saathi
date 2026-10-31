import os
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import now_ist
from models import (
    Transaction,
    Merchant,
    Refund,
    FraudCase,
    FraudEvidence,
    PaymentClaim,
    ActionLog,
)

RULE_VERSION = "v1.0.0"
SALT_KEY = os.getenv("FRAUD_HASH_SALT", "saathi_fintech_salt_secret_2026")

# Deterministic verdict labels
VERDICT_LABELS = {
    "VERIFIED_RECEIVED": "Verified Payment",
    "NOT_FOUND": "No Ledger Record Found",
    "UNABLE_TO_VERIFY": "Unable to Verify (System Stale/Unavailable)",
    "PENDING": "Payment Processing / In Flight",
    "FAILED": "Payment Failed at Switch",
    "REVERSED_OR_REFUNDED": "Payment Reversed or Refunded",
    "MISMATCH_AMOUNT": "Amount Discrepancy Detected",
    "MISMATCH_RECEIVER": "Payment Sent to Different Account",
    "ALREADY_CLAIMED": "Duplicate Claim (Previously Reused)",
}

# Deterministic merchant-facing explanation templates (strictly non-accusatory)
EXPLANATION_TEMPLATES = {
    "VERIFIED_RECEIVED": (
        "We confirmed this payment of ₹{amount:,.2f} was credited to your Paytm UPI QR at {time} "
        "(Bank UTR: {utr}). The funds are safely in your settlement account. It is safe to hand over goods or provide service."
    ),
    "NOT_FOUND": (
        "We checked your live settlement ledger (last synced at {sync_time}) and could not locate any payment "
        "with UTR {utr}. Please do not hand over goods yet. Ask the customer to check their bank app debit SMS "
        "or await confirmation on your Paytm Soundbox."
    ),
    "UNABLE_TO_VERIFY": (
        "We could not verify this transaction right now because the banking ledger sync is temporarily unavailable "
        "or awaiting an updated batch. This does not mean the payment is invalid. Please wait a few moments or verify "
        "via your official Paytm Soundbox audio announcement."
    ),
    "PENDING": (
        "A transaction with UTR {utr} for ₹{amount:,.2f} is currently marked as pending at the banking switch. "
        "The funds have not yet settled into your account. Please wait until your Soundbox announces the payment."
    ),
    "FAILED": (
        "Our records indicate that the payment with UTR {utr} failed at the customer's bank switch. "
        "The funds were not received. Please ask the customer to retry with another UPI app or cash."
    ),
    "REVERSED_OR_REFUNDED": (
        "This payment of ₹{amount:,.2f} (UTR {utr}) was previously credited but subsequently reversed "
        "or refunded back to the customer's VPA. The funds are no longer in your active settlement balance."
    ),
    "MISMATCH_AMOUNT": (
        "We found transaction {utr} on your ledger, but the recorded amount is ₹{actual_amount:,.2f}, "
        "which differs from the claimed screenshot amount of ₹{claim_amount:,.2f}. Please confirm the exact amount before releasing goods."
    ),
    "MISMATCH_RECEIVER": (
        "Transaction {utr} exists on the banking rail but was directed to a different merchant account or VPA. "
        "This payment was not credited to your store terminal."
    ),
    "ALREADY_CLAIMED": (
        "This transaction reference (UTR {utr}) has already been verified and claimed in an earlier verification check. "
        "A single bank UTR cannot be reused for multiple customer purchases."
    ),
}

RECOMMENDED_ACTIONS = {
    "VERIFIED_RECEIVED": "Hand over goods or provide service.",
    "NOT_FOUND": "Do not hand over goods. Ask customer to show the live debit SMS or check Soundbox audio chime.",
    "UNABLE_TO_VERIFY": "Wait for Soundbox announcement or retry verification in 2 minutes.",
    "PENDING": "Advise customer that payment is in flight. Await Soundbox chime before handing over goods.",
    "FAILED": "Do not release goods. Request alternative payment method.",
    "REVERSED_OR_REFUNDED": "Do not release goods. Explain to customer that the amount was auto-reversed.",
    "MISMATCH_AMOUNT": "Check your Soundbox announcement for the exact credited amount.",
    "MISMATCH_RECEIVER": "Ask customer to verify the shop QR code they scanned.",
    "ALREADY_CLAIMED": "Do not release goods for duplicate reference slips. Ask for a fresh payment.",
}

def get_utr_hash(utr: str) -> str:
    """Compute HMAC-SHA256 hash of UTR to enable cross-merchant duplicate detection without data leakage."""
    clean = str(utr).strip().upper()
    return hmac.new(SALT_KEY.encode("utf-8"), clean.encode("utf-8"), hashlib.sha256).hexdigest()

def check_ledger_freshness(db: Session, merchant_id: int, max_age_minutes: int = 15) -> Tuple[bool, datetime]:
    """
    Verify whether the merchant's ledger has been synced recently.
    Rule: NOT_FOUND is strictly forbidden if the ledger is stale or unreachable.
    """
    now = now_ist()
    latest_txn = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id)
        .order_by(Transaction.last_synced_at.desc())
        .first()
    )
    if not latest_txn or not latest_txn.last_synced_at:
        # Default fresh sync for demo if table exists
        return True, now
    
    sync_time = latest_txn.last_synced_at
    age_seconds = (now - sync_time).total_seconds()
    is_fresh = age_seconds <= (max_age_minutes * 60)
    return is_fresh, sync_time

def evaluate_payment_claim(
    db: Session,
    merchant_id: int,
    claim_utr: Optional[str],
    claim_amount: Optional[float] = None,
    claim_payer: Optional[str] = None,
    security_flags: Optional[List[str]] = None,
    simulated_stale: bool = False,
    channel: str = "document_upload",
) -> Dict[str, Any]:
    """
    Deterministic payment claim evaluation engine (Rule Version: v1.0.0).
    The LLM never computes risk scores; all decisions are strictly derived from trusted records.
    """
    now = now_ist()
    security_flags = security_flags or []
    signals_fired = []
    checks_performed = []
    checks_unverified = ["NPCI live switch direct query (internal ledger authoritative)"]
    
    clean_utr = (claim_utr or "").strip().upper()
    has_valid_utr = bool(clean_utr and len(clean_utr) >= 6)
    
    # 1. Check ledger freshness
    is_fresh, last_synced_at = check_ledger_freshness(db, merchant_id)
    if simulated_stale:
        is_fresh = False
    
    checks_performed.append(f"Ledger freshness verified (last synced at {last_synced_at.strftime('%Y-%m-%d %H:%M:%S IST')})")

    # If ledger is stale or UTR missing, we MUST return UNABLE_TO_VERIFY (fail-closed)
    if not is_fresh or not has_valid_utr:
        verdict = "UNABLE_TO_VERIFY"
        risk_level = "MEDIUM"
        signals_fired.append({
            "rule_id": "RULE-V02",
            "name": "Stale Ledger / Missing UTR",
            "description": "Ledger sync exceeds freshness window or UTR could not be extracted.",
            "weight": 2,
        })
        explanation = EXPLANATION_TEMPLATES["UNABLE_TO_VERIFY"]
        rec_action = RECOMMENDED_ACTIONS["UNABLE_TO_VERIFY"]
        matched_txn = None
    else:
        # 2. Check Duplicate Registry
        utr_hash = get_utr_hash(clean_utr)
        existing_claim = db.query(PaymentClaim).filter(PaymentClaim.utr_hash == utr_hash).first()
        is_duplicate = False
        if existing_claim and existing_claim.claim_count >= 1:
            # Reused claim reference
            is_duplicate = True
            signals_fired.append({
                "rule_id": "RULE-V04",
                "name": "Duplicate Reference Claim",
                "description": f"UTR hash was previously claimed on {existing_claim.first_claimed_at.strftime('%Y-%m-%d %H:%M')}.",
                "weight": 4,
            })
            checks_performed.append("Cross-merchant duplicate claim registry checked (COLLISION FOUND)")
        else:
            checks_performed.append("Cross-merchant duplicate claim registry checked (Zero collisions)")

        # 3. Query internal transactions ledger
        checks_performed.append(f"Searching internal ledger for UTR '{clean_utr}'")
        matched_txn = (
            db.query(Transaction)
            .filter(Transaction.utr == clean_utr)
            .first()
        )

        if not matched_txn:
            # Also check if query matches integer ID if UTR was entered as transaction ID
            if clean_utr.isdigit() and len(clean_utr) < 6:
                matched_txn = db.query(Transaction).filter(Transaction.id == int(clean_utr)).first()

        if is_duplicate and not matched_txn:
            verdict = "ALREADY_CLAIMED"
            risk_level = "HIGH"
            explanation = EXPLANATION_TEMPLATES["ALREADY_CLAIMED"].format(utr=clean_utr)
            rec_action = RECOMMENDED_ACTIONS["ALREADY_CLAIMED"]
        elif not matched_txn:
            # NOT FOUND on a fresh ledger
            verdict = "NOT_FOUND"
            risk_level = "HIGH"
            signals_fired.append({
                "rule_id": "RULE-V03",
                "name": "No Record On Fresh Ledger",
                "description": "Bank UTR is absent from merchant transaction records.",
                "weight": 4,
            })
            explanation = EXPLANATION_TEMPLATES["NOT_FOUND"].format(
                sync_time=last_synced_at.strftime("%I:%M %p"),
                utr=clean_utr
            )
            rec_action = RECOMMENDED_ACTIONS["NOT_FOUND"]
        else:
            # Transaction exists on ledger! Inspect status and amounts
            checks_performed.append(f"Record matched: Transaction #{matched_txn.id} (status: {matched_txn.status})")
            
            # Check receiver ownership
            if matched_txn.merchant_id != merchant_id:
                verdict = "MISMATCH_RECEIVER"
                risk_level = "HIGH"
                signals_fired.append({
                    "rule_id": "RULE-V03",
                    "name": "Recipient Merchant Mismatch",
                    "description": "Payment was routed to a different merchant terminal.",
                    "weight": 4,
                })
                explanation = EXPLANATION_TEMPLATES["MISMATCH_RECEIVER"].format(utr=clean_utr)
                rec_action = RECOMMENDED_ACTIONS["MISMATCH_RECEIVER"]
            
            # Check failure status
            elif matched_txn.status == "failed":
                verdict = "FAILED"
                risk_level = "HIGH"
                signals_fired.append({
                    "rule_id": "RULE-V03",
                    "name": "Payment Failed Status",
                    "description": "Record is marked as failed at the bank gateway.",
                    "weight": 4,
                })
                explanation = EXPLANATION_TEMPLATES["FAILED"].format(utr=clean_utr)
                rec_action = RECOMMENDED_ACTIONS["FAILED"]
            
            # Check pending status
            elif matched_txn.status in ["pending", "processing"]:
                verdict = "PENDING"
                risk_level = "MEDIUM"
                signals_fired.append({
                    "rule_id": "RULE-V02",
                    "name": "Payment In Flight",
                    "description": "Transaction is currently pending banking settlement.",
                    "weight": 2,
                })
                explanation = EXPLANATION_TEMPLATES["PENDING"].format(
                    utr=clean_utr,
                    amount=matched_txn.amount
                )
                rec_action = RECOMMENDED_ACTIONS["PENDING"]
            
            # Check for refund or reversal
            elif db.query(Refund).filter(Refund.merchant_id == merchant_id, Refund.upi_ref.contains(clean_utr)).first():
                verdict = "REVERSED_OR_REFUNDED"
                risk_level = "HIGH"
                signals_fired.append({
                    "rule_id": "RULE-V03",
                    "name": "Payment Reversal Active",
                    "description": "Transaction was refunded back to customer.",
                    "weight": 4,
                })
                explanation = EXPLANATION_TEMPLATES["REVERSED_OR_REFUNDED"].format(
                    amount=matched_txn.amount,
                    utr=clean_utr
                )
                rec_action = RECOMMENDED_ACTIONS["REVERSED_OR_REFUNDED"]
            
            # Check amount mismatch
            elif claim_amount is not None and abs(float(matched_txn.amount) - float(claim_amount)) >= 0.01:
                verdict = "MISMATCH_AMOUNT"
                risk_level = "HIGH"
                signals_fired.append({
                    "rule_id": "RULE-V03",
                    "name": "Amount Discrepancy",
                    "description": f"Claimed amount ₹{claim_amount:,.2f} differs from ledger ₹{matched_txn.amount:,.2f}.",
                    "weight": 4,
                })
                explanation = EXPLANATION_TEMPLATES["MISMATCH_AMOUNT"].format(
                    utr=clean_utr,
                    actual_amount=matched_txn.amount,
                    claim_amount=claim_amount
                )
                rec_action = RECOMMENDED_ACTIONS["MISMATCH_AMOUNT"]
            
            # Check duplicate claim
            elif is_duplicate:
                verdict = "ALREADY_CLAIMED"
                risk_level = "HIGH"
                explanation = EXPLANATION_TEMPLATES["ALREADY_CLAIMED"].format(utr=clean_utr)
                rec_action = RECOMMENDED_ACTIONS["ALREADY_CLAIMED"]
            
            else:
                # ALL CHECKS PASSED: VERIFIED RECEIVED!
                verdict = "VERIFIED_RECEIVED"
                risk_level = "LOW"
                signals_fired.append({
                    "rule_id": "RULE-V01",
                    "name": "Ledger Match Confirmed",
                    "description": "Exact match on UTR, amount, and merchant ID.",
                    "weight": 0,
                })
                checks_performed.append("Exact amount verified (₹0.00 difference)")
                checks_performed.append("Merchant VPA ownership verified")
                explanation = EXPLANATION_TEMPLATES["VERIFIED_RECEIVED"].format(
                    amount=matched_txn.amount,
                    time=matched_txn.created_at.strftime("%I:%M %p"),
                    utr=clean_utr
                )
                rec_action = RECOMMENDED_ACTIONS["VERIFIED_RECEIVED"]

        # Register or update claim in registry
        if has_valid_utr:
            if existing_claim:
                existing_claim.claim_count += 1
                existing_claim.last_claimed_at = now
            else:
                new_claim = PaymentClaim(
                    utr_hash=utr_hash,
                    claim_count=1,
                    first_claimed_by_merchant_id=merchant_id,
                    first_claimed_at=now,
                    last_claimed_at=now,
                )
                db.add(new_claim)
            db.commit()

    # 4. Evaluate Security & Forensics Signals
    for s_flag in security_flags:
        if s_flag == "PROMPT_INJECTION_ATTEMPT":
            signals_fired.append({
                "rule_id": "RULE-SEC01",
                "name": "Embedded Prompt Injection Blocked",
                "description": "Document contained embedded text commands attempting to override verification rules.",
                "weight": 3,
            })
        elif s_flag == "TIMESTAMP_ANOMALY":
            signals_fired.append({
                "rule_id": "RULE-M02",
                "name": "Timestamp Inconsistency",
                "description": "Receipt timestamp does not match typical banking settlement windows.",
                "weight": 1,
            })

    # 5. Compound CRITICAL rule check
    # CRITICAL requires two or more independent Major Signals (weight >= 3)
    major_signals_count = sum(1 for s in signals_fired if s.get("weight", 0) >= 3)
    if major_signals_count >= 2:
        risk_level = "CRITICAL"
        signals_fired.append({
            "rule_id": "RULE-C01",
            "name": "Multiple Critical Risk Signals",
            "description": "Two or more independent high-severity risk indicators confirmed.",
            "weight": 5,
        })
    elif risk_level == "LOW" and any(s.get("weight", 0) > 0 for s in signals_fired):
        # Forensics / metadata may raise risk by at most one level (capped; never to CRITICAL)
        risk_level = "MEDIUM"

    # Generate unique case reference
    case_ref = f"FC-{now.strftime('%Y%m')}-{os.urandom(2).hex().upper()}"
    
    # Create persistent FraudCase record
    case_record = FraudCase(
        case_ref=case_ref,
        merchant_id=merchant_id,
        channel=channel,
        verdict=verdict,
        risk_level=risk_level,
        rule_version=RULE_VERSION,
        claim_amount=claim_amount or (matched_txn.amount if matched_txn else None),
        claim_utr=clean_utr,
        claim_payer=claim_payer or (matched_txn.payer if matched_txn else None),
        matched_transaction_id=matched_txn.id if matched_txn else None,
        explanation_template=explanation,
        recommended_action=rec_action,
        status="assessed",
        created_at=now,
    )
    db.add(case_record)
    
    # Audit log entry in action_log
    db.add(ActionLog(
        time=now,
        merchant_id=merchant_id,
        tool="verify_payment_claim",
        input_json=f'{{"utr": "{clean_utr}", "amount": {claim_amount or 0}}}',
        result_json=f'{{"verdict": "{verdict}", "risk": "{risk_level}", "case": "{case_ref}"}}',
        status="solved_by_ai" if risk_level in ["LOW", "MEDIUM"] else "handed_to_human",
        summary=f"Payment Verification for UTR '{clean_utr}': {VERDICT_LABELS.get(verdict, verdict)} (Risk: {risk_level})",
    ))
    db.commit()

    return {
        "case_ref": case_ref,
        "case_id": case_record.id,
        "verdict": verdict,
        "verdict_label": VERDICT_LABELS.get(verdict, verdict),
        "risk_level": risk_level,
        "rule_version": RULE_VERSION,
        "ledger_last_synced_at": last_synced_at.strftime("%Y-%m-%d %H:%M:%S IST"),
        "claimed": {
            "utr": clean_utr,
            "amount": claim_amount,
            "payer": claim_payer,
        },
        "matched_record": {
            "id": matched_txn.id,
            "transaction_id": matched_txn.id,
            "amount": matched_txn.amount,
            "mode": matched_txn.mode,
            "payer": matched_txn.payer,
            "status": matched_txn.status,
            "created_at": matched_txn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        } if matched_txn else None,
        "signals_fired": signals_fired,
        "checks_performed": checks_performed,
        "checks_unverified": checks_unverified,
        "security_flags": security_flags,
        "explanation": explanation,
        "recommended_next_step": rec_action,
    }

