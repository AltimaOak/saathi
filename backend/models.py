from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from database import Base, now_ist

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    shop_name = Column(String(128), nullable=False)
    city = Column(String(64), nullable=False)
    language = Column(String(8), nullable=False, default="en") # en, hi, mr
    phone = Column(String(32), nullable=False)
    kyc_status = Column(String(32), nullable=False, default="verified") # verified, mismatch, re-verifying
    bank_name_on_kyc = Column(String(128), nullable=False, default="")
    ifsc = Column(String(32), nullable=False, default="")
    bank_name_on_account = Column(String(128), nullable=False, default="")

    # Voice & Language Persistent Settings
    preferred_language = Column(String(16), nullable=False, default="en")
    voice_response_enabled = Column(Boolean, nullable=False, default=True)
    speech_rate = Column(Float, nullable=False, default=1.0)
    preferred_voice_identifier = Column(String(128), nullable=False, default="")

    settlements = relationship("Settlement", back_populates="merchant")
    refunds = relationship("Refund", back_populates="merchant")
    transactions = relationship("Transaction", back_populates="merchant")
    soundbox = relationship("Soundbox", back_populates="merchant", uselist=False)
    loans = relationship("Loan", back_populates="merchant")
    fraud_cases = relationship("FraudCase", back_populates="merchant")

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(32), nullable=False, default="pending") # paid, held, pending
    reason = Column(String(256), nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=now_ist)

    merchant = relationship("Merchant", back_populates="settlements")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(32), nullable=False, default="failed") # failed, retrying, done
    upi_ref = Column(String(64), nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=now_ist)

    merchant = relationship("Merchant", back_populates="refunds")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    payer = Column(String(128), nullable=False)
    mode = Column(String(64), nullable=False, default="UPI QR")
    status = Column(String(32), nullable=False, default="success")
    utr = Column(String(64), unique=True, index=True, nullable=True)
    order_ref = Column(String(64), nullable=True)
    payer_vpa = Column(String(128), nullable=True)
    last_synced_at = Column(DateTime, nullable=False, default=now_ist)
    created_at = Column(DateTime, nullable=False, default=now_ist)

    merchant = relationship("Merchant", back_populates="transactions")

class Soundbox(Base):
    __tablename__ = "soundboxes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    device_id = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="online") # online, offline
    battery = Column(Integer, nullable=False, default=100)
    fault = Column(String(64), nullable=False, default="") # "", network, battery_low
    last_seen = Column(DateTime, nullable=False, default=now_ist)

    merchant = relationship("Merchant", back_populates="soundbox")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(32), nullable=False, default="pre-sanctioned") # pre-sanctioned, active
    created_at = Column(DateTime, nullable=False, default=now_ist)

    merchant = relationship("Merchant", back_populates="loans")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=False)
    city = Column(String(64), nullable=False)
    interest = Column(String(32), nullable=False, default="loan") # loan, soundbox, pos
    stage = Column(String(32), nullable=False, default="new") # new, talking, booked
    notes = Column(Text, nullable=False, default="")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True)
    summary = Column(String(512), nullable=False)
    priority = Column(String(32), nullable=False, default="normal") # low, normal, high
    status = Column(String(32), nullable=False, default="open") # open, taken, closed
    created_at = Column(DateTime, nullable=False, default=now_ist)

class ActionLog(Base):
    __tablename__ = "action_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    time = Column(DateTime, nullable=False, default=now_ist)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True)
    tool = Column(String(64), nullable=False)
    input_json = Column(Text, nullable=False, default="{}")
    result_json = Column(Text, nullable=False, default="{}")
    status = Column(String(32), nullable=False, default="solved_by_ai") # solved_by_ai, handed_to_human
    summary = Column(String(512), nullable=False, default="")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(128), index=True, nullable=False)
    role = Column(String(16), nullable=False) # user, model
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_ist)

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(128), primary_key=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=True)
    mode = Column(String(32), nullable=False, default="support") # support, sales
    started_at = Column(DateTime, nullable=False, default=now_ist)
    first_reply_ms = Column(Integer, nullable=True)
    outcome = Column(String(64), nullable=True) # solved_by_ai, handed_to_human


class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_ref = Column(String(64), unique=True, index=True, nullable=False)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), index=True, nullable=False)
    channel = Column(String(32), nullable=False, default="document_upload") # document_upload, message_text, chat_agent
    verdict = Column(String(32), index=True, nullable=False) # VERIFIED_RECEIVED, NOT_FOUND, UNABLE_TO_VERIFY, etc.
    risk_level = Column(String(16), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    rule_version = Column(String(16), nullable=False, default="v1.0.0")
    claim_amount = Column(Float, nullable=True)
    claim_utr = Column(String(64), index=True, nullable=True)
    claim_payer = Column(String(128), nullable=True)
    matched_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    explanation_template = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="assessed") # assessed, under_review, resolved, overridden
    created_at = Column(DateTime, nullable=False, default=now_ist)
    resolved_at = Column(DateTime, nullable=True)

    merchant = relationship("Merchant", back_populates="fraud_cases")
    matched_transaction = relationship("Transaction")
    evidence = relationship("FraudEvidence", back_populates="case", uselist=False)


class FraudEvidence(Base):
    __tablename__ = "fraud_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("fraud_cases.id"), index=True, nullable=False)
    file_hash = Column(String(64), index=True, nullable=False) # SHA-256
    sanitized_path = Column(String(256), nullable=True)
    mime_type = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    extracted_json = Column(Text, nullable=False, default="{}")
    signals_fired = Column(Text, nullable=False, default="[]")
    checks_performed = Column(Text, nullable=False, default="[]")
    checks_unverified = Column(Text, nullable=False, default="[]")
    security_flags = Column(Text, nullable=False, default="[]")
    retention_expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_ist)

    case = relationship("FraudCase", back_populates="evidence")


class PaymentClaim(Base):
    """
    Hashed reference registry for duplicate detection across claims.
    Stores HMAC-SHA256 of UTR to protect merchant privacy.
    """
    __tablename__ = "payment_claims"

    id = Column(Integer, primary_key=True, autoincrement=True)
    utr_hash = Column(String(64), unique=True, index=True, nullable=False)
    claim_count = Column(Integer, nullable=False, default=1)
    first_claimed_by_merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    first_claimed_at = Column(DateTime, nullable=False, default=now_ist)
    last_claimed_at = Column(DateTime, nullable=False, default=now_ist)


class FraudRule(Base):
    __tablename__ = "fraud_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(16), nullable=False) # 'v1.0.0'
    rule_id = Column(String(32), index=True, nullable=False) # 'RULE-V01'
    category = Column(String(32), nullable=False) # 'verdict', 'forensics', 'phishing', 'compound'
    description = Column(String(256), nullable=False)
    weight = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=now_ist)


