import random
from datetime import timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal, now_ist
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
    Message,
    Session as DBSession,
)

def seed(db: Session):
    random.seed(7)

    # Make sure all tables exist
    Base.metadata.create_all(bind=engine)

    # Truncate tables cleanly
    is_postgres = db.bind.dialect.name == "postgresql"
    if is_postgres:
        db.execute(text("""
            TRUNCATE TABLE messages, action_log, tickets, leads, loans, soundboxes,
            transactions, refunds, settlements, sessions, merchants
            RESTART IDENTITY CASCADE;
        """))
    else:
        for tbl in ["messages", "action_log", "tickets", "leads", "loans", "soundboxes",
                    "transactions", "refunds", "settlements", "sessions", "merchants"]:
            db.execute(text(f"DELETE FROM {tbl};"))

    current_ist = now_ist()

    # 1. Seed 12 Merchants (Deterministic IDs 1 to 12)
    merchants_data = [
        {
            "id": 1,
            "name": "Ramesh Patil",
            "shop_name": "Ramesh Kirana Store",
            "city": "Dadar, Mumbai",
            "language": "mr",
            "phone": "+91 98201 44910",
            "kyc_status": "mismatch",
            "bank_name_on_kyc": "HDFC Bank",
            "ifsc": "SBIN0000691",
            "bank_name_on_account": "State Bank of India",
        },
        {
            "id": 2,
            "name": "Priya Menon",
            "shop_name": "Priya Electronics & Mobiles",
            "city": "Indiranagar, Bengaluru",
            "language": "en",
            "phone": "+91 98450 11920",
            "kyc_status": "verified",
            "bank_name_on_kyc": "HDFC Bank",
            "ifsc": "HDFC0000060",
            "bank_name_on_account": "HDFC Bank",
        },
        {
            "id": 3,
            "name": "Vikram Arora",
            "shop_name": "Vikram Sweets & Dairy",
            "city": "Chandni Chowk, Delhi",
            "language": "hi",
            "phone": "+91 98110 33490",
            "kyc_status": "verified",
            "bank_name_on_kyc": "ICICI Bank",
            "ifsc": "ICIC0000004",
            "bank_name_on_account": "ICICI Bank",
        },
        {
            "id": 4,
            "name": "Suresh Jadhav",
            "shop_name": "Jadhav Super Market",
            "city": "Pune",
            "language": "mr",
            "phone": "+91 98220 55110",
            "kyc_status": "verified",
            "bank_name_on_kyc": "State Bank of India",
            "ifsc": "SBIN0000455",
            "bank_name_on_account": "State Bank of India",
        },
        {
            "id": 5,
            "name": "Anita Kulkarni",
            "shop_name": "Kulkarni Sarees & Textiles",
            "city": "Thane",
            "language": "mr",
            "phone": "+91 98204 88290",
            "kyc_status": "verified",
            "bank_name_on_kyc": "HDFC Bank",
            "ifsc": "HDFC0000120",
            "bank_name_on_account": "HDFC Bank",
        },
        {
            "id": 6,
            "name": "Nilesh Deshmukh",
            "shop_name": "Nashik Auto Spares",
            "city": "Nashik",
            "language": "mr",
            "phone": "+91 98230 77120",
            "kyc_status": "verified",
            "bank_name_on_kyc": "ICICI Bank",
            "ifsc": "ICIC0000012",
            "bank_name_on_account": "ICICI Bank",
        },
        {
            "id": 7,
            "name": "Rajesh Sharma",
            "shop_name": "Jaipur Handicrafts",
            "city": "Jaipur",
            "language": "hi",
            "phone": "+91 94140 22340",
            "kyc_status": "verified",
            "bank_name_on_kyc": "State Bank of India",
            "ifsc": "SBIN0000656",
            "bank_name_on_account": "State Bank of India",
        },
        {
            "id": 8,
            "name": "Mohammed Irfan",
            "shop_name": "Deccan Pearls & Jewellers",
            "city": "Hyderabad",
            "language": "en",
            "phone": "+91 98490 66780",
            "kyc_status": "verified",
            "bank_name_on_kyc": "HDFC Bank",
            "ifsc": "HDFC0000045",
            "bank_name_on_account": "HDFC Bank",
        },
        {
            "id": 9,
            "name": "Bhavesh Patel",
            "shop_name": "Gujarat Provision Stores",
            "city": "Ahmedabad",
            "language": "en",
            "phone": "+91 98250 33410",
            "kyc_status": "verified",
            "bank_name_on_kyc": "Axis Bank",
            "ifsc": "UTIB0000020",
            "bank_name_on_account": "Axis Bank",
        },
        {
            "id": 10,
            "name": "Arvind Shukla",
            "shop_name": "Awadh Sweets & Namkeen",
            "city": "Lucknow",
            "language": "hi",
            "phone": "+91 94150 99820",
            "kyc_status": "verified",
            "bank_name_on_kyc": "Punjab National Bank",
            "ifsc": "PUNB0000200",
            "bank_name_on_account": "Punjab National Bank",
        },
        {
            "id": 11,
            "name": "Sachin Patil",
            "shop_name": "Mahalaxmi Dairy Products",
            "city": "Kolhapur",
            "language": "mr",
            "phone": "+91 98224 11230",
            "kyc_status": "verified",
            "bank_name_on_kyc": "State Bank of India",
            "ifsc": "SBIN0000388",
            "bank_name_on_account": "State Bank of India",
        },
        {
            "id": 12,
            "name": "Anoop Varma",
            "shop_name": "Malabar Spices & Tea",
            "city": "Kochi",
            "language": "en",
            "phone": "+91 98470 55490",
            "kyc_status": "verified",
            "bank_name_on_kyc": "Federal Bank",
            "ifsc": "FDRL0001001",
            "bank_name_on_account": "Federal Bank",
        },
    ]

    for m_info in merchants_data:
        m = Merchant(**m_info)
        db.add(m)
    db.commit()

    # 2. QR Transactions (30 to 90 days, 3 to 9 per day)
    payers = ["Amit S.", "Rahul V.", "Sanjay K.", "Neha P.", "Pooja M.", "Rohan B.", "Vikrant D.", "Deepak T.", "Sunil G.", "Kavita R."]
    for m_id in range(1, 13):
        days_history = 60 if m_id <= 3 else random.randint(35, 75)
        for day_offset in range(days_history, -1, -1):
            txn_date = current_ist - timedelta(days=day_offset)
            num_txns = random.randint(3, 9)
            for _ in range(num_txns):
                hour = random.randint(8, 22)
                minute = random.randint(0, 59)
                t_time = txn_date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

                if m_id == 2:  # Priya Electronics
                    amt = float(random.choice([450, 850, 1200, 2400, 3800, 5200]))
                elif m_id == 3:  # Vikram Sweets
                    amt = float(random.choice([320, 680, 1400, 2900, 4800, 8500]))
                else:
                    amt = float(random.choice([40, 80, 150, 220, 350, 550, 1200]))

                t = Transaction(
                    merchant_id=m_id,
                    amount=amt,
                    payer=random.choice(payers),
                    mode="UPI QR",
                    status="success",
                    created_at=t_time,
                )
                db.add(t)
    db.commit()

    # 3. Settlements
    for m_id in range(1, 13):
        # 3 paid settlements
        for i in range(1, 4):
            s = Settlement(
                merchant_id=m_id,
                amount=float(random.randint(3200, 12000)),
                status="paid",
                reason="Automatic morning settlement batch",
                created_at=current_ist - timedelta(days=i, hours=2),
            )
            db.add(s)

    # Demo cases:
    # Ramesh: settlement Rs 8,450, status held, reason "Bank name on KYC does not match the bank account"
    db.add(Settlement(
        merchant_id=1,
        amount=8450.0,
        status="held",
        reason="Bank name on KYC does not match the bank account",
        created_at=current_ist - timedelta(hours=3),
    ))

    # Vikram: settlement Rs 85,000 held, reason "Under manual risk review" (> AI_LIMIT)
    db.add(Settlement(
        merchant_id=3,
        amount=85000.0,
        status="held",
        reason="Under manual risk review",
        created_at=current_ist - timedelta(hours=1),
    ))
    db.commit()

    # 4. Refunds
    for m_id in range(1, 13):
        # 1 done refund
        db.add(Refund(
            merchant_id=m_id,
            amount=float(random.choice([150, 280, 420])),
            status="done",
            upi_ref=f"UPI{random.randint(1000000000, 9999999999)}",
            created_at=current_ist - timedelta(days=4),
        ))

    # Demo case: Priya failed refund Rs 1,200 (upi_ref UPI4821937710)
    db.add(Refund(
        merchant_id=2,
        amount=1200.0,
        status="failed",
        upi_ref="UPI4821937710",
        created_at=current_ist - timedelta(hours=5),
    ))
    db.commit()

    # 5. Soundboxes
    for m_id in range(1, 13):
        if m_id == 2:
            # Priya: offline, battery 9, fault battery_low
            db.add(Soundbox(
                merchant_id=2,
                device_id="PTM-SB-7740",
                status="offline",
                battery=9,
                fault="battery_low",
                last_seen=current_ist - timedelta(hours=4),
            ))
        elif m_id == 3:
            # Vikram: offline, fault network
            db.add(Soundbox(
                merchant_id=3,
                device_id="PTM-SB-9014",
                status="offline",
                battery=72,
                fault="network",
                last_seen=current_ist - timedelta(minutes=45),
            ))
        else:
            db.add(Soundbox(
                merchant_id=m_id,
                device_id=f"PTM-SB-{4000 + m_id}",
                status="online",
                battery=random.randint(65, 98),
                fault="",
                last_seen=current_ist - timedelta(minutes=random.randint(1, 10)),
            ))
    db.commit()

    # 6. Leads (12 leads)
    leads_seed = [
        {"name": "Sunita Shinde", "phone": "+91 98221 44501", "city": "Pune", "interest": "loan", "stage": "new", "notes": "Runs a garment shop and wants money for more stock"},
        {"name": "Ganesh Hegde", "phone": "+91 98450 66212", "city": "Hubli", "interest": "soundbox", "stage": "talking", "notes": "Needs 2nd Soundbox for busy morning snacks counter"},
        {"name": "Irfan Sheikh", "phone": "+91 98710 33414", "city": "Nagpur", "interest": "loan", "stage": "talking", "notes": "Expanding mobile repair shop, needs Rs 3,00,000 loan"},
        {"name": "Ramesh Choudhary", "phone": "+91 98201 11200", "city": "Mumbai", "interest": "loan", "stage": "booked", "notes": "Ready for Rs 2,50,000 shop loan signoff tomorrow 11 AM"},
        {"name": "V. Murthy", "phone": "+91 98410 88291", "city": "Chennai", "interest": "soundbox", "stage": "booked", "notes": "Confirmed address for Soundbox delivery today 4:30 PM"},
        {"name": "Kiran Patel", "phone": "+91 98251 77123", "city": "Rajkot", "interest": "pos", "stage": "new", "notes": "Needs card machine for garment showroom"},
        {"name": "Suraj Verma", "phone": "+91 94250 33499", "city": "Bhopal", "interest": "soundbox", "stage": "new", "notes": "Inquired about Soundbox 4G upgrade"},
        {"name": "Deepak Shah", "phone": "+91 98240 55102", "city": "Vadodara", "interest": "loan", "stage": "new", "notes": "Working capital for festive inventory"},
        {"name": "Kavita Rao", "phone": "+91 98451 99014", "city": "Bengaluru", "interest": "pos", "stage": "talking", "notes": "Wants EDC terminal for boutique checkout"},
        {"name": "Manoj Tiwari", "phone": "+91 94151 22345", "city": "Varanasi", "interest": "loan", "stage": "talking", "notes": "Sweet shop expansion loan inquiry"},
        {"name": "Harish Nair", "phone": "+91 98471 44567", "city": "Thiruvananthapuram", "interest": "soundbox", "stage": "booked", "notes": "Booked doorstep installation for Soundbox"},
        {"name": "Preeti Sen", "phone": "+91 98310 88721", "city": "Kolkata", "interest": "pos", "stage": "booked", "notes": "Pre-booked Paytm Card swipe machine"},
    ]
    for ld in leads_seed:
        db.add(Lead(**ld))
    db.commit()

    # 7. Tickets (3 open tickets for Needs a human)
    tickets_seed = [
        {
            "merchant_id": 3,
            "summary": "High-value settlement hold: Rs 85,000 (> Rs 10,000 automated limit) - Under manual risk review",
            "priority": "high",
            "status": "open",
            "created_at": current_ist - timedelta(hours=1),
        },
        {
            "merchant_id": None,
            "summary": "Settlement on hold due to bank branch consolidation. Merchant agitated about supplier bill.",
            "priority": "high",
            "status": "open",
            "created_at": current_ist - timedelta(hours=3),
        },
        {
            "merchant_id": None,
            "summary": "Large festive UPI transaction flagged by risk engine. Requires manual invoice verification.",
            "priority": "high",
            "status": "open",
            "created_at": current_ist - timedelta(hours=6),
        },
    ]
    for tk in tickets_seed:
        db.add(Ticket(**tk))
    db.commit()

    # 8. 7 days of history in sessions (14 to 28 per day, about 72% solved_by_ai, first_reply_ms 1200 to 2600)
    for day_offset in range(6, -1, -1):
        day_date = current_ist - timedelta(days=day_offset)
        num_sessions = random.randint(14, 28)
        for s_idx in range(num_sessions):
            sess_time = day_date.replace(
                hour=random.randint(7, 21),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
            )
            is_solved = (random.random() < 0.72)
            outcome = "solved_by_ai" if is_solved else "handed_to_human"
            first_reply = random.randint(1200, 2600)
            m_id = random.randint(1, 12)

            s_row = DBSession(
                id=f"sess-hist-{day_offset}-{s_idx}",
                merchant_id=m_id,
                mode="support",
                started_at=sess_time,
                first_reply_ms=first_reply,
                outcome=outcome,
            )
            db.add(s_row)
    db.commit()

    # 9. Initial action log entries
    initial_actions = [
        {
            "merchant_id": 1,
            "tool": "reroute_settlement_imps",
            "summary": "Re-routed delayed settlement via IMPS (Rs 4,850 credited in 8 mins)",
            "status": "solved_by_ai",
            "time": current_ist - timedelta(minutes=4),
        },
        {
            "merchant_id": 4,
            "tool": "retrigger_kyc",
            "summary": "Auto-restarted failed KYC photo upload (Aadhaar XML verified instantly)",
            "status": "solved_by_ai",
            "time": current_ist - timedelta(minutes=7),
        },
        {
            "merchant_id": 6,
            "tool": "presanction_loan",
            "summary": "Pre-qualified for Rs 2.5L merchant loan (Field visit booked for tomorrow 11 AM)",
            "status": "solved_by_ai",
            "time": current_ist - timedelta(minutes=11),
        },
        {
            "merchant_id": 3,
            "tool": "create_ticket",
            "summary": "High-value settlement hold (> Rs 45,000) escalated to Desk Lead Kunal S.",
            "status": "handed_to_human",
            "time": current_ist - timedelta(minutes=15),
        },
        {
            "merchant_id": 7,
            "tool": "retry_refund",
            "summary": "Cleared stuck customer refund (Rs 320) via NPCI fast-track reversal",
            "status": "solved_by_ai",
            "time": current_ist - timedelta(minutes=18),
        },
    ]
    for act in initial_actions:
        db.add(ActionLog(
            time=act["time"],
            merchant_id=act["merchant_id"],
            tool=act["tool"],
            input_json="{}",
            result_json="{}",
            status=act["status"],
            summary=act["summary"],
        ))
    db.commit()

if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
        print("Successfully seeded database with 12 merchants, settlements, soundboxes, leads, tickets, and session history.")

