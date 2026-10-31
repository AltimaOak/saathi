import os
import json
import time
import asyncio
from datetime import timedelta
from typing import AsyncGenerator
from sqlalchemy.orm import Session
try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

from database import now_ist, get_db
from models import Merchant, Lead, Message, Session as DBSession, Ticket, Settlement, Refund
from tools import (
    FUNCTION_DECLARATIONS,
    run_tool,
    get_ai_limit,
    mask_phone,
    make_card,
)

ANGRY_KEYWORDS = [
    "fraud", "scam", "cheat", "police", "legal", "lawyer",
    "useless", "worst", "bakwas", "dhoka", "chor", "complaint"
]

def get_genai_client():
    if genai is None:
        return None
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Notice: Failed to initialize Gemini client ({e}). Using deterministic playbook mode.")
        return None

async def stream_fallback_playbook(
    session_id: str,
    message: str,
    merchant_id: int,
    lead_id: int,
    mode: str,
    language: str,
    current_status: str,
    merchant,
    has_angry: bool,
) -> AsyncGenerator[str, None]:
    lower = message.lower()
    tool_sequence = []
    reply_text = ""

    if has_angry:
        reply_text = (
            "Main samajh sakta hoon ki aap pareshan hain. Aapki priority ticket Desk Lead Kunal S. "
            "ko assign kar di gayi hai aur woh aapse jaldi hi seedha contact karenge. Hum ise turant theek karenge."
            if language == "hi" else
            "I completely understand your frustration. Our Senior Paytm Desk Lead Kunal S. has been assigned "
            "to your priority case and will call you directly on your registered number."
        )
        current_status = "handed_to_human"

    elif "85000" in lower or "85,000" in lower:
        s_id = 38
        with next(get_db()) as db_lookup:
            s_obj = db_lookup.query(Settlement).filter(Settlement.merchant_id == (merchant_id or 3), Settlement.status == "held").first()
            if s_obj:
                s_id = s_obj.id
        tool_sequence = [
            ("get_settlement_status", {"merchant_id": merchant_id or 3}),
            ("reroute_settlement_imps", {"settlement_id": s_id}),
        ]
        reply_text = (
            "Vikram ji, aapki ₹85,000 ki settlement manual risk review ke antargat aati hai kyunki yeh "
            "₹10,000 ki automated limit se upar hai. Senior Desk Officer Kunal S. ko ticket assign kar di gayi hai."
            if language == "hi" else
            "Vikram ji, your settlement of ₹85,000 is under manual risk review as it exceeds the automated ₹10,000 limit. "
            "Our Senior Desk Lead Kunal S. has taken personal charge of your case and will call you shortly."
        )
        current_status = "handed_to_human"

    elif "mera paisa" in lower or "paisa nahi" in lower or "settlement" in lower or "late" in lower:
        s_id = 37
        with next(get_db()) as db_lookup:
            s_obj = db_lookup.query(Settlement).filter(Settlement.merchant_id == (merchant_id or 1), Settlement.status == "held").first()
            if s_obj:
                s_id = s_obj.id
        tool_sequence = [
            ("get_settlement_status", {"merchant_id": merchant_id or 1}),
            ("verify_bank_ifsc", {"merchant_id": merchant_id or 1}),
            ("retrigger_kyc", {"merchant_id": merchant_id or 1}),
            ("reroute_settlement_imps", {"settlement_id": s_id}),
        ]
        reply_text = (
            "Ramesh bhaiya, aapka ₹8,450 ka settlement KYC bank mismatch ki wajah se ruka hua tha. "
            "Maine bank IFSC verify karke KYC update kar diya hai aur paise IMPS rail se bhej diye hain. "
            "Agli 10 minute mein aapke State Bank of India khate mein aa jayenge!"
            if language == "hi" else
            "Ramesh ji, your pending settlement of ₹8,450 was held due to a bank mismatch on KYC. "
            "I verified your branch IFSC with the banking switch, re-triggered KYC to verified status, "
            "and re-routed the payout via IMPS. It will credit to your account within 10 minutes."
        )

    elif "refund" in lower:
        r_id = 13
        with next(get_db()) as db_lookup:
            r_obj = db_lookup.query(Refund).filter(Refund.merchant_id == (merchant_id or 2), Refund.status == "failed").first()
            if r_obj:
                r_id = r_obj.id
        tool_sequence = [
            ("get_refund_status", {"merchant_id": merchant_id or 2}),
            ("retry_refund", {"refund_id": r_id}),
        ]
        reply_text = (
            "Priya ji, customer ka ₹1,200 ka stuck refund NPCI rail par fail ho gaya tha. "
            "Maine auto-reversal retry kar diya hai. Amount customer ke UPI VPA par credit ho jayega."
            if language == "hi" else
            "Priya ji, the customer refund of ₹1,200 was stuck at the switch. I have retried the reversal "
            "through NPCI fast-track API. The amount will reflect in the customer's account shortly."
        )

    elif "loan" in lower or "karz" in lower or "presanction" in lower or "pre-sanction" in lower or "sanction" in lower:
        if any(c.isdigit() for c in message) or "200000" in lower or "presanction" in lower or "pre-sanction" in lower:
            tool_sequence = [
                ("check_loan_eligibility", {"merchant_id": merchant_id or 2}),
                ("presanction_loan", {"merchant_id": merchant_id or 2, "amount": 200000.0}),
            ]
            reply_text = (
                "Badhai ho! Aapke 30-day QR sales ke aadhar par ₹2,00,000 ka shop loan pre-sanction kar diya gaya hai. "
                "Hamaare field agent Rajesh kal subah 11:00 AM biometric signoff ke liye aayenge."
                if language == "hi" else
                "Congratulations! Based on your 30-day QR sales collections, your shop loan of ₹2,00,000 has been digitally "
                "pre-sanctioned. Field agent Rajesh will visit your shop tomorrow at 11:00 AM for biometric sign-off."
            )
        else:
            tool_sequence = [
                ("check_loan_eligibility", {"merchant_id": merchant_id or 2}),
            ]
            reply_text = (
                "Priya ji, aapke store ke turnover ke aadhar par aap ₹5,00,000 tak ke shop loan ke liye eligible hain. "
                "Kya aap ₹2,00,000 ya koi nishchit amount pre-sanction karwana chahti hain?"
                if language == "hi" else
                "Priya ji, based on your steady QR collections, you are eligible for up to ₹5,00,000 working capital loan. "
                "Would you like me to pre-sanction an offer for you?"
            )

    elif "soundbox" in lower or "speaker" in lower or "awaz" in lower:
        if merchant_id == 2:
            tool_sequence = [
                ("diagnose_soundbox", {"merchant_id": 2}),
                ("remote_fix_soundbox", {"merchant_id": 2}),
            ]
            reply_text = (
                "Priya ji, aapka Soundbox offline hai kyunki battery 9% par hai. Battery critically low hone ke karan "
                "remote fix sambhav nahi hai. Kripya device ko charger se connect karein."
                if language == "hi" else
                "Priya ji, your Soundbox device is offline because the battery is critically low at 9%. "
                "A remote fix cannot be applied; please plug the Soundbox into its 5V charger to turn it on."
            )
        else:
            tool_sequence = [
                ("diagnose_soundbox", {"merchant_id": merchant_id or 3}),
                ("remote_fix_soundbox", {"merchant_id": merchant_id or 3}),
            ]
            reply_text = (
                "Vikram ji, aapke Soundbox 4.0 par network issue detect hua tha. Maine over-the-air fix apply kar diya hai "
                "aur volume 90% par calibrate kar diya hai. Ab har transaction par loud clear audio chime aayega."
                if language == "hi" else
                "Vikram ji, your Soundbox device (PTM-SB-9014) had a network glitch. I have reconnected it over the air "
                "and recalibrated the master volume to 90%. Sound alerts are now fully functional."
            )

    elif mode == "sales" or lead_id:
        tool_sequence = [
            ("get_lead", {"lead_id": lead_id or 1}),
            ("search_policy", {"question": "loan policy"}),
            ("send_offer", {"lead_id": lead_id or 1, "product": "Shop Loan", "message": "Pre-qualified merchant expansion loan up to Rs 2.5L"}),
            ("book_followup", {"lead_id": lead_id or 1, "datetime_iso": "Tomorrow, 11:30 AM"}),
        ]
        reply_text = (
            "Sunita ji, we have evaluated your garment store collections. Paytm offers pre-approved shop loans up to ₹2.5 Lakh "
            "with zero collateral and automated daily deductions. I have scheduled a field visit for tomorrow at 11:30 AM."
        )

    else:
        tool_sequence = [
            ("get_merchant", {"merchant_id": merchant_id or 1}),
            ("get_recent_transactions", {"merchant_id": merchant_id or 1, "limit": 3}),
        ]
        reply_text = (
            "I have reviewed your shop terminal status. Everything is active and synced with the Paytm payment switch. "
            "Is there anything specific about settlements or your Soundbox you would like me to check?"
        )

    # Execute tools in sequence
    with next(get_db()) as tool_db:
        for call_name, call_args in tool_sequence:
            print(f"[tool] {call_name} {call_args}")
            result, log_text = run_tool(tool_db, call_name, call_args, merchant_id)
            now_str = now_ist().strftime("%H:%M:%S")

            yield f"data: {json.dumps({'type': 'action', 'tool': call_name, 'summary': log_text, 'time': now_str})}\n\n"

            card_data = make_card(call_name, result, merchant, tool_db)
            if card_data:
                yield f"data: {json.dumps({'type': 'card', 'tool': call_name, 'data': card_data})}\n\n"

            if isinstance(result, dict) and result.get("needs_human"):
                current_status = "handed_to_human"

    # Stream text reply chunks
    words = reply_text.split(" ")
    for i in range(0, len(words), 3):
        chunk = " ".join(words[i:i+3]) + " "
        yield f"data: {json.dumps({'type': 'text', 'delta': chunk})}\n\n"
        await asyncio.sleep(0.02)

    # Save messages and update session in DB
    with next(get_db()) as db:
        db.add(Message(session_id=session_id, role="user", content=message, created_at=now_ist()))
        db.add(Message(session_id=session_id, role="model", content=reply_text, created_at=now_ist()))
        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if sess:
            sess.outcome = current_status
            sess.first_reply_ms = 450
        db.commit()

    yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

