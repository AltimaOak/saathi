# STAGE 2: IMPLEMENTATION PLAN — SAATHI FRAUD & PAYMENT VERIFICATION + VOICE SYSTEM

**Architecture Specification & Engineering Blueprint**  
**Version:** 1.0.0-PROD  
**Target Delivery:** Phased Implementation (Phases 1 through 6)  
**Governance:** Strict Read-Only Approval Gate (No Stage 3 code execution without explicit signoff)

---

## 1. System Architecture & Modular Design

The Fraud & Payment Verification capability is built entirely as native, modular services inside the existing FastAPI backend and React frontend. **Zero external microservices** are introduced, minimizing operational complexity while ensuring single-node transactional integrity and sub-second verification latency.

```
                              ┌──────────────────────────────────────────────┐
                              │           Untrusted Client Inputs            │
                              │  (Receipt Screenshot, PDF Slip, SMS, Voice)  │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │            API Gateway & Security            │
                              │    - Session Authentication (JWT / Cookie)   │
                              │    - Rate Limiting (Token Bucket)            │
                              │    - File Hardening (Magic Bytes, Max 5MB)   │
                              └──────────────────────┬───────────────────────┘
                                                     │
                        ┌────────────────────────────┴───────────────────────────┐
                        ▼                                                        ▼
         ┌─────────────────────────────┐                         ┌─────────────────────────────┐
         │     Document Extraction     │                         │   Message Threat Analyzer   │
         │  - Strip EXIF / Metadata    │                         │  - URL Extractor (No-Fetch) │
         │  - Gemini Multimodal Vision │                         │  - Homoglyph & Punycode     │
         │  - Strict JSON Schema       │                         │  - Credential & Urgency Ptn │
         │  - Prompt-Injection Sieve   │                         │  - Fake KYC / QR Threat     │
         └──────────────┬──────────────┘                         └──────────────┬──────────────┘
                        │                                                        │
                        │ (Untrusted Extracted Query)                            │
                        ▼                                                        │
         ┌─────────────────────────────┐                                         │
         │  Payment Verification Engine│                                         │
         │  - Ledger Lookup (UTR/RRN)  │                                         │
         │  - Freshness Guard Check    │                                         │
         │  - Receiver & Amount Match  │                                         │
         │  - Duplicate Hash Registry  │                                         │
         └──────────────┬──────────────┘                                         │
                        │                                                        │
                        └────────────────────────────┬───────────────────────────┘
                                                     │
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │     Deterministic Risk Engine (v1.0.0)       │
                              │    - Verdict Resolver (VERIFIED, MISMATCH..) │
                              │    - Signal Evaluator (Weighted Flags)       │
                              │    - Composite Risk (LOW, MED, HIGH, CRIT)   │
                              │    - Deterministic Template Explainer        │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │    Case Management & Immutable Audit Trail   │
                              │    - fraud_cases & fraud_evidence            │
                              │    - payment_claims (Hashed References)      │
                              │    - action_log & Human Escalation Tickets   │
                              └──────────────────────┬───────────────────────┘
                                                     │
                        ┌────────────────────────────┴───────────────────────────┐
                        ▼                                                        ▼
         ┌─────────────────────────────┐                         ┌─────────────────────────────┐
         │ Fraud & Security UI Center  │                         │ Voice System (Speech Synth) │
         │  - Verification Verdict Pill│                         │  - BCP-47 Voice Matcher     │
         │  - Risk Level Badge (100%)  │                         │  - Rate 0.75x - 1.50x       │
         │  - Evidence Audit Breakdown │                         │  - Play / Pause / Replay    │
         │  - Safe Next Step Guidance  │                         │  - Clean Text Ingestion     │
         └─────────────────────────────┘                         └─────────────────────────────┘
```

---

## 2. Core Operational Principles & Decision Architecture

