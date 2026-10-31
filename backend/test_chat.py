import os
import sys
import json
import uuid
import asyncio
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pathlib import Path
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

print("=== Environment Check ===")
for var in ["DATABASE_URL", "GEMINI_API_KEY", "MODEL", "AI_LIMIT", "ALLOWED_ORIGINS"]:
    val = os.getenv(var)
    status = "SET" if (val and val.strip()) else "NOT SET"
    print(f"  {var}: {status}")
print("=========================\n")

from database import engine, SessionLocal, Base, now_ist
from models import ActionLog, Ticket, Session as DBSession
from seed import seed
from agent import stream_chat

async def run_scenario(title, session_id, message, merchant_id=None, lead_id=None, mode="support", language="en"):
    print(f"\n--- Scenario: {title} ---")
    print(f"User (Merchant {merchant_id}): \"{message}\"")
    
    events = []
    actions = []
    cards = []
    text_chunks = []
    final_status = None

    async for event_line in stream_chat(
        session_id=session_id,
        message=message,
        merchant_id=merchant_id,
        lead_id=lead_id,
        mode=mode,
        language=language,
    ):
        line = event_line.strip()
        if not line.startswith("data:"):
            continue
        data_str = line[len("data:"):].strip()
        if not data_str:
            continue
        try:
            ev = json.loads(data_str)
            events.append(ev)
            ev_type = ev.get("type")
            if ev_type == "text":
                text_chunks.append(ev.get("delta", ""))
            elif ev_type == "action":
                actions.append(ev)
                print(f"  [Tool Action] {ev.get('tool')}: {ev.get('summary')}")
            elif ev_type == "card":
                cards.append(ev)
                print(f"  [Card Emitted] {ev.get('tool')}: {ev.get('data', {}).get('title')}")
            elif ev_type == "status":
                final_status = ev.get("value")
                print(f"  [Final Status] {final_status}")
            elif ev_type == "done":
                pass
        except Exception as e:
            print(f"  Parse error on event: {e}")

    full_text = "".join(text_chunks).strip()
    print(f"Saathi Reply:\n  \"{full_text}\"\n")
    return {
        "text": full_text,
        "actions": actions,
        "cards": cards,
        "status": final_status,
    }

async def main():
    global engine, SessionLocal
    # 1. Reset / Seed database for deterministic tests
    print("Connecting to database...")
    try:
        with engine.connect() as conn:
            pass
    except Exception as e:
        print(f"Notice: {e}. Switching test database to SQLite...")
        from database import fallback_to_sqlite
        engine = fallback_to_sqlite()
        Base.metadata.create_all(bind=engine)

    print("Seeding database...")
    with SessionLocal() as db:
        seed(db)
    print("Database seeded.\n")

    # a. Merchant 1 "Mera paisa nahi aaya": settlement check, real IFSC lookup, KYC re-verified, Rs 8,450 sent through IMPS, Hinglish reply, status solved_by_ai.
    sess_a = f"test-sess-a-{uuid.uuid4().hex[:6]}"
    res_a = await run_scenario(
        title="a. Merchant 1: Mera paisa nahi aaya",
        session_id=sess_a,
        message="Mera paisa nahi aaya subah se",
        merchant_id=1,
        language="hi",
    )

    # b. Merchant 2 "My refund of 1200 is stuck": refund retried, solved_by_ai.
    sess_b = f"test-sess-b-{uuid.uuid4().hex[:6]}"
    res_b = await run_scenario(
        title="b. Merchant 2: My refund of 1200 is stuck",
        session_id=sess_b,
        message="My refund of 1200 is stuck",
        merchant_id=2,
        language="en",
    )

    # c. Merchant 2 "Can I get a shop loan?": eligibility, then pre-sanction after I name an amount.
    sess_c = f"test-sess-c-{uuid.uuid4().hex[:6]}"
    res_c1 = await run_scenario(
        title="c1. Merchant 2: Loan inquiry",
        session_id=sess_c,
        message="Can I get a shop loan for my store expansion?",
        merchant_id=2,
        language="en",
    )
    res_c2 = await run_scenario(
        title="c2. Merchant 2: Pre-sanction loan",
        session_id=sess_c,
        message="Yes, please pre-sanction Rs 200000 for me",
        merchant_id=2,
        language="en",
    )

    # d. Merchant 3 "Soundbox is silent": diagnosed, restarted remotely, solved_by_ai.
    sess_d = f"test-sess-d-{uuid.uuid4().hex[:6]}"
    res_d = await run_scenario(
        title="d. Merchant 3: Soundbox is silent",
        session_id=sess_d,
        message="Soundbox is silent and payments are not announcing",
        merchant_id=3,
        language="hi",
    )

    # e. Merchant 2 "Soundbox not working": asks her to charge it (battery too low for a remote fix).
    sess_e = f"test-sess-e-{uuid.uuid4().hex[:6]}"
    res_e = await run_scenario(
        title="e. Merchant 2: Soundbox not working (low battery)",
        session_id=sess_e,
        message="My soundbox is not working and won't turn on",
        merchant_id=2,
        language="en",
    )

    # f. Merchant 3 "Where is my 85000?": handed_to_human, new ticket, calm reply.
    sess_f = f"test-sess-f-{uuid.uuid4().hex[:6]}"
    res_f = await run_scenario(
        title="f. Merchant 3: Where is my 85000 (above AI limit)",
        session_id=sess_f,
        message="Where is my 85000 settlement?",
        merchant_id=3,
        language="hi",
    )

    # g. Merchant 1 "This is fraud, I will call the police": ticket created, calm reply.
    sess_g = f"test-sess-g-{uuid.uuid4().hex[:6]}"
    res_g = await run_scenario(
        title="g. Merchant 1: Urgent anger / Police threat",
        session_id=sess_g,
        message="This is fraud, I will call the police right now!",
        merchant_id=1,
        language="en",
    )

    # h. Sales mode, lead 1: offer sent, follow-up booked.
    sess_h = f"test-sess-h-{uuid.uuid4().hex[:6]}"
    res_h = await run_scenario(
        title="h. Sales mode: Lead 1 offer & follow-up",
        session_id=sess_h,
        message="Hi, I want more stock for my garment shop. Can Paytm help?",
        lead_id=1,
        mode="sales",
        language="en",
    )

    # 4. Confirm /api/actions, /api/tickets, /api/dashboard/summary
    with SessionLocal() as db:
        action_count = db.query(ActionLog).count()
        ticket_count = db.query(Ticket).count()
        sess_count = db.query(DBSession).count()
        print("\n=== Post-Test Database Verification ===")
        print(f"Total ActionLog rows in DB: {action_count}")
        print(f"Total Ticket rows in DB: {ticket_count}")
        print(f"Total Sessions in DB: {sess_count}")
        print("All test suites executed.\n")

if __name__ == "__main__":
    asyncio.run(main())