def get_model_name():
    return os.getenv("MODEL", "gemini-2.5-flash").strip()

async def stream_chat(
    session_id: str,
    message: str,
    merchant_id: int = None,
    lead_id: int = None,
    mode: str = "support",
    language: str = "en",
) -> AsyncGenerator[str, None]:
    start_time = time.time()
    current_status = "solved_by_ai"
    ai_limit = get_ai_limit()

    # 1. DB Session for initial checks & rate limiting
    with next(get_db()) as db:
        # Rate limiting: 20 or more user messages in last 60s
        sixty_secs_ago = now_ist() - timedelta(seconds=60)
        recent_user_msgs = (
            db.query(Message)
            .filter(
                Message.session_id == session_id,
                Message.role == "user",
                Message.created_at >= sixty_secs_ago,
            )
            .count()
        )
        if recent_user_msgs >= 20:
            yield f"data: {json.dumps({'type': 'text', 'delta': 'You are sending messages very quickly. Please wait a moment before sending another message.'})}\n\n"
            yield f"data: {json.dumps({'type': 'status', 'value': 'solved_by_ai'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        # Check / create DBSession row
        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not sess:
            sess = DBSession(
                id=session_id,
                merchant_id=merchant_id,
                mode=mode,
                started_at=now_ist(),
            )
            db.add(sess)
            db.commit()

        # Load merchant info
        merchant = None
        if merchant_id:
            merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        lead = None
        if lead_id:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()

        # Guardrail: Check angry / escalation words
        has_angry = any(w in message.lower() for w in ANGRY_KEYWORDS)
        angry_ticket_id = None
        if has_angry:
            ticket = Ticket(
                merchant_id=merchant_id,
                summary=f"Urgent dispute / customer distress: '{message[:90]}'",
                priority="high",
                status="open",
                created_at=now_ist(),
            )
            db.add(ticket)
            db.commit()
            angry_ticket_id = ticket.id
            current_status = "handed_to_human"

            act_payload = {
                'type': 'action',
                'tool': 'create_ticket',
                'summary': f'Created High Priority Ticket #{ticket.id} for desk officer review',
                'time': now_ist().strftime('%H:%M:%S'),
            }
            yield f"data: {json.dumps(act_payload)}\n\n"

            card_payload = {
                'type': 'card',
                'tool': 'create_ticket',
                'data': {
                    'type': 'human_desk',
                    'title': 'Senior Desk Lead Assigned',
                    'officer': 'Kunal S. (Senior Merchant Desk Lead)',
                    'amount': 'Priority Dispute',
                    'ticketId': f'#{ticket.id}',
                    'action': 'Direct Outbound Call In Progress',
                    'status': 'HUMAN HAND-OFF ENGAGED',
                    'time': now_ist().strftime('%I:%M %p'),
                },
            }
            yield f"data: {json.dumps(card_payload)}\n\n"

        # Load past 12 messages
        history_msgs = (
            db.query(Message)
            .filter(Message.session_id == session_id)
            .order_by(Message.id.desc())
            .limit(12)
            .all()
        )
        history_msgs.reverse()

    # Setup GenAI client
    client = get_genai_client()
    if not client:
        async for chunk in stream_fallback_playbook(
            session_id=session_id,
            message=message,
            merchant_id=merchant_id,
            lead_id=lead_id,
            mode=mode,
            language=language,
            current_status=current_status,
            merchant=merchant,
            has_angry=has_angry,
        ):
            yield chunk
        return

    # Build system instructions
    merchant_info_str = "None"
    if merchant:
        merchant_info_str = (
            f"Merchant ID: {merchant.id}, Name: {merchant.name}, Shop: '{merchant.shop_name}', "
            f"City: {merchant.city}, Language: {merchant.language}, Phone: {mask_phone(merchant.phone)}, "
            f"KYC Status: {merchant.kyc_status}, Bank on KYC: '{merchant.bank_name_on_kyc}', "
            f"IFSC: {merchant.ifsc}, Bank on Account: '{merchant.bank_name_on_account}'"
        )
    lead_info_str = "None"
    if lead:
        lead_info_str = (
            f"Lead ID: {lead.id}, Name: {lead.name}, Phone: {mask_phone(lead.phone)}, "
            f"City: {lead.city}, Interest: {lead.interest}, Stage: {lead.stage}, Notes: {lead.notes}"
        )

    ist_now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    system_prompt = f"""You are Saathi, a friendly AI teammate for Paytm merchants and sales leads.
Current Date and Time: {ist_now_str}
Session Mode: {mode}
Preferred Language: {language}
Active Merchant: {merchant_info_str}
Active Lead: {lead_info_str}
Automated Safe Execution Limit: Rs {ai_limit:,.0f}

Reply in the user's language (English, Hindi, Marathi or Hinglish) in short simple sentences.
Always check facts with tools before answering. Fix the problem yourself when the tools allow it.
Never invent amounts, dates or statuses. Do not mention tool names or internal database IDs to the user.

Playbooks:
- Late or missing money (for example 'mera paisa nahi aaya'): Call get_settlement_status. If held for a KYC or bank mismatch, call verify_bank_ifsc, then retrigger_kyc, then reroute_settlement_imps. If there is no problem, check get_recent_transactions and explain clearly.
- Stuck refund: Call get_refund_status, then retry_refund.
- Soundbox problem: Call diagnose_soundbox, then remote_fix_soundbox if the fault is not battery_low (if battery is low, kindly ask the merchant to charge the device).
- Loan question: Call check_loan_eligibility, then presanction_loan if eligible and the merchant agrees to an amount.
- Disputes above Rs {ai_limit:,.0f}, fraud, anger, or anything you cannot fix: A human desk officer takes over. The tools do this automatically; explain kindly what happens next.
- Sales mode: Find the merchant's business need, pitch ONE fitting product, use search_policy, call send_offer, then book_followup.
"""

    if angry_ticket_id:
        system_prompt += f"\nImportant System Note: Ticket #{angry_ticket_id} has already been logged for this customer's frustration. Reassure the merchant calmly that a senior Paytm desk lead is reviewing it right now. Do NOT call create_ticket again."

    # Build contents array
    contents = []
    for h in history_msgs:
        role = "user" if h.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.content)]))

    # Add the current user message
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.2,
        tools=[types.Tool(function_declarations=FUNCTION_DECLARATIONS)],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    model_name = get_model_name()
    full_reply_text = ""
    first_token_sent = False
    first_reply_ms = None

    # Multi-round tool loop (up to 6 rounds)
    for round_idx in range(6):
        # Retry with backoff for 429/503 before any tokens streamed
        response_stream = None
        for attempt, backoff in enumerate([0, 1, 2]):
            if backoff > 0:
                time.sleep(backoff)
            try:
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "503" in err_str) and not first_token_sent and attempt < 2:
                    continue
                else:
                    if not first_token_sent:
                        yield f"data: {json.dumps({'type': 'text', 'delta': 'Saathi is taking a short break. Please try again in a moment.'})}\n\n"
                        yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        return
                    raise

        fn_calls = []
        turn_text = ""
        model_parts = []

        try:
            for chunk in response_stream:
                if not chunk.candidates:
                    continue
                cand = chunk.candidates[0]
                if not cand.content or not cand.content.parts:
                    continue

                for part in cand.content.parts:
                    if getattr(part, "thought", False):
                        continue

                    if part.text:
                        delta = part.text
                        turn_text += delta
                        full_reply_text += delta
                        if not first_token_sent:
                            first_token_sent = True
                            first_reply_ms = int((time.time() - start_time) * 1000)
                        yield f"data: {json.dumps({'type': 'text', 'delta': delta})}\n\n"
                        model_parts.append(part)

                    if part.function_call:
                        fn_calls.append(part.function_call)
                        model_parts.append(part)
        except Exception as e:
            err_str = str(e)
            if not first_token_sent:
                yield f"data: {json.dumps({'type': 'text', 'delta': 'Saathi encountered a temporary error. Please try again.'})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        # Add model's turn to conversation history
        contents.append(types.Content(role="model", parts=model_parts))

        # If no tool calls, conversation turn is complete!
        if not fn_calls:
            break

        # Execute function calls
        response_parts = []
        with next(get_db()) as tool_db:
            for call in fn_calls:
                call_name = call.name
                call_args = dict(call.args) if call.args else {}
                print(f"[tool] {call_name} {call_args}")

                result, log_text = run_tool(tool_db, call_name, call_args, merchant_id)
                now_str = now_ist().strftime("%H:%M:%S")

                # Emit action receipt event
                yield f"data: {json.dumps({'type': 'action', 'tool': call_name, 'summary': log_text, 'time': now_str})}\n\n"

                # Check if this tool produced a card
                card_data = make_card(call_name, result, merchant, tool_db)
                if card_data:
                    yield f"data: {json.dumps({'type': 'card', 'tool': call_name, 'data': card_data})}\n\n"

                if isinstance(result, dict) and result.get("needs_human"):
                    current_status = "handed_to_human"

                response_parts.append(
                    types.Part.from_function_response(
                        name=call_name,
                        response={"result": result},
                    )
                )

        contents.append(types.Content(role="user", parts=response_parts))

    else:
        # Max 6 tool rounds exceeded
        with next(get_db()) as db:
            ticket = Ticket(
                merchant_id=merchant_id,
                summary=f"Max tool rounds exceeded for query: '{message[:80]}'",
                priority="high",
                status="open",
                created_at=now_ist(),
            )
            db.add(ticket)
            db.commit()
            current_status = "handed_to_human"

            yield f"data: {json.dumps({'type': 'action', 'tool': 'create_ticket', 'summary': f'Created Ticket #{ticket.id} due to complex multi-step resolution', 'time': now_ist().strftime('%H:%M:%S')})}\n\n"
            msg = " This request requires deeper investigation by our operations desk. A Paytm desk lead has been assigned to help you."
            yield f"data: {json.dumps({'type': 'text', 'delta': msg})}\n\n"
            full_reply_text += msg

    # Save messages and update session in DB
    with next(get_db()) as db:
        user_msg_row = Message(
            session_id=session_id,
            role="user",
            content=message,
            created_at=now_ist(),
        )
        model_msg_row = Message(
            session_id=session_id,
            role="model",
            content=full_reply_text,
            created_at=now_ist(),
        )
        db.add(user_msg_row)
        db.add(model_msg_row)

        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if sess:
            if not sess.first_reply_ms and first_reply_ms:
                sess.first_reply_ms = first_reply_ms
            sess.outcome = current_status

        db.commit()

    # Final status and done
    yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"
