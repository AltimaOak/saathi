# STAGE 1: DISCOVERY REPORT — FRAUD & PAYMENT VERIFICATION CAPABILITY

**Project:** Saathi — Autonomous AI Teammate for Paytm Merchants  
**Repository Architecture:** React 18 SPA (Vite + Tailwind) + FastAPI Backend (SQLAlchemy + Neon PostgreSQL + Gemini 2.5)  
**Discovery Date:** 2026-10-31  
**Author:** Principal FinTech Security Architect & Senior Full-Stack Engineer  
**Status:** STAGE 1 COMPLETE (Read-Only Codebase Inspection — No Feature Code Modified)

---

## 1. Executive Summary & Core Principle Alignment

### Core Verification Principle
> **A screenshot, invoice, message, or customer statement is NEVER proof of payment.**  
> OCR and image extractions only produce an untrusted search query.  
> ONLY trusted backend records (internal transaction ledger, cryptographically verified webhooks, or authenticated banking switches) can confirm that a payment was received.  
> If no trusted verification source is available, the result MUST strictly be `UNABLE_TO_VERIFY` — never "verified" and never "fraud".

### Key Discovery Findings
1. **Existing Verification Sources:** Currently, the **only** existing trusted source in the repository is the local relational database table `transactions`. There are **zero** external Paytm API integrations, **zero** bank/IMPS gateway integrations, **zero** NPCI switch connections, and **zero** webhook receivers. All existing tools referencing IMPS, NPCI, or Soundbox repairs are deterministic local state mutations and simulations.
2. **Transaction Ledger Schema Gaps:** The current `transactions` table contains only `(id, merchant_id, amount, payer, mode, status, created_at)`. It lacks critical banking identifiers: **no UTR (Unique Transaction Reference)**, **no order/reference ID**, **no payer VPA/account number**, and **no ledger synchronization timestamp**.
3. **Upload & OCR Capability:** There is currently **zero** file upload handling, **zero** multipart ingestion endpoints, and **zero** OCR/computer vision dependencies (no Pillow, no pytesseract, no OpenCV) in the backend.
4. **Security & Authorization Gaps:** Merchant identification is currently passed via unauthenticated request parameters (`req.merchant_id` in `/api/chat/stream` and `/api/merchants/{id}/overview`). Tool calls permit LLM-supplied `merchant_id` without strict session binding.
5. **Voice & Language System:** Speech recognition exists via `window.SpeechRecognition` (supporting only English, Hindi, and Marathi), with Web Audio API chime synthesis. However, **zero Text-to-Speech (TTS) audio synthesis**, **zero playback controls**, **zero speech rate controls**, and **zero persistent merchant voice preferences** currently exist.

---

## 2. Project Map