### 2.1 The Cardinal Principle
1. **Extraction Is An Untrusted Search Query:** An uploaded screenshot, cropped receipt, SMS text, or forward is never proof of receipt. It merely supplies candidate fields (`claim_amount`, `claim_utr`, `claim_payer_vpa`, `claim_timestamp`).
2. **Only Verified Backend Sources Confirm Payment:** Only an existing internal transaction record in the database, a cryptographically signed webhook, or an official banking switch statement can confirm a payment.
3. **Fail-Closed Policy:** If no trusted source is reachable or data is stale, the verdict is strictly `UNABLE_TO_VERIFY` — **never** "verified" and **never** "fraud".

### 2.2 Verification Verdict State Machine
Every assessment generates one of nine mutually exclusive, deterministic verdicts:

| Verdict Code | Display Label | Description & Prerequisites | Initial Baseline Risk |
|---|---|---|---|
| `VERIFIED_RECEIVED` | Verified Payment | UTR found on fresh ledger, amount matches within ₹0.00, receiver account matches merchant, not previously claimed. | `LOW` |
| `NOT_FOUND` | No Record Found | Ledger freshness check **passed** (synced < 10 mins ago), but candidate UTR does not exist in transactions. | `HIGH` |
| `UNABLE_TO_VERIFY` | Unable to Verify | Ledger connection timed out, API unavailable, or ledger is stale (> 15 mins). No accusatory wording. | `MEDIUM` |
| `PENDING` | Payment In Flight | Transaction exists in switch / ledger with status `pending` or `processing`. | `MEDIUM` |
| `FAILED` | Payment Failed | Transaction exists in switch / ledger with status `failed` or `declined`. | `HIGH` |
| `REVERSED_OR_REFUNDED`| Payout Reversed | Transaction was debited but subsequently credited back or refunded via NPCI. | `HIGH` |
| `MISMATCH_AMOUNT` | Amount Discrepancy | UTR found on ledger, but actual amount received differs from claimed screenshot amount. | `HIGH` |
| `MISMATCH_RECEIVER` | Wrong Receiver | UTR found on ledger, but paid to a different merchant VPA/account. | `HIGH` |
| `ALREADY_CLAIMED` | Duplicate Claim | UTR was already matched and claimed in an earlier verification case. | `HIGH` |

### 2.3 Deterministic Risk Engine Matrix (Rule Version: `v1.0.0`)
The LLM **never** generates numerical risk scores or invents risk levels. The risk level is calculated via deterministic rules:

```
[Verdict Baseline Risk]
        │
        ▼
[Signal Weights Evaluation] ──► (+1 Level for Forensics/Urgency/Shortener)
        │
        ▼
[Rule Cap Guard] ──────────────► (Metadata/Forensics ALONE can NEVER produce CRITICAL)
        │
        ▼
[Final Risk Level] ────────────► (LOW | MEDIUM | HIGH | CRITICAL)
```

| Rule ID | Trigger Condition | Weight | Action on Risk Level |
|---|---|---|---|
| `RULE-V01` | Verdict is `VERIFIED_RECEIVED` and zero duplicate claims | Baseline | Sets `LOW` |
| `RULE-V02` | Verdict is `UNABLE_TO_VERIFY` or `PENDING` | Baseline | Sets `MEDIUM` |
| `RULE-V03` | Verdict is `NOT_FOUND` (on fresh ledger), `MISMATCH_AMOUNT`, or `MISMATCH_RECEIVER` | Baseline | Sets `HIGH` |
| `RULE-V04` | Verdict is `ALREADY_CLAIMED` (reused UTR across different claim cases) | Baseline | Sets `HIGH` |
| `RULE-M01` | Font anomaly / visual misalignment detected in OCR layout | +1 Sub-level | Escalates `LOW` → `MEDIUM` (Capped; cannot trigger `CRITICAL`) |
| `RULE-M02` | Timestamp anomaly (screenshot claims payment in future or > 90 days ago) | +1 Sub-level | Escalates `LOW` → `MEDIUM` (Capped; cannot trigger `CRITICAL`) |
| `RULE-P01` | Message contains credential request (OTP, UPI PIN, Password, NetBanking) | Major Signal | Elevates to `HIGH` |
| `RULE-P02` | Message contains urgency threat ("account blocked within 2 hours", "police") | Major Signal | Elevates to `HIGH` |
| `RULE-P03` | Message contains reverse-charge lure ("Scan QR to receive payment") | Major Signal | Elevates to `HIGH` |
| `RULE-C01` | **CRITICAL Rule:** Two or more independent Major Signals fire simultaneously (e.g., `NOT_FOUND` on fresh ledger + OTP credential theft lure, or `MISMATCH_AMOUNT` + Reused Claim Hash) | Compound | Sets `CRITICAL` |

