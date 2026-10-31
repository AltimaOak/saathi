import os
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, Body, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from database import engine, SessionLocal, Base, now_ist, get_db
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
    Session as DBSession,
)
from seed import seed
from agent import stream_chat, get_model_name

app = FastAPI(title="Saathi Backend API", version="1.0.0")

# CORS setup
origins_from_env = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
all_allowed_origins = list(set(default_origins + origins_from_env))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — ensures CORS headers are present even on 500 errors,
# which prevents the browser from swallowing the real error as a CORS failure.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    cors_origin = origin if origin else "*"
    print(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

# Auto-seed on startup if merchants is empty
def init_db_and_seed():
    global engine
    try:
        # Test connection
        with engine.connect() as conn:
            pass
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            m_count = db.query(Merchant).count()
            if m_count == 0:
                print("Database empty on startup. Running seed...")
                seed(db)
    except Exception as e:
        print(f"Primary database connection notice ({e}). Failing over to SQLite...")
        from database import fallback_to_sqlite
        engine = fallback_to_sqlite()
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            try:
                m_count = db.query(Merchant).count()
                if m_count == 0:
                    print("Seeding local SQLite fallback database...")
                    seed(db)
            except Exception as se:
                print(f"Fallback seed warning: {se}")

@app.on_event("startup")
def startup_event():
    init_db_and_seed()

# Also run once on module load so tables exist immediately
init_db_and_seed()

# Request schemas
class ChatStreamRequest(BaseModel):
    session_id: str
    message: str
    merchant_id: Optional[int] = None
    lead_id: Optional[int] = None
    mode: Optional[str] = "support"
    language: Optional[str] = "en"

class LoginRequest(BaseModel):
    merchant_id: int
    otp: Optional[str] = "123456"

class RegisterRequest(BaseModel):
    name: str
    shop_name: str
    city: str
    language: Optional[str] = "en"
    phone: Optional[str] = "+91 98000 00000"

class StageUpdateRequest(BaseModel):
    stage: str

# Endpoints

@app.get("/")
@app.get("/api")
@app.get("/api/")
def root():
    return JSONResponse({
        "service": "Saathi Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    })

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"Health DB check failed: {e}")
    return {
        "ok": db_ok,
        "model": get_model_name(),
        "db": db_ok,
    }

@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatStreamRequest):
    return StreamingResponse(
        stream_chat(
            session_id=req.session_id,
            message=req.message,
            merchant_id=req.merchant_id,
            lead_id=req.lead_id,
            mode=req.mode or "support",
            language=req.language or "en",
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@app.post("/api/auth/login")
def auth_login(req: LoginRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == req.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    # Demo OTP check: demo OTP is always 123456 (or accept for testing)
    if req.otp and req.otp != "123456" and req.otp != "4821":
        raise HTTPException(status_code=400, detail="Invalid OTP. Demo OTP is 123456.")
    return {
        "id": merchant.id,
        "name": merchant.name,
        "shop_name": merchant.shop_name,
        "city": merchant.city,
        "language": merchant.language,
        "phone": merchant.phone,
        "kyc_status": merchant.kyc_status,
        "bank_name_on_kyc": merchant.bank_name_on_kyc,
        "ifsc": merchant.ifsc,
        "bank_name_on_account": merchant.bank_name_on_account,
    }

@app.post("/api/auth/register")
def auth_register(req: RegisterRequest, db: Session = Depends(get_db)):
    merchant = Merchant(
        name=req.name,
        shop_name=req.shop_name,
        city=req.city,
        language=req.language or "en",
        phone=req.phone or "+91 98000 00000",
        kyc_status="verified",
        bank_name_on_kyc="State Bank of India",
        ifsc="SBIN0001000",
        bank_name_on_account="State Bank of India",
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    # Add default soundbox
    sb = Soundbox(
        merchant_id=merchant.id,
        device_id=f"PTM-SB-{5000 + merchant.id}",
        status="online",
        battery=98,
        fault="",
        last_seen=now_ist(),
    )
    db.add(sb)
    db.commit()

    return {
        "id": merchant.id,
        "name": merchant.name,
        "shop_name": merchant.shop_name,
        "city": merchant.city,
        "language": merchant.language,
        "phone": merchant.phone,
        "kyc_status": merchant.kyc_status,
        "bank_name_on_kyc": merchant.bank_name_on_kyc,
        "ifsc": merchant.ifsc,
        "bank_name_on_account": merchant.bank_name_on_account,
    }

@app.get("/api/merchants")
def list_merchants(db: Session = Depends(get_db)):
    merchants = db.query(Merchant).order_by(Merchant.id.asc()).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "shop_name": m.shop_name,
            "city": m.city,
            "language": m.language,
            "phone": m.phone,
            "kyc_status": m.kyc_status,
            "bank_name_on_kyc": m.bank_name_on_kyc,
            "ifsc": m.ifsc,
            "bank_name_on_account": m.bank_name_on_account,
        }
        for m in merchants
    ]

@app.get("/api/merchants/{merchant_id}/overview")
def merchant_overview(merchant_id: int, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    today_start = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    txns_today = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id, Transaction.created_at >= today_start)
        .all()
    )
    today_count = len(txns_today)
    today_amount = sum(t.amount for t in txns_today)

    settlements = (
        db.query(Settlement)
        .filter(Settlement.merchant_id == merchant_id)
        .order_by(Settlement.id.desc())
        .limit(5)
        .all()
    )

    soundbox = db.query(Soundbox).filter(Soundbox.merchant_id == merchant_id).first()
    loan = db.query(Loan).filter(Loan.merchant_id == merchant_id).order_by(Loan.id.desc()).first()

    return {
        "merchant": {
            "id": merchant.id,
            "name": merchant.name,
            "shop_name": merchant.shop_name,
            "city": merchant.city,
            "kyc_status": merchant.kyc_status,
        },
        "today_transactions": {
            "count": today_count,
            "amount": today_amount,
            "formatted_amount": f"₹{today_amount:,.0f}",
        },
        "settlements": [
            {
                "id": s.id,
                "amount": s.amount,
                "formatted_amount": f"₹{s.amount:,.0f}",
                "status": s.status,
                "reason": s.reason,
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for s in settlements
        ],
        "soundbox": {
            "device_id": soundbox.device_id,
            "status": soundbox.status,
            "battery": soundbox.battery,
            "fault": soundbox.fault,
        } if soundbox else None,
        "loan": {
            "id": loan.id,
            "amount": loan.amount,
            "formatted_amount": f"₹{loan.amount:,.0f}",
            "status": loan.status,
            "created_at": loan.created_at.strftime("%Y-%m-%d"),
        } if loan else None,
    }

@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    try:
        total_cases = db.query(DBSession).count()
        solved_by_ai = db.query(DBSession).filter(DBSession.outcome == "solved_by_ai").count()
        handed_to_human = db.query(DBSession).filter(DBSession.outcome == "handed_to_human").count()

        solved_percent = "0.0%"
        if total_cases > 0:
            solved_percent = f"{(solved_by_ai / total_cases) * 100:.1f}%"

        leads_followed_up = (
            db.query(Lead).filter(Lead.stage.in_(["talking", "booked"])).count()
        )

        avg_reply_query = (
            db.query(func.avg(DBSession.first_reply_ms))
            .filter(DBSession.first_reply_ms.isnot(None))
            .scalar()
        )
        avg_first_reply_seconds = round((avg_reply_query or 1800) / 1000.0, 1)

        return {
            "total_cases": total_cases,
            "solved_by_ai": solved_by_ai,
            "handed_to_human": handed_to_human,
            "solved_percent": solved_percent,
            "leads_followed_up": leads_followed_up,
            "avg_first_reply_seconds": avg_first_reply_seconds,
        }
    except Exception as e:
        print(f"dashboard_summary DB error: {e}")
        return {
            "total_cases": 0,
            "solved_by_ai": 0,
            "handed_to_human": 0,
            "solved_percent": "0.0%",
            "leads_followed_up": 0,
            "avg_first_reply_seconds": 0,
        }

@app.get("/api/dashboard/timeseries")
def dashboard_timeseries(db: Session = Depends(get_db)):
    current_ist = now_ist()
    result = []
    # 7 days from 6 days ago up to today
    for day_offset in range(6, -1, -1):
        target_date = (current_ist - timedelta(days=day_offset)).date()
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())

        saathi_cnt = (
            db.query(DBSession)
            .filter(
                DBSession.started_at >= day_start,
                DBSession.started_at <= day_end,
                DBSession.outcome == "solved_by_ai",
            )
            .count()
        )
        human_cnt = (
            db.query(DBSession)
            .filter(
                DBSession.started_at >= day_start,
                DBSession.started_at <= day_end,
                DBSession.outcome == "handed_to_human",
            )
            .count()
        )

        result.append({
            "day": target_date.strftime("%a"),
            "saathi": saathi_cnt,
            "human": human_cnt,
        })
    return result

@app.get("/api/actions")
def get_actions(limit: int = 50, db: Session = Depends(get_db)):
    actions = (
        db.query(ActionLog)
        .order_by(ActionLog.id.desc())
        .limit(limit)
        .all()
    )
    items = []
    for a in actions:
        m_name = "Merchant Terminal"
        if a.merchant_id:
            m = db.query(Merchant).filter(Merchant.id == a.merchant_id).first()
            if m:
                m_name = f"{m.shop_name} ({m.city})"

        status_str = "Solved"
        if a.status == "handed_to_human":
            status_str = "Handed to human"
        elif "loan" in a.tool or "book" in a.tool:
            status_str = "Booked"

        items.append({
            "id": f"ACT-{a.id}",
            "action_id": a.id,
            "time": a.time.strftime("%H:%M:%S"),
            "merchant": m_name,
            "action": a.summary,
            "result": a.summary,
            "status": status_str,
            "raw_status": a.status,
            "tool": a.tool,
            "isNew": False,
        })
    return items

@app.get("/api/events")
def get_events(after: int = Query(0), db: Session = Depends(get_db)):
    """Fast, non-blocking polling endpoint for live dashboard updates."""
    new_actions = (
        db.query(ActionLog)
        .filter(ActionLog.id > after)
        .order_by(ActionLog.id.asc())
        .limit(20)
        .all()
    )

    action_items = []
    latest_id = after
    for a in new_actions:
        if a.id > latest_id:
            latest_id = a.id
        m_name = "Merchant Terminal"
        if a.merchant_id:
            m = db.query(Merchant).filter(Merchant.id == a.merchant_id).first()
            if m:
                m_name = f"{m.shop_name} ({m.city})"

        status_str = "Solved"
        if a.status == "handed_to_human":
            status_str = "Handed to human"
        elif "loan" in a.tool or "book" in a.tool:
            status_str = "Booked"

        action_items.append({
            "id": f"ACT-{a.id}",
            "action_id": a.id,
            "time": a.time.strftime("%H:%M:%S"),
            "merchant": m_name,
            "action": a.summary,
            "result": a.summary,
            "status": status_str,
            "raw_status": a.status,
            "tool": a.tool,
            "isNew": True,
        })

    open_tickets = db.query(Ticket).filter(Ticket.status == "open").order_by(Ticket.id.desc()).all()
    ticket_items = [
        {
            "id": f"CASE-{t.id}",
            "ticket_id": t.id,
            "merchant": f"Merchant #{t.merchant_id}" if t.merchant_id else "General Merchant Inquiry",
            "amount": "Priority Case",
            "summary": t.summary,
            "status": "Needs human",
            "priority": t.priority.capitalize(),
            "tag": "Settlement > ₹10k" if "settlement" in t.summary.lower() else "High Priority",
        }
        for t in open_tickets
    ]

    return {
        "actions": action_items,
        "open_tickets": ticket_items,
        "latest_id": latest_id,
    }

@app.get("/api/tickets")
def get_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.id.desc()).all()
    return [
        {
            "id": f"CASE-{t.id}",
            "ticket_id": t.id,
            "merchant_id": t.merchant_id,
            "merchant": f"Merchant #{t.merchant_id}" if t.merchant_id else "Merchant Inquiry",
            "summary": t.summary,
            "priority": t.priority,
            "status": t.status,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for t in tickets
    ]

@app.post("/api/tickets/{ticket_id}/take")
def take_ticket(ticket_id: int, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.status = "taken"
    db.commit()
    return {"status": "ok", "ticket_id": t.id, "ticket_status": "taken"}

@app.get("/api/leads")
def get_leads(db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.id.asc()).all()
    grouped = {"new": [], "talking": [], "booked": []}
    for l in leads:
        st = l.stage if l.stage in grouped else "new"
        grouped[st].append({
            "id": f"LEAD-{l.id:02d}",
            "lead_id": l.id,
            "shop": l.name,
            "owner": f"{l.name} ({l.city})",
            "need": f"Interested in {l.interest.upper()}",
            "monthlyVol": "Active Kirana",
            "status": l.notes or "New lead identified by Saathi",
            "agent": "Rajesh K. (Field Desk Agent)",
            "time": "Tomorrow, 11:30 AM",
        })
    return grouped

@app.patch("/api/leads/{lead_id}/stage")
def update_lead_stage(lead_id: int, req: StageUpdateRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if req.stage not in ["new", "talking", "booked"]:
        raise HTTPException(status_code=400, detail="Invalid stage")
    lead.stage = req.stage
    db.commit()
    return {"status": "ok", "lead_id": lead.id, "stage": lead.stage}

@app.post("/api/reset")
def reset_database(db: Session = Depends(get_db)):
    seed(db)
    return {"status": "ok", "message": "Database reset to initial demo state"}