### 2.1 Entry Points
| Layer | Entry File | Path | Verified Functionality |
|---|---|---|---|
| Backend Server | `main.py` | [`d:/paytm/backend/main.py#L33-L88`](file:///d:/paytm/backend/main.py#L33-L88) | FastAPI app factory, CORS middleware, startup auto-seeding (`init_db_and_seed`). |
| Serverless API | `index.py` | [`d:/paytm/api/index.py#L1-L14`](file:///d:/paytm/api/index.py#L1-L14) | ASGI entrypoint wrapping `backend.main:app` for Vercel Serverless Functions. |
| Frontend Shell | `index.html` | [`d:/paytm/frontend/index.html#L1-L18`](file:///d:/paytm/frontend/index.html#L1-L18) | Single Page Application HTML root with `#root` container. |
| React Bootstrap | `main.jsx` | [`d:/paytm/frontend/src/main.jsx#L1-L11`](file:///d:/paytm/frontend/src/main.jsx#L1-L11) | Mounts `<App />` within `React.StrictMode`. |
| Router Root | `App.jsx` | [`d:/paytm/frontend/src/App.jsx#L1-L32`](file:///d:/paytm/frontend/src/App.jsx#L1-L32) | React Router v6 setup with AuthProvider, Navbar, Footer, and 4 top-level routes (`/`, `/login`, `/demo`, `/dashboard`). |

### 2.2 Routers & API Endpoints
All endpoints are declared in [`d:/paytm/backend/main.py`](file:///d:/paytm/backend/main.py):

| Method | Endpoint | Lines | Function | Auth / Security Mechanism |
|---|---|---|---|---|
| `GET` | `/` | L131-L140 | API Service Status & Version | None (Public) |
| `GET` | `/api/health` | L143-L154 | Health check + DB ping + Gemini model name | None (Public) |
| `POST` | `/api/chat/stream` | L156-L173 | SSE token & action streaming for AI agent | Relies on body `merchant_id`; no cryptographic auth |
| `POST` | `/api/auth/login` | L175-L194 | Merchant demo login by ID + OTP (`123456`/`4821`) | Hardcoded demo OTP validation; returns plain JSON |
| `POST` | `/api/auth/register` | L196-L236 | New merchant registration + default Soundbox | None |
| `GET` | `/api/merchants` | L238-L255 | List all merchants | None (Public) |
| `GET` | `/api/merchants/{id}/overview` | L257-L320 | Store summary, transactions, settlements | Unchecked path param `merchant_id` |
| `GET` | `/api/dashboard/summary` | L322-L362 | Ops Cluster high-level KPI cards | None (Internal Ops) |
| `GET` | `/api/dashboard/timeseries` | L364-L398 | 7-day Saathi vs Human volume resolution | None (Internal Ops) |
| `GET` | `/api/actions` | L400-L434 | 50 recent execution records from `action_log` | None (Internal Ops) |
| `GET` | `/api/events` | L436-L496 | Non-blocking live poller for new actions & tickets | None (Internal Ops) |
| `GET` | `/api/tickets` | L498-L513 | Needs human priority cases | None (Internal Ops) |
| `POST` | `/api/tickets/{id}/take` | L515-L522 | Mark ticket status as 'taken' | None |
| `GET` | `/api/leads` | L524-L541 | Sales Leads Kanban groupings (new/talking/booked) | None |
| `PATCH` | `/api/leads/{id}/stage` | L543-L552 | Update lead stage | Input validation on `stage` |
| `POST` | `/api/reset` | L554-L557 | Reseed database to demo state | None |

### 2.3 Services & Logic Modules
- **Agent Reasoning & Streaming Service:** [`d:/paytm/backend/agent.py`](file:///d:/paytm/backend/agent.py)
  - `stream_chat` (L238–L565): Manages conversation history, Gemini 2.5 streaming, multi-round tool-calling loop (up to 6 rounds), rate limiting (20 msgs/60s), and sentiment-triggered escalation.
  - `stream_fallback_playbook` (L42–L234): Deterministic rule-based fallback when Gemini API key is unset or quota fails.
- **Tool Execution Service:** [`d:/paytm/backend/tools.py`](file:///d:/paytm/backend/tools.py)
  - `run_tool` (L598–L640): Dynamic tool dispatcher with error catching, transaction rollback, and `action_log` persistence.
  - `TOOL_REGISTRY` (L570–L596): Map of 16 tool functions exposed to the agent.
- **Database Engine & Fallback:** [`d:/paytm/backend/database.py`](file:///d:/paytm/backend/database.py)
  - Driver auto-detection (psycopg v3 vs psycopg2), connection pool pre-ping, and `/tmp/dev_fallback.db` SQLite fallback for serverless environments.
- **Frontend Live Adapter:** [`d:/paytm/frontend/src/api/mock.js`](file:///d:/paytm/frontend/src/api/mock.js)
  - Client-side data access layer connecting frontend to backend endpoints with fallback data generation.
- **Frontend HTTP Client:** [`d:/paytm/frontend/src/api/client.js`](file:///d:/paytm/frontend/src/api/client.js)
  - `fetchJson` and `streamChat` SSE parser using `ReadableStreamDefaultReader` and `TextDecoder`.

### 2.4 DB Models and Migrations
Declared in [`d:/paytm/backend/models.py`](file:///d:/paytm/backend/models.py):
- `Merchant` (L5–L24): Merchant profile details.
- `Settlement` (L25–L36): Merchant payout batches.
- `Refund` (L37–L48): Failed/retried customer refunds.
- `Transaction` (L49–L61): Incoming QR payment records.
- `Soundbox` (L62–L74): 4G IoT hardware telemetry.
- `Loan` (L75–L85): Pre-sanctioned credit products.
- `Lead` (L86–L96): Field sales opportunities.
- `Ticket` (L97–L106): Human escalation queue.
- `ActionLog` (L107–L118): Immutable audit trail of agent executions.
- `Message` (L119–L127): Chat history messages per session.
- `Session` (L128–L137): Session metadata, reply latency, and outcome (`solved_by_ai` vs `handed_to_human`).
- **Migrations Status:** **MISSING**. No Alembic configuration or migration files exist. Schema creation relies entirely on SQLAlchemy `Base.metadata.create_all(bind=engine)`.

### 2.5 Auth & Session Handling
- **Backend:** `POST /api/auth/login` checks `req.merchant_id` against `merchants` table and verifies demo OTP `123456` or `4821`. No JWT token or session cookies are issued.
- **Frontend:** [`d:/paytm/frontend/src/context/AuthContext.jsx#L1-L236`](file:///d:/paytm/frontend/src/context/AuthContext.jsx#L1-L236) stores merchant profile in browser `localStorage` under key `saathi_current_merchant`.
- **Session IDs:** Created client-side via `sessionStorage.getItem('saathi_chat_session_id')` or generated with `sess-${Date.now()}` in [`d:/paytm/frontend/src/api/mock.js#L163-L174`](file:///d:/paytm/frontend/src/api/mock.js#L163-L174).

### 2.6 SSE & Real-Time Event Code
- **Streaming Protocol:** Standard Server-Sent Events (`text/event-stream`). Emits chunk types:
  - `action`: Emitted before tool execution with action summary and timestamp.
  - `card`: Emitted after tool execution with structured UI payload.
  - `text`: Emitted for token-by-token LLM conversational responses.
  - `status`: Emitted with `solved_by_ai` or `handed_to_human`.
  - `done`: Stream termination signal.
- **Dashboard Poller:** `/api/events?after={id}` polled on a 2-second interval with exponential backoff up to 10s.

### 2.7 Upload Handling
- **Status:** **MISSING (None)**. There is no file upload router, no `UploadFile` endpoint, no multipart form parser, and no cloud storage adapter (S3/GCS/Blob).

### 2.8 Notification & Escalation Code
- **Rule-Based Trigger 1 (Amount Limit):** In [`d:/paytm/backend/tools.py#L179-L196`](file:///d:/paytm/backend/tools.py#L179-L196) and [`L276-L292`](file:///d:/paytm/backend/tools.py#L276-L292): Any settlement or refund exceeding `AI_LIMIT` (default ₹10,000) automatically creates an open `Ticket` with `priority="high"` and flags `needs_human: True`.
- **Rule-Based Trigger 2 (Sentiment & Anger):** In [`d:/paytm/backend/agent.py#L25-L28`](file:///d:/paytm/backend/agent.py#L25-L28) and [`L290-L328`](file:///d:/paytm/backend/agent.py#L290-L328): Regex search for keywords (`fraud`, `scam`, `police`, `legal`, `dhoka`, `chor`, `complaint`, etc.) creates a high-priority ticket and routes the ticket to the Ops Command Center.
- **Assignment:** [`d:/paytm/backend/main.py#L515`](file:///d:/paytm/backend/main.py#L515) allows human desk officers to claim tickets (`status="taken"`).

### 2.9 Audit Logging
- **Database Table:** `action_log` in [`d:/paytm/backend/models.py#L107-L118`](file:///d:/paytm/backend/models.py#L107-L118).
- **Execution Hook:** Captured by `run_tool()` in [`d:/paytm/backend/tools.py#L626-L635`](file:///d:/paytm/backend/tools.py#L626-L635). Every tool invocation logs `(time, merchant_id, tool, input_json, result_json, status, summary)`.
- **Visibility:** Rendered on the Ops Cluster dashboard table via `/api/actions`.

### 2.10 Voice & Language Settings
- **Speech Recognition (STT):** [`d:/paytm/frontend/src/pages/DemoChatPage.jsx#L310-L325`](file:///d:/paytm/frontend/src/pages/DemoChatPage.jsx#L310-L325) instantiates `window.SpeechRecognition || window.webkitSpeechRecognition`. Sets `rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'`.
- **Audio Chime:** Synthesized in browser memory via Web Audio API oscillators in [`d:/paytm/frontend/src/api/mock.js#L22-L49`](file:///d:/paytm/frontend/src/api/mock.js#L22-L49).
- **Text-to-Speech (TTS):** **MISSING**. No `window.speechSynthesis` or audio playback of the AI's response text exists.
- **Language Scope:** Restricted to 3 languages in the UI (`en`, `hi`, `mr`). Missing Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, and Hinglish.
- **Speech Rate & Voice Picker:** **MISSING**.
- **Database Persistence:** `Merchant.language` exists, but there are no fields for `preferred_language`, `voice_response_enabled`, `speech_rate`, or `preferred_voice_identifier`.

### 2.11 Tests & Test Infrastructure
- **Manual Integration Script:** [`d:/paytm/backend/test_chat.py`](file:///d:/paytm/backend/test_chat.py) executes 8 deterministic test scenarios against the database and Gemini API.
- **Automated Test Suites (pytest/unittest):** **MISSING**.
- **Frontend Test Suites (vitest/jest):** **MISSING**.
- **Screenshot Automation:** Puppeteer scripts in `frontend/take-screenshots.js`.

### 2.12 Deployment Configuration
- **Vercel Serverless Monorepo:** [`d:/paytm/vercel.json`](file:///d:/paytm/vercel.json) routes `/api/*` to `api/index.py` (FastAPI) and `/*` to `frontend/dist/index.html` (Vite SPA).
- **Environment Exclusions:** [`.vercelignore`](file:///d:/paytm/.vercelignore) ignores local virtual environments, test scripts, and database files.
- **Local Startup Scripts:** `run-backend.bat`, `run-backend.ps1`, `backend/run.bat`, `backend/run.ps1`.

---

## 3. Inventory of Transaction, Settlement, Refund & Webhook Data

### 3.1 Existing Data Tables & Schema

#### `transactions` Table
| Column Name | Data Type | Nullable | Primary/Foreign Key | Description |
|---|---|---|---|---|
| `id` | `Integer` | No | Primary Key | Internal autoincrement ID |
| `merchant_id` | `Integer` | No | FK → `merchants.id` (Indexed) | Owning merchant ID |
| `amount` | `Float` | No | None | Payment amount in INR |
| `payer` | `String(128)` | No | None | Customer display name (e.g., "Rahul Sharma") |
| `mode` | `String(64)` | No | None | Payment instrument (defaults to "UPI QR") |
| `status` | `String(32)` | No | None | Payment status (seeded as "success") |
| `created_at` | `DateTime` | No | None | Transaction timestamp (naive IST) |

**Critical Gaps in `transactions`:**
- **No UTR / RRN Column:** Cannot query payments by bank reference number or 12-digit NPCI RRN.
- **No Order ID / Reference ID:** Cannot cross-reference merchant invoices or order tokens.
- **No Payer VPA / Account:** Cannot verify if the claiming VPA matches the payer.
- **No Freshness / Ledger Sync Field:** No `last_synced_at` timestamp.

#### `settlements` Table
| Column Name | Data Type | Nullable | Primary/Foreign Key | Description |
|---|---|---|---|---|
| `id` | `Integer` | No | Primary Key | Settlement batch ID |
| `merchant_id` | `Integer` | No | FK → `merchants.id` | Owning merchant ID |
| `amount` | `Float` | No | None | Settlement payout amount |
| `status` | `String(32)` | No | None | Status: `paid`, `held`, `pending` |
| `reason` | `String(256)` | No | None | Failure/hold reason text |
| `created_at` | `DateTime` | No | None | Creation timestamp |

*Note: In `tool_reroute_settlement_imps`, a synthetic UTR is generated on the fly (`f"IMPS{s.id}{now_ist().strftime('%M%S')}"`), but it is not stored in the database.*

#### `refunds` Table
| Column Name | Data Type | Nullable | Primary/Foreign Key | Description |
|---|---|---|---|---|
| `id` | `Integer` | No | Primary Key | Refund batch ID |
| `merchant_id` | `Integer` | No | FK → `merchants.id` | Owning merchant ID |
| `amount` | `Float` | No | None | Refund amount in INR |
| `status` | `String(32)` | No | None | Status: `failed`, `retrying`, `done` |
| `upi_ref` | `String(64)` | No | None | Simulated UPI reference (e.g. `UPI4821937710`) |
| `created_at` | `DateTime` | No | None | Creation timestamp |

#### `webhooks` Table
- **Status:** **MISSING (None)**. No webhook table, model, or event log exists.

### 3.2 Data Freshness & Sync Tracking
- **Current State:** The database does **not** track when ledger data was last synchronized with an upstream banking switch.
- **Requirement Violation:** The target design requires displaying `"ledger last synced at"` and forbidding a `NOT_FOUND` verdict unless the ledger freshness check passes. Currently, no timestamp exists to validate whether the ledger is fresh or stale.

---

## 4. Verification Sources Assessment

| Verification Source | Claimed Role | Real Status in Codebase | Concrete Evidence / Reference |
|---|---|---|---|
| **Internal Database Ledger** | Query transactions by merchant ID | **VERIFIED (Partial Schema)** | Queryable via `db.query(Transaction)` in [`d:/paytm/backend/tools.py#L221-L243`](file:///d:/paytm/backend/tools.py#L221-L243). Lacks UTR and reference fields. |
| **Razorpay IFSC Registry** | Bank branch lookup from IFSC | **VERIFIED (Live Public API)** | HTTP GET to `https://ifsc.razorpay.com/{ifsc}` in [`d:/paytm/backend/tools.py#L123`](file:///d:/paytm/backend/tools.py#L123). |
| **Paytm Core Merchant API** | Payout verification, merchant balances | **MISSING (Simulated)** | No credentials, endpoints, or client libraries. All behavior simulated. |
| **NPCI Fast-Track UPI Gateway** | Real-time UPI reversal/re-query | **MISSING (Simulated)** | Simulated state update in `tool_retry_refund` ([`d:/paytm/backend/tools.py#L294`](file:///d:/paytm/backend/tools.py#L294)). |
| **Bank IMPS Payout Switch** | 24x7 instant payout rail | **MISSING (Simulated)** | Synthetic UTR generation in `tool_reroute_settlement_imps` ([`d:/paytm/backend/tools.py#L210`](file:///d:/paytm/backend/tools.py#L210)). |
| **Soundbox IoT Telemetry Layer** | Remote device hardware ping | **MISSING (Simulated)** | DB row updates on `soundboxes` table in [`d:/paytm/backend/tools.py#L333`](file:///d:/paytm/backend/tools.py#L333). |
| **Authenticated Webhooks** | Real-time payment notifications | **MISSING** | Zero webhook listeners, verification routes, or signature validators. |

---

## 5. Security, Authorization & Policy Enforcement

### 5.1 Merchant Ownership Enforcement
- **Inspection Finding:** **PARTIAL / WEAK**.
- In [`d:/paytm/backend/main.py#L257`](file:///d:/paytm/backend/main.py#L257), `merchant_overview(merchant_id: int)` allows any caller to pass any integer ID in the URL path and view store transactions, settlements, and loans without authorization checks.
- In [`d:/paytm/backend/tools.py#L609-L617`](file:///d:/paytm/backend/tools.py#L609-L617), `run_tool` injects `merchant_id` **only if** `"merchant_id" not in call_args`. If the model or input maliciously supplies `call_args["merchant_id"] = 2`, it can query another merchant's transactions.
- **Required Hardening:** The authenticated merchant profile must be enforced at the API route layer and passed as an immutable context to all fraud verification routines.

### 5.2 Safe Limits & Thresholds
- **Inspection Finding:** **VERIFIED**.
- `AI_LIMIT` environment variable is enforced in code:
  - Settlements > ₹10,000 reject autonomous execution and create a Ticket ([`tools.py#L180`](file:///d:/paytm/backend/tools.py#L180)).
  - Refunds > ₹10,000 reject autonomous retry and create a Ticket ([`tools.py#L277`](file:///d:/paytm/backend/tools.py#L277)).

### 5.3 Idempotency Enforcement
- **Inspection Finding:** **MISSING**.
- There are no idempotency keys, headers, or replay detection mechanisms in the API or tools layer. Re-sending identical requests executes duplicate database actions.

---

## 6. Document Upload & OCR Capability Assessment

| Component | Target Capability | Current Codebase State | Status |
|---|---|---|---|
| Ingestion Router | Upload endpoint for payment screenshots / receipts | Zero endpoints exist for multipart upload | **MISSING** |
| File Validation | Magic byte inspection, mime allowlist (JPEG, PNG, PDF), size limits | No upload validation logic exists | **MISSING** |
| Image Processing | Sanitization, re-encoding to strip EXIF & metadata | No image manipulation libraries installed (`PIL`/`Pillow` missing) | **MISSING** |
| OCR Engine | Text extraction from UPI receipts, SMS, and QR slips | No OCR engine installed (`pytesseract`/`easyocr` missing) | **MISSING** |
| Prompt-Injection Defense | Treat document content strictly as data, never instructions | No defense layer exists | **MISSING** |
| Secure Storage | Isolated directory with hash-based access control | No upload storage folder exists | **MISSING** |

---

## 7. Comprehensive Gap Analysis Matrix

| Feature / Requirement | Current Codebase Status | Classification | File & Line Reference | Notes & Remediation Needed |
|---|---|---|---|---|
| **Payment Verification Engine** | None | **MISSING** | None | Must build deterministic verification service against trusted records. |
| **Verification Verdicts (`VERIFIED_RECEIVED`, `NOT_FOUND`, etc.)** | None | **MISSING** | None | Must implement strictly typed verdict enumeration with mandatory explanation templates. |
| **Deterministic Risk Engine (LOW, MED, HIGH, CRITICAL)** | None | **MISSING** | None | Must build rule engine where weights and signals compute score, not the LLM. |
| **Transaction Table UTR / Reference ID** | Absent in schema | **MISSING** | [`backend/models.py#L49-L61`](file:///d:/paytm/backend/models.py#L49-L61) | Add `utr`, `order_ref`, `payer_vpa`, `synced_at` columns. |
| **Ledger Freshness Tracking** | Absent | **MISSING** | [`backend/models.py#L49-L61`](file:///d:/paytm/backend/models.py#L49-L61) | Must store "ledger last synced at" to guard `NOT_FOUND` verdicts. |
| **Hashed Reference Registry (Duplicate Detection)** | None | **MISSING** | None | Add `payment_claims` table with hashed references to flag `ALREADY_CLAIMED`. |
| **Fraud Cases & Evidence Tables** | None | **MISSING** | None | Create `fraud_cases` and `fraud_evidence` tables with retention controls. |
| **Document Upload & OCR Pipeline** | None | **MISSING** | None | Implement secure upload endpoint with format validation and OCR query extractor. |
| **Anti-Prompt-Injection Safeguards** | None | **MISSING** | None | Strictly isolate extracted text as data payload; detect and ignore embedded instructions. |
| **Message Threat & Phishing Static Analyzer** | None | **MISSING** | None | Build regex/domain analyzer for URLs, shorteners, fake KYC, and credential threats. |
| **Merchant Identity Isolation** | Weak in tools | **PARTIAL** | [`backend/tools.py#L609-L617`](file:///d:/paytm/backend/tools.py#L609-L617) | Force merchant context from authenticated session; forbid caller overrides. |
| **Execution Limit Enforcement** | Active for settlements/refunds | **VERIFIED** | [`backend/tools.py#L24-L28`](file:///d:/paytm/backend/tools.py#L24-L28) | Read-only risk class for all fraud tools. |
| **Voice Speech Recognition (STT)** | Supported for 3 langs | **PARTIAL** | [`frontend/src/pages/DemoChatPage.jsx#L310`](file:///d:/paytm/frontend/src/pages/DemoChatPage.jsx#L310) | Limited to en, hi, mr; lacks 11-language support. |
| **Voice Speech Synthesis (TTS)** | Absent | **MISSING** | [`frontend/src/pages/DemoChatPage.jsx#L392`](file:///d:/paytm/frontend/src/pages/DemoChatPage.jsx#L392) | Only plays chime. Must implement `SpeechSynthesis` voice matcher. |
| **Adjustable Speech Speed & Controls** | Absent | **MISSING** | None | Provide 0.75x–1.50x speed controls and audio play/pause/replay controls. |
| **Merchant Voice Profile Persistence** | Only `language` string | **PARTIAL** | [`backend/models.py#L12`](file:///d:/paytm/backend/models.py#L12) | Add `preferred_language`, `voice_response_enabled`, `speech_rate`, `preferred_voice_identifier`. |
| **External Banking Switch Integrations** | Simulated / IFSC only | **SIMULATED** | [`backend/tools.py#L123-L219`](file:///d:/paytm/backend/tools.py#L123-L219) | Label all simulated sources explicitly in code, UI, and data. |
| **Automated Testing Suite** | Manual script only | **MISSING** | [`backend/test_chat.py`](file:///d:/paytm/backend/test_chat.py) | Build synthetic test fixtures and pytest test suite. |

---

## 8. Specific Items Requiring User Confirmation (UNKNOWNs)

1. **OCR Extraction Engine Choice:**
   - In serverless / Windows environments, should we integrate Google Gemini Vision (`gemini-2.5-flash` with strict JSON schema) as the primary multimodal extractor for receipt images/PDFs, or introduce local `pytesseract` with system Tesseract binaries?
   *(Recommendation: Gemini Multimodal Vision API is already authenticated in this repo via `GEMINI_API_KEY`, runs with zero host binary dependencies, and reliably extracts structured JSON from Hindi/English Indian UPI receipts).*
2. **Synthetic Data Seeding for Verification:**
   - Should we augment `seed.py` with known synthetic transactions (including genuine UTRs, conflicting amounts, and wrong recipient UPI IDs) to power immediate Phase 1 testing and demos?
   *(Recommendation: Yes, augment `seed.py` with clearly watermarked "SYNTHETIC TEST" records).*

---

## 9. Conclusion & Next Steps

Stage 1 Discovery is complete. **Zero feature code has been modified during this stage.**  
The repository is fully mapped, all schema and architectural gaps are identified with line citations, and the core verification principles are firmly established.

Awaiting approval to proceed to **STAGE 2: PLAN** (producing the architecture plan artifact and `docs/fraud/01_plan.md`).