---

## 3. Database Schema Changes & Backward-Compatible Migrations

### 3.1 Augmentations to Existing Tables

#### Table: `transactions`
Add columns to support banking lookup and freshness verification:
```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS utr VARCHAR(64) UNIQUE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_ref VARCHAR(64);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payer_vpa VARCHAR(128);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_txns_utr ON transactions(utr);
CREATE INDEX IF NOT EXISTS idx_txns_merchant_synced ON transactions(merchant_id, last_synced_at);
```

#### Table: `merchants`
Add voice preferences and language settings directly to the merchant profile:
```sql
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(16) DEFAULT 'en';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS voice_response_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS speech_rate FLOAT DEFAULT 1.0;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS preferred_voice_identifier VARCHAR(128) DEFAULT '';
```

### 3.2 New Tables

#### 1. `fraud_cases`
Tracks the lifecycle of payment claims and message threat analyses.
```sql
CREATE TABLE fraud_cases (
    id SERIAL PRIMARY KEY,
    case_ref VARCHAR(64) UNIQUE NOT NULL,       -- e.g. FC-202610-8812
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL,               -- 'document_upload', 'message_text', 'chat_agent'
    verdict VARCHAR(32) NOT NULL,               -- 'VERIFIED_RECEIVED', 'NOT_FOUND', etc.
    risk_level VARCHAR(16) NOT NULL,            -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    rule_version VARCHAR(16) NOT NULL,         -- 'v1.0.0'
    claim_amount FLOAT,
    claim_utr VARCHAR(64),
    claim_payer VARCHAR(128),
    matched_transaction_id INTEGER REFERENCES transactions(id),
    explanation_template TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'assessed',      -- 'assessed', 'under_review', 'resolved', 'overridden'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_fraud_cases_merchant ON fraud_cases(merchant_id);
CREATE INDEX idx_fraud_cases_verdict ON fraud_cases(verdict);
CREATE INDEX idx_fraud_cases_utr ON fraud_cases(claim_utr);
```

#### 2. `fraud_evidence`
Maintains sanitized evidence, OCR extracts, and audit payloads.
```sql
CREATE TABLE fraud_evidence (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES fraud_cases(id) ON DELETE CASCADE,
    file_hash VARCHAR(64) NOT NULL,            -- SHA-256 of original raw file
    sanitized_path VARCHAR(256),                -- Re-encoded PNG/PDF stored in /storage/evidence/
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    extracted_json JSONB NOT NULL DEFAULT '{}', -- Structured output from Vision/Regex
    signals_fired JSONB NOT NULL DEFAULT '[]',  -- Array of rule triggers with weights
    checks_performed JSONB NOT NULL DEFAULT '[]',
    checks_unverified JSONB NOT NULL DEFAULT '[]',
    security_flags JSONB NOT NULL DEFAULT '[]', -- Prompt injection detections, stripped EXIF
    retention_expires_at TIMESTAMP NOT NULL,    -- Auto-prune after 90 days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_case ON fraud_evidence(case_id);
CREATE INDEX idx_evidence_file_hash ON fraud_evidence(file_hash);
```

#### 3. `payment_claims` (Hashed Reference Registry)
Ensures zero duplicate claims while maintaining cross-merchant privacy.
```sql
CREATE TABLE payment_claims (
    id SERIAL PRIMARY KEY,
    utr_hash VARCHAR(64) UNIQUE NOT NULL,      -- HMAC-SHA256(utr, SECRET_SALT)
    claim_count INTEGER NOT NULL DEFAULT 1,
    first_claimed_by_merchant_id INTEGER REFERENCES merchants(id),
    first_claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_hash ON payment_claims(utr_hash);
```

#### 4. `fraud_rules`
Stores versioned risk rules for full reproducibility and auditing.
```sql
CREATE TABLE fraud_rules (
    id SERIAL PRIMARY KEY,
    version VARCHAR(16) NOT NULL,              -- e.g. 'v1.0.0'
    rule_id VARCHAR(32) NOT NULL,              -- e.g. 'RULE-P01'
    category VARCHAR(32) NOT NULL,             -- 'verdict', 'forensics', 'phishing', 'compound'
    description VARCHAR(256) NOT NULL,
    weight INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_rules_ver_id ON fraud_rules(version, rule_id);
```

---

## 4. API Specifications

### 4.1 Payment Verification via Document Upload
- **Endpoint:** `POST /api/fraud/verify-payment`
- **Content-Type:** `multipart/form-data`
- **Security:** Authenticated merchant session (`merchant_id` extracted from session/context; client-submitted IDs rejected).
- **Parameters:**
  - `file`: Binary file (image/jpeg, image/png, application/pdf). Max 5MB.
  - `claim_amount`: Optional Float (if merchant pre-filled amount).
  - `idempotency_key`: UUID string.
- **Processing Pipeline:**
  1. Magic-byte verification (reject disguised binaries).
  2. Re-encode image (strip EXIF, GPS, camera metadata).
  3. Compute SHA-256 file hash.
  4. Pass sanitized bytes to Gemini Multimodal Vision with strict JSON schema:
     `{"utr": str, "amount": float, "receiver_vpa": str, "timestamp": str, "payer_name": str, "raw_text": str}`.
  5. Sieve out any prompt-injection instructions in extracted text (e.g., `"ignore previous instructions"` logged as `RULE-SEC01`).
  6. Execute internal ledger query against `transactions` by UTR and merchant ID.
  7. Check `payment_claims` hash registry for prior claims.
  8. Calculate Verdict and Risk Level via deterministic Rule Engine `v1.0.0`.
  9. Write immutable record to `fraud_cases`, `fraud_evidence`, and `action_log`.
- **Response Schema (`200 OK`):**
  ```json
  {
    "case_ref": "FC-202610-8812",
    "verdict": "VERIFIED_RECEIVED",
    "verdict_label": "Verified Payment",
    "risk_level": "LOW",
    "rule_version": "v1.0.0",
    "ledger_last_synced_at": "2026-10-31T15:50:00Z",
    "claimed": {
      "utr": "430198271049",
      "amount": 1450.0,
      "payer": "Rahul Sharma",
      "timestamp": "2026-10-31 15:42:10"
    },
    "matched_record": {
      "transaction_id": 10482,
      "amount": 1450.0,
      "mode": "UPI QR",
      "settled_status": "success",
      "recorded_at": "2026-10-31 15:42:14"
    },
    "signals_fired": [],
    "checks_performed": [
      "Bank UTR existence on merchant ledger",
      "Exact amount matching (claimed vs recorded)",
      "Receiver VPA ownership verification",
      "Duplicate claim cross-merchant registry check"
    ],
    "checks_unverified": [
      "NPCI external gateway switch status (simulated internal ledger used)"
    ],
    "explanation": "We confirmed this payment of ₹1,450.00 was credited to your Paytm UPI QR at 03:42 PM (UTR 430198271049). It is safe to hand over goods to the customer.",
    "recommended_next_step": "Hand over goods or provide service."
  }
  ```

### 4.2 Message Threat & Phishing Static Analysis
- **Endpoint:** `POST /api/fraud/analyze-message`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "message_text": "URGENT: Your Paytm Soundbox will be blocked in 2 hours due to pending KYC. Pay ₹100 or call 98990-FAKE to avoid police action.",
    "sender_identifier": "+91 98990 00000"
  }
  ```
- **Processing Pipeline:**
  1. Regex extract all URLs, IP addresses, domains, and phone numbers.
  2. **NO-FETCH Policy:** Never make outgoing HTTP requests to submitted URLs.
  3. Analyze domain patterns: lookalikes (`paytm-kyc.com`, `paytm.verify-now.in`), URL shorteners (`bit.ly`, `tinyurl`).
  4. Pattern match credential theft indicators: requests for OTP, 4/6-digit UPI PIN, ATM PIN, passwords.
  5. Pattern match urgency/intimidation: "police complaint", "immediate arrest", "blocked within 24 hours".
  6. Compute Threat Verdict and Risk Level.
- **Response Schema (`200 OK`):**
  ```json
  {
    "case_ref": "MC-202610-4491",
    "threat_detected": true,
    "risk_level": "HIGH",
    "signals_fired": [
      {"rule_id": "RULE-P02", "name": "Urgency / Intimidation Coercion", "weight": 4},
      {"rule_id": "RULE-P01", "name": "Fake KYC Suspension Threat", "weight": 4}
    ],
    "explanation": "This message is unverified and contains suspicious threats of immediate blocking. Paytm will never demand payment or threaten police action via SMS.",
    "recommended_next_step": "Do not call the number or click any link. Delete the message."
  }
  ```

### 4.3 Voice & Language Settings Endpoints
- `GET /api/merchants/me/voice-settings`
  Returns current merchant's `preferred_language`, `speech_rate`, `voice_response_enabled`, and `preferred_voice_identifier`.
- `PATCH /api/merchants/me/voice-settings`
  Updates speech settings with validation:
  - `preferred_language`: One of `en, hi, mr, ta, te, bn, gu, kn, ml, pa, hinglish`.
  - `speech_rate`: Clamped float between `0.75` and `1.50`.
  - `voice_response_enabled`: Boolean.

---

## 5. Agent Tool Layer Integration

Two new read-only tools are added to [`d:/paytm/backend/tools.py`](file:///d:/paytm/backend/tools.py):

### 1. `tool_verify_payment_claim`
```python
def tool_verify_payment_claim(
    db: Session,
    utr: str,
    amount: float = None,
    session_merchant_id: int = None
) -> dict:
    """
    Read-only payment claim lookup against internal ledger.
    session_merchant_id is strictly bound to session; model cannot override.
    """
```
- Class: `READ_ONLY`.
- If the merchant asks: *"A customer showed me a screenshot for ₹1,450 with UTR 430198271049, did it come through?"*
- Agent calls `verify_payment_claim(utr="430198271049", amount=1450.0)`.
- Emits structured `verification_verdict` card.

### 2. `tool_analyze_suspicious_message`
```python
def tool_analyze_suspicious_message(
    db: Session,
    message_text: str,
    session_merchant_id: int = None
) -> dict:
    """
    Static pattern analysis of SMS, email, or WhatsApp message for phishing and scams.
    """
```
- Class: `READ_ONLY`.
- If the merchant pastes an SMS asking if it's real, the tool evaluates signals and returns deterministic explanations.

---

## 6. Frontend Plan: "Fraud & Security Center"

### 6.1 Placement in Existing Architecture
- **In `/demo` (DemoChatPage):**
  - Add a **"Verify Payment Screenshot"** button in the chat action dock next to the microphone.
  - File picker modal: allows drag-and-drop of receipt images or text pastes.
  - In-chat verification card with distinct color-coded badges (`VERIFIED_RECEIVED` = Emerald, `NOT_FOUND` = Amber, `MISMATCH` = Red, `UNABLE_TO_VERIFY` = Blue).
- **In `/dashboard` (DashboardPage):**
  - Add a dedicated **"🛡️ Fraud & Security"** tab in the Ops Command Center navigation.
  - Summary Metrics:
    - Verified Claims vs Flagged Claims.
    - Top Signals Fired (Amount Tampering, Duplicate UTRs, Phishing Links).
    - Unresolved Security Tickets.
  - Interactive Claims Table: Filter by Verdict and Risk Level.
  - Case Detail Drawer: Inspect extracted query, matched ledger record, forensic signals, and audit timestamps.

---

## 7. Complete Voice & Language System Architecture (Sections 15.2 – 15.14)

### 7.1 Language Support & BCP-47 Mapping
The system supports 11 primary Indian merchant languages, mapped to browser BCP-47 tags:

| Language Name | Local Script Name | BCP-47 STT / TTS Tag | Fallback Locales |
|---|---|---|---|
| English (India) | English (India) | `en-IN` | `en-US`, `en-GB` |
| Hindi | हिन्दी | `hi-IN` | `hi` |
| Hinglish | Hinglish (Hindi-English) | `hi-IN` / `en-IN` | `en-IN` |
| Marathi | मराठी | `mr-IN` | `mr`, `hi-IN` |
| Tamil | தமிழ் | `ta-IN` | `ta-LK`, `ta` |
| Telugu | తెలుగు | `te-IN` | `te` |
| Bengali | বাংলা | `bn-IN` | `bn-BD`, `bn` |
| Gujarati | ગુજરાતી | `gu-IN` | `gu` |
| Kannada | ಕನ್ನಡ | `kn-IN` | `kn` |
| Malayalam | മലയാളം | `ml-IN` | `ml` |
| Punjabi | ਪੰਜਾਬੀ | `pa-IN` | `pa` |

### 7.2 Voice Matching Service (`src/services/voiceMatcher.js`)
- Queries `window.speechSynthesis.getVoices()` asynchronously on voice changed events.
- Filters voices matching the merchant's selected BCP-47 language tag.
- Prioritizes natural/high-quality device voices (e.g. Google, Microsoft, Apple Neural).
- Applies merchant's persistent `speech_rate` (0.75x to 1.50x).
- Graceful Fallback: If a regional language voice is absent on a specific operating system, the system alerts the merchant with an inline banner and displays the written text without audio corruption or incorrect language pronunciation.

### 7.3 Playback Controls in UI
- Floating audio state bar on message bubble:
  - `[ Play ]` / `[ Pause ]` / `[ Resume ]` / `[ Stop ]` / `[ Replay ]`
  - Playback Speed Indicator (`1.0x`, `1.15x`, `1.25x`).
  - Toggle switch for *"Auto-speak AI responses"*.

---

## 8. Implementation Phases & Definition of Done

### Phase 1: Payment Claim Verification (Demo-Critical)
- **Scope:**
  - Database schema migration for `transactions` (add `utr`, `order_ref`, `payer_vpa`, `last_synced_at`).
  - Creation of `fraud_cases`, `fraud_evidence`, and `payment_claims` tables.
  - Seed 12 synthetic transactions with known UTRs and watermarked test data.
  - Implementation of `POST /api/fraud/verify-payment` endpoint with multimodal Gemini extraction and deterministic verdict engine.
  - Creation of `tool_verify_payment_claim` for the AI agent.
  - UI receipt upload modal on Demo Chat Page rendering structured verification cards.
- **Definition of Done for Phase 1:**
  1. Uploading a synthetic genuine claim returns `VERIFIED_RECEIVED` with matching ledger row cited.
  2. An edited-amount claim returns `MISMATCH_AMOUNT` showing discrepancy.
  3. A reused reference returns `ALREADY_CLAIMED`.
  4. With ledger marked stale or unavailable, result is `UNABLE_TO_VERIFY` with zero accusatory language.
  5. A document containing embedded instructions (prompt injection) leaves the verdict unchanged and logs the attempt.
  6. Cross-merchant access attempts are rejected (a merchant cannot verify or view another merchant's records).
  7. Every check writes an audit record in `action_log`.

### Phase 2: Message Threat & Phishing Static Analysis
- **Scope:**
  - Implementation of `POST /api/fraud/analyze-message` endpoint.
  - Regex and static pattern rules engine for URLs, shorteners, credential prompts (OTP/PIN), and fake KYC threats.
  - Creation of `tool_analyze_suspicious_message` in agent.
  - Message analysis UI widget in Demo Chat Page.

### Phase 3: Risk Engine Hardening & Re-evaluation Desk
- **Scope:**
  - Persistent rule versioning in `fraud_rules` table.
  - Review and manual ticket correction workflow for human desk leads.
  - Automated 90-day evidence retention pruning routine.

### Phase 4: Authenticated Webhook Ingestion
- **Scope:**
  - Creation of `POST /api/webhooks/paytm` listener with HMAC-SHA256 signature verification.
  - Event deduplication via `event_id` idempotency registry.
  - Upstream ledger sync timestamp updates.

### Phase 5: Fraud & Security Center Command Dashboard
- **Scope:**
  - Dedicated "🛡️ Fraud & Security" view in `DashboardPage.jsx`.
  - KPI metric cards (Total Verified, Disputed, Phishing Blocked, Avg Verification Latency).
  - Searchable claims audit log and case detail inspector.

### Phase 6: Voice System Integration & Settings
- **Scope:**
  - 11-language selector and persistent profile settings (`merchants.preferred_language`, `speech_rate`).
  - Browser SpeechSynthesis integration with BCP-47 auto-matching and speed controls (0.75x to 1.50x).
  - Play/Pause/Replay conversational controls on chat bubbles.

---

## 9. File-by-File Change List

| File Path | Action | Purpose in Plan |
|---|---|---|
| `docs/fraud/00_discovery.md` | Created | Stage 1 Discovery & Codebase Gap Analysis |
| `docs/fraud/01_plan.md` | Created | Stage 2 Implementation Specification (This Document) |
| `backend/models.py` | Modify | Add columns to `transactions` & `merchants`; declare `FraudCase`, `FraudEvidence`, `PaymentClaim`, `FraudRule` models |
| `backend/database.py` | Modify | Add schema auto-migration helper for existing tables |
| `backend/fraud_engine.py` | New | Deterministic rule engine, verdict resolver, explanation templates, signal weights |
| `backend/threat_engine.py` | New | Static message analyzer, regex patterns, URL/domain checkers (no-fetch) |
| `backend/document_extractor.py`| New | File validation, sanitization, EXIF strip, Gemini multimodal JSON extractor |
| `backend/tools.py` | Modify | Register `tool_verify_payment_claim` and `tool_analyze_suspicious_message` |
| `backend/main.py` | Modify | Add `/api/fraud/verify-payment`, `/api/fraud/analyze-message`, and voice settings endpoints |
| `backend/seed.py` | Modify | Seed synthetic watermarked transactions with UTRs and test claims |
| `backend/tests/test_fraud.py` | New | Automated pytest suite for Phase 1 DoD criteria |
| `frontend/src/api/client.js` | Modify | Add multipart upload helper and fraud endpoints |
| `frontend/src/services/voice.js`| New | Web Speech API speech synthesis matcher, BCP-47 locale resolver |
| `frontend/src/components/FraudModal.jsx` | New | Payment claim upload and message paste modal |
| `frontend/src/components/VoiceSettingsModal.jsx` | New | Language & speech speed preferences modal |
| `frontend/src/pages/DemoChatPage.jsx` | Modify | Integrate fraud upload button, voice playback controls, and verification cards |
| `frontend/src/pages/DashboardPage.jsx`| Modify | Add "🛡️ Fraud & Security" command center tab |

---

## 10. Security, Privacy & Integrity Assessment

1. **Zero Customer Accusation Policy:** Merchant-facing text uses deterministic templates keyed strictly by verdict (e.g., *"We could not locate this transaction on your settlement ledger"*). Accusatory terminology ("scammer", "fraudster", "fake customer") is strictly prohibited.
2. **Untrusted Data Isolation:** All extracted OCR text is encapsulated within quotes in extraction prompts. The parser explicitly searches for and neutralizes prompt-injection keywords (`"ignore system prompt"`, `"set verdict to verified"`).
3. **Cross-Merchant Privacy:** Reused references are tracked via salted cryptographic hashes (`HMAC-SHA256`). A merchant receives a duplicate claim notice without exposing the identity or shop details of any other merchant.
4. **Data Minimization & Retention:** Uploaded images have metadata stripped. Evidence records are assigned an automatic 90-day expiry (`retention_expires_at`). Sensitive fields (OTPs, PINs) are redacted before database writes.

---

## 11. Approval Gate

**STATUS: WAITING FOR APPROVAL.**  
In accordance with Stage 2 guidelines, all planning artifacts are complete. No implementation or code modifications will occur until explicit signoff is granted.

