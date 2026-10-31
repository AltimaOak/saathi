# Saathi — Autonomous AI Teammate for Paytm Merchants

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1.svg?style=flat&logo=postgresql)](https://neon.tech)
[![Gemini 2.5](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-4285F4.svg?style=flat&logo=google)](https://aistudio.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)

**Saathi** is an action-oriented, autonomous AI operations teammate built specifically for Paytm merchants across tier-1, tier-2, and tier-3 Indian cities. Unlike traditional conversational chatbots that only answer generic FAQ questions or create unmonitored support tickets, Saathi takes **direct, authenticated system actions** inside the core Paytm merchant ecosystem:

1. **Instant IMPS Payout Routing**: Automatically unblocks stuck daily settlements and re-routes payouts directly to the merchant's verified bank account via the 24x7 IMPS rail.
2. **Real-Time KYC & IFSC Validation**: Verifies banking branch IFSC codes against live Reserve Bank of India (RBI) / Razorpay registries to resolve name mismatch holds.
3. **NPCI Fast-Track UPI Refund Reversal**: Re-queries failed customer UPI transactions and triggers immediate reversals via the NPCI auto-reversal gateway within 5 minutes.
4. **Remote Soundbox IoT Diagnostics & Self-Healing**: Connects to the Soundbox 4G IoT telemetry layer, inspects battery and network signals, reboots firmware, and triggers over-the-air test chimes.
5. **Collection-Backed Merchant Micro-Loans**: Analyzes 60-day UPI QR transaction cash flows to pre-approve and digitally sanction shop loans up to ₹2,00,000 with scheduled field desk biometric visits.
6. **Safety Thresholds & Human Handoffs**: Automatically intercepts disputes exceeding ₹10,000, uncharged hardware faults, or distressed/legal queries, seamlessly routing them to Senior Human Desk Leads with context-rich priority tickets.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Environment Configuration (`.env`)](#environment-configuration-env)
- [Quick Start Guide](#quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI + Neon DB)](#backend-setup-fastapi--neon-db)
  - [Frontend Setup (React 18 + Vite)](#frontend-setup-react-18--vite)
- [Pre-Seeded Merchant Personas & Test Scenarios](#pre-seeded-merchant-personas--test-scenarios)
- [Automated Integration Test Suite](#automated-integration-test-suite)
- [Database Schema (11 Relational Models)](#database-schema-11-relational-models)
- [Autonomous AI Tool Registry (17 Tools)](#autonomous-ai-tool-registry-17-tools)
- [Streaming Protocol (Server-Sent Events)](#streaming-protocol-server-sent-events)
- [REST API Reference](#rest-api-reference)
- [Safety & Guardrails Architecture](#safety--guardrails-architecture)
- [Troubleshooting & Common Questions](#troubleshooting--common-questions)

---

## System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │           Single Root Config (.env)          │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         ▼                                                               ▼
             ┌───────────────────────┐                                       ┌───────────────────────┐
             │   Frontend (React)    │                                       │   Backend (FastAPI)   │
             │   Port: 3000 / 5173   │                                       │      Port: 8000       │
             └───────────┬───────────┘                                       └───────────┬───────────┘
                         │                                                               │
                         │  1. SSE Stream: POST /api/chat/stream                         │
                         │  2. Live Action Polling: GET /api/events                      │
                         │  3. Operations KPIs & Timeseries: GET /api/dashboard/*        │
                         │  4. Escalation Desk Queue: GET /api/tickets                   │
                         └───────────────────────────────────────────────────────────────┤
                                                                                         │
                                                         ┌───────────────────────────────┴───────────────────────────────┐
                                                         ▼                                                               ▼
                                            ┌────────────────────────┐                                     ┌────────────────────────┐
                                            │    Neon PostgreSQL     │                                     │   Google Gemini API    │
                                            │  (SQLAlchemy + Psycopg)│                                     │   (gemini-2.5-flash)   │
                                            └────────────────────────┘                                     └────────────────────────┘
                                                         │                                                               │
                                                         ▼                                                               ▼
                                            ┌────────────────────────┐                                     ┌────────────────────────┐
                                            │ 11 Relational Tables   │                                     │ Manual Function Calls  │
                                            │ - merchants            │                                     │ (17 Tool Declarations) │
                                            │ - settlements/refunds  │                                     │ Zero Execution Leakage │
                                            │ - soundboxes, loans    │                                     │ Deterministic Fallback │
                                            │ - action_log, tickets  │                                     └────────────────────────┘
                                            └────────────────────────┘
```

### Architectural Highlights

- **Single Unified Environment**: A single `.env` at the project root configures both frontend and backend. Vite reads it via `envDir: '..'`, while Python's `python-dotenv` searches both the local directory and parent root.
- **Manual Function Calling**: Gemini returns structured tool calls (`FunctionCall`), which FastAPI validates and executes inside isolated database transactions before feeding results back into the model.
- **Deterministic Playbook Fallback**: If `GEMINI_API_KEY` is omitted or quota is exhausted, the backend automatically transitions to deterministic playbook execution, running real database tools and streaming actions without breaking.
- **Real-Time Synchronisation**: Every tool execution generates an `action_log` entry. The frontend `/dashboard` continuously syncs using both window custom events (`saathi:new_action`) and non-blocking event polling (`/api/events?after=<id>`), reflecting actions in under 2 seconds.

---

## Tech Stack

### Frontend (`frontend/`)
- **React 18.3.1**: Component-driven architecture using functional components and hooks.
- **Vite 6.0**: Lightning-fast bundler with Hot Module Replacement (HMR).
- **Tailwind CSS 3.4**: Custom Indian fintech color palette:
  - Deep Navy: `#0B1B3F`
  - Royal Blue: `#002970`
  - Paytm Sky Blue: `#00B9F5`
  - Sunny Yellow: `#FFC845`
  - Soft Card Blue: `#EAF4FD`
- **Typography**: Google Fonts — `Bricolage Grotesque` (bold typographic headings) and `DM Sans` (legible body copy).
- **Framer Motion**: Micro-interactions, spring physics, and slide-in verification checklists.
- **Recharts**: Operations volume charts and 7-day automated resolution breakdowns.
- **Browser APIs**: Web Speech API (voice synthesis and recognition) and Web Audio API (synthetic Paytm Soundbox chime generation).

### Backend (`backend/`)
- **Python 3.10**: Strictly compatible with Python 3.10.x runtime (no Python 3.11+ exclusive constructs).
- **FastAPI**: Asynchronous ASGI framework for SSE chat streaming and REST endpoints.
- **Uvicorn**: High-performance ASGI server with live reloading.
- **SQLAlchemy 2.0**: Modern declarative ORM with relational mapping.
- **Psycopg 3 (`psycopg[binary]`)**: Next-generation PostgreSQL driver configured with `pool_pre_ping=True`, `pool_size=5`, and `pool_recycle=300` to prevent dropouts on idle serverless Neon instances.
- **Google GenAI SDK (`google-genai`)**: Official client for Gemini 2.5 Flash with manual tool declaration.
- **Timezone Safety**: Strict Asia/Kolkata naive datetimes via the `now_ist()` helper across all timestamps, chart buckets, and log entries.

---

## Repository Layout

```
paytm/
├── .env                        # Single root configuration file
├── .env.example                # Sample environment template
├── .gitignore                  # Git ignore rules for venv, node_modules, dist, .env
├── README.md                   # Complete system documentation (this file)
│
├── frontend/                   # React 18 Application
│   ├── index.html              # Main HTML entry point with Google Fonts
│   ├── package.json            # Node.js dependencies and scripts
│   ├── tailwind.config.js      # Custom theme colors, shadows, and fonts
│   ├── vite.config.js          # Configured with envDir: '..' for root .env reading
│   └── src/
│       ├── api/
│       │   ├── client.js       # Base HTTP client & SSE stream reader
│       │   └── mock.js         # Backend adapter (maps live FastAPI endpoints to UI contracts)
│       ├── components/
│       │   ├── Navbar.jsx      # Top navigation with merchant switcher pill
│       │   ├── Footer.jsx      # Brand footer
│       │   ├── Sticker.jsx     # Signature -3° rotated badges
│       │   └── ChatPhoneMockup.jsx # Mobile simulator frame
│       ├── context/
│       │   └── AuthContext.jsx # Merchant login, profile state, and localStorage sync
│       ├── illustrations/      # Hand-drawn inline SVG artwork
│       ├── pages/
│       │   ├── LandingPage.jsx   # 6-section landing page with interactive simulator
│       │   ├── DemoChatPage.jsx  # Full-screen conversational workspace with audit receipts
│       │   ├── DashboardPage.jsx # Store view, Operations cluster, and live actions
│       │   └── LoginPage.jsx     # Merchant switcher & registration page
│       ├── styles/
│       │   └── index.css       # Tailwind directives & hard-offset shadow utilities
│       ├── App.jsx             # React Router routing table
│       └── main.jsx            # React root mount
│
└── backend/                    # FastAPI Application
    ├── agent.py                # Gemini AI agent loop, multi-round tool calling & guardrails
    ├── database.py             # SQLAlchemy engine configuration with pool_pre_ping & now_ist()
    ├── main.py                 # FastAPI application, CORS middleware & REST endpoints
    ├── models.py               # 11 relational database schemas
    ├── requirements.txt        # Python 3.10 dependency manifest
    ├── seed.py                 # Deterministic seed generator (random.seed 7)
    ├── test_chat.py            # Comprehensive 8-scenario integration test suite
    └── tools.py                # 17 merchant ecosystem tool implementations & GenAI schemas
```

---

## Environment Configuration (`.env`)

A single `.env` file located at the repository root (`d:\paytm\.env`) powers both the backend and frontend.

```bash
# Copy template to active .env
cp .env.example .env
```

### Environment Variable Reference

| Variable | Target | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | Neon PostgreSQL connection string (must end with `sslmode=require`). Falls back to SQLite `dev_fallback.db` if empty. | `postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require` |
| `GEMINI_API_KEY` | Backend | Google AI Studio API Key. If empty, the backend runs in deterministic playbook mode. | `AIzaSy...` |
| `MODEL` | Backend | Gemini model identifier. | `gemini-2.5-flash` |
| `AI_LIMIT` | Backend | Maximum INR value for autonomous actions. Amounts above this escalate to humans. | `10000` |
| `ALLOWED_ORIGINS` | Backend | Permitted CORS origins for API requests. | `http://localhost:5173,http://localhost:3000` |
| `VITE_API_URL` | Frontend | Target API endpoint for the React frontend. | `http://localhost:8000` |

---

## Quick Start Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher) and **npm**
- **Python** (v3.10.x) and **pip**
- **Git**

---

### Backend Setup (FastAPI + Neon DB)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a Python 3.10 virtual environment**:
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   venv\Scripts\Activate.ps1

   # On Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Seed the database**:
   ```bash
   python seed.py
   ```
   *This truncates all tables, loads 12 merchants, 60+ days of transaction history, pre-configured problem states (Ramesh's held settlement, Priya's stuck refund, Vikram's high-value dispute), 12 leads, 3 open tickets, and 7 days of operational timeseries.*

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The API will be available at `http://localhost:8000`. Verify with health check: `http://localhost:8000/api/health`.*

---

### Frontend Setup (React 18 + Vite)

1. **Open a new terminal and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   *Or build and preview on port 3000:*
   ```bash
   npm run build
   npm run preview -- --port 3000 --host
   ```
   *The application will open at `http://localhost:3000` or `http://localhost:5173`.*

---

## Pre-Seeded Merchant Personas & Test Scenarios

The database includes 3 core demo merchants pre-configured with realistic operational problems:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRE-SEEDED DEMO PERSONAS                                  │
├────────────────────────────┬─────────────────────────────┬───────────────────────────────────┤
│ Merchant #1: Ramesh Patil  │ Merchant #2: Priya Menon    │ Merchant #3: Vikram Arora         │
│ "Ramesh Kirana Store"      │ "Priya Supermarket"         │ "Arora Electricals"               │
│ Dadar, Mumbai (Marathi/Hi) │ Indiranagar, BLR (English)  │ Karol Bagh, Delhi (Hindi/En)      │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Issue: ₹8,450 Held Payout  │ Issue 1: ₹1,200 Stuck Refund│ Issue 1: ₹85,000 Large Hold       │
│ Cause: KYC bank mismatch   │ Cause: NPCI network timeout │ Reason: Exceeds ₹10,000 threshold │
│ Fix: IFSC verify + IMPS    │ Fix: NPCI auto-reversal API │ Fix: High-priority human handoff  │
│                            │                             │                                   │
│                            │ Issue 2: Silent Soundbox    │ Issue 2: Soundbox Offline         │
│                            │ Cause: Battery low at 9%    │ Cause: 4G Network glitch          │
│                            │ Fix: Refuses fix, asks plug │ Fix: Remote reboot & 90% volume   │
│                            │                             │                                   │
│                            │ Issue 3: Shop Loan Request  │                                   │
│                            │ Eligibility: ₹2,00,000      │                                   │
│                            │ Fix: Digital pre-sanction   │                                   │
└────────────────────────────┴─────────────────────────────┴───────────────────────────────────┘
```

---

## Automated Integration Test Suite

The backend includes a comprehensive, automated test suite (`backend/test_chat.py`) verifying all 8 operational paths:

```bash
cd backend
python test_chat.py
```

### Test Matrix

| # | Prompt / User Message | Target Persona | Autonomous Action Chain Executed | Verified Outcome |
|:---:|---|---|---|---|
| **a** | *"Mera kal ka settlement nahi aaya, check karo"* | Ramesh Patil (#1) | `get_settlement_status` ➔ `verify_bank_ifsc` ➔ `retrigger_kyc` ➔ `reroute_settlement_imps` | Settlement status updated to `paid`; UTR generated; Hinglish receipt card emitted. |
| **b** | *"My customer refund of Rs 1200 is stuck"* | Priya Menon (#2) | `get_refund_status` ➔ `retry_refund` | Status updated to `retrying` / `done`; NPCI reversal reference generated. |
| **c** | *"Can I get a loan for expanding my shop?"* | Priya Menon (#2) | `check_loan_eligibility` ➔ `presanction_loan` | Evaluates ₹42,000 daily QR sales; pre-sanctions ₹2,00,000 loan with doorstep biometric visit. |
| **d** | *"My soundbox is not speaking payments"* | Vikram Arora (#3) | `diagnose_soundbox` ➔ `remote_fix_soundbox` | OTA connection reset; volume recalibrated to 90%; test chime dispatched. |
| **e** | *"Soundbox is not working at all"* | Priya Menon (#2) | `diagnose_soundbox` ➔ `remote_fix_soundbox` | Detected battery at 9%; refused remote fix; prompted merchant to plug into charger. |
| **f** | *"Where is my Rs 85,000 settlement payout?"* | Vikram Arora (#3) | `get_settlement_status` ➔ `reroute_settlement_imps` | Amount exceeds ₹10,000 safety threshold; created High-Priority Ticket #4 for human desk. |
| **g** | *"This is cheating, I will file police complaint"* | Ramesh Patil (#1) | Pre-model distress keyword interceptor ➔ `create_ticket` | Bypassed model; escalated to Senior Desk Lead Kunal S.; created urgent Ticket #5. |
| **h** | *"Follow up on loan requirement for Sunita"* | Sales Mode (Lead #1) | `get_lead` ➔ `search_policy` ➔ `send_offer` ➔ `book_followup` | Stage updated from `new` ➔ `talking` ➔ `booked` for tomorrow 3:00 PM. |

---

## Database Schema (11 Relational Models)

```mermaid
erDiagram
    merchants ||--o{ settlements : has
    merchants ||--o{ refunds : has
    merchants ||--o{ transactions : records
    merchants ||--|| soundboxes : owns
    merchants ||--o{ loans : receives
    merchants ||--o{ tickets : opens
    merchants ||--o{ action_log : generates
    merchants ||--o{ sessions : initiates
    sessions ||--o{ messages : contains

    merchants {
        int id PK
        string name
        string shop_name
        string city
        string language
        string phone
        string kyc_status
        string bank_name_on_kyc
        string ifsc
        string bank_name_on_account
    }

    settlements {
        int id PK
        int merchant_id FK
        float amount
        string status
        string reason
        datetime created_at
    }

    refunds {
        int id PK
        int merchant_id FK
        float amount
        string status
        string upi_ref
        datetime created_at
    }

    transactions {
        int id PK
        int merchant_id FK
        float amount
        string payer
        string mode
        string status
        datetime created_at
    }

    soundboxes {
        int id PK
        int merchant_id FK
        string device_id
        string status
        int battery
        string fault
        datetime last_seen
    }

    loans {
        int id PK
        int merchant_id FK
        float amount
        string status
        datetime created_at
    }

    leads {
        int id PK
        string name
        string phone
        string city
        string interest
        string stage
        text notes
    }

    tickets {
        int id PK
        int merchant_id FK
        string summary
        string priority
        string status
        datetime created_at
    }

    action_log {
        int id PK
        datetime time
        int merchant_id FK
        string tool
        text input_json
        text result_json
        string status
        string summary
    }

    sessions {
        string id PK
        int merchant_id FK
        string mode
        datetime started_at
        int first_reply_ms
        string outcome
    }

    messages {
        int id PK
        string session_id FK
        string role
        text content
        datetime created_at
    }
```

---

## Autonomous AI Tool Registry (17 Tools)

Each tool is declared with strict JSON schemas for Google Gemini function calling and maps directly to an ACID database operation:

| Tool Name | Parameters | Side Effect & Database Impact |
|---|---|---|
| `get_merchant` | `merchant_id: int` | Fetches verified merchant profile, store name, language, and KYC status. |
| `get_settlement_status` | `merchant_id: int` | Retrieves the latest settlement record, hold reason, and amount. |
| `verify_bank_ifsc` | `ifsc: str` | Validates IFSC against Razorpay API (`https://ifsc.razorpay.com/<IFSC>`) with banking prefix fallbacks. |
| `retrigger_kyc` | `merchant_id: int` | Clears bank name mismatch and updates `merchants.kyc_status` to `"verified"`. |
| `reroute_settlement_imps` | `merchant_id: int, settlement_id: int, amount: float` | Dispatches settlement via IMPS, sets `settlements.status = "paid"`. Halts if amount > ₹10,000. |
| `get_recent_transactions` | `merchant_id: int, limit: int = 5` | Returns recent customer QR payments with payer names and timestamps. |
| `get_refund_status` | `merchant_id: int, upi_ref: str = None` | Checks status of customer refund disputes. |
| `retry_refund` | `merchant_id: int, refund_id: int, amount: float` | Retries refund via NPCI fast-track API; updates `refunds.status = "done"`. |
| `diagnose_soundbox` | `merchant_id: int` | Reads battery %, 4G signal strength, firmware version, and audio hardware state. |
| `remote_fix_soundbox` | `merchant_id: int, device_id: str` | Resets network registration and recalibrates volume. Rejects if battery < 15%. |
| `check_loan_eligibility` | `merchant_id: int` | Analyzes 60-day average QR daily collections to compute sanction eligibility limit. |
| `presanction_loan` | `merchant_id: int, amount: float` | Inserts pre-sanctioned loan into `loans` table and books field agent biometric visit. |
| `search_policy` | `topic: str` | Semantic lookup across 6 standard Paytm merchant operational policies. |
| `create_ticket` | `merchant_id: int, summary: str, priority: str` | Creates an urgent ticket in `tickets` table and flags session for human handoff. |
| `get_lead` | `lead_id: int` | Fetches sales lead details with phone numbers masked to the last 4 digits. |
| `send_offer` | `lead_id: int, product: str, discount_pct: float` | Dispatches SMS offer and updates `leads.notes`. |
| `book_followup` | `lead_id: int, date_str: str, time_str: str` | Transitions `leads.stage` to `"booked"` and saves visit date. |

---

## Streaming Protocol (Server-Sent Events)

Chat responses are streamed over HTTP using standard `text/event-stream` format (`POST /api/chat/stream`).

### Event Lifecycle

1. **`event: status`**: Dispatched during processing transitions:
   ```
   event: status
   data: {"text": "Checking settlement status..."}
   ```
2. **`event: action`**: Dispatched immediately after a tool executes:
   ```
   event: action
   data: {"tool": "reroute_settlement_imps", "summary": "Re-routed ₹8,450 via IMPS", "status": "solved_by_ai"}
   ```
3. **`event: card`**: Dispatched when a UI action card is generated (settlement receipt, refund confirmation, diagnostic badge, loan approval, or desk lead handoff):
   ```
   event: card
   data: {"type": "settlement", "title": "Paytm Instant IMPS Settlement", "amount": "₹8,450", "utr": "IMPS884219", "status": "DISPATCHED VIA IMPS"}
   ```
4. **`event: text`**: Chunks of the AI assistant's conversational response:
   ```
   event: text
   data: {"chunk": "Namaste Ramesh ji! Maine aapka ₹8,450 ka settlement turant IMPS se bhej diya hai."}
   ```
5. **`event: done`**: Sent at the completion of the turn:
   ```
   event: done
   data: {"session_id": "sess-ramesh-1", "outcome": "solved_by_ai"}
   ```

---

## REST API Reference

### Chat & Streaming
- `POST /api/chat/stream`
  - Request Body:
    ```json
    {
      "session_id": "sess-101",
      "message": "Mera settlement ruka hua hai",
      "merchant_id": 1,
      "lead_id": null,
      "mode": "support",
      "language": "hi"
    }
    ```
  - Response: Server-Sent Events stream (`text/event-stream`).

### Operations & Dashboard
- `GET /api/dashboard/summary`
  - Returns autonomous resolution percentage, human escalation count, active leads count, and average first-reply latency.
- `GET /api/dashboard/timeseries`
  - Returns 7-day operational timeseries breakdown (`date`, `ai_resolved`, `human_escalated`).
- `GET /api/actions?limit=50`
  - Returns recent tool execution log entries with merchant context, tool name, input/output JSON, and status.
- `GET /api/events?after=<id>`
  - Non-blocking polling endpoint returning actions newer than `after` ID for sub-second UI synchronization.
- `GET /api/tickets`
  - Returns open escalation tickets awaiting human action.
- `POST /api/tickets/{id}/take`
  - Assigns an open ticket to a senior desk lead (`status = "taken"`).
- `GET /api/leads`
  - Returns sales leads grouped by stage (`new`, `talking`, `booked`).
- `PATCH /api/leads/{id}/stage`
  - Updates lead stage (`{"stage": "booked"}`).
- `POST /api/reset`
  - Truncates and re-seeds database with deterministic baseline data.

---

## Safety & Guardrails Architecture

```
User Message
     │
     ▼
[Step 1: Sentiment & Distress Interceptor]
     │ Contains legal/police/threat words?
     ├─► YES ──► Log distress ticket ──► Empathic De-escalation ──► Human Desk Transfer
     │
     ▼ NO
[Step 2: Rate Limiting Guardrail]
     │ > 20 messages in last 60 seconds?
     ├─► YES ──► Return friendly rate-limit notice
     │
     ▼ NO
[Step 3: PII Masking]
     │ Mask phone numbers: +91 ****** 4910
     │
     ▼
[Step 4: AI Model / Function Calling Loop]
     │ Max 6 Tool Iterations Per Turn
     ▼
[Step 5: Financial Execution Threshold]
     │ Tool amount > AI_LIMIT (₹10,000)?
     ├─► YES ──► Refuse automated payout ──► Generate Priority Ticket for Human Lead
     │
     ▼ NO
[Step 6: Execute ACID DB Tool & Commit Action Log]
```

1. **Financial Execution Threshold**: Hard stop on automated payouts, settlements, or refund retries exceeding `AI_LIMIT` (default: ₹10,000). High-value disputes are halted and assigned to a Human Desk Officer.
2. **PII Masking**: Merchant and lead contact numbers are automatically masked to the last 4 digits (`+91 ****** 4910`) before entering the AI prompt context.
3. **Distress Interceptor**: User messages containing urgent keywords (`"police"`, `"fraud"`, `"court"`, `"lawyer"`, `"chor"`, `"cheating"`) trigger an immediate human escalation ticket *before* calling the LLM.
4. **Tool Iteration Cap**: Agent loops are strictly capped at 6 rounds to prevent non-terminating tool-call cycles.
5. **Database Rate Limiting**: Sessions exceeding 20 messages per minute receive an automated warning.

---

## Troubleshooting & Common Questions

### 1. Browser Extension Warnings (`contentscript.js MaxListenersExceededWarning`)
- **Cause**: Chrome extensions (e.g. MetaMask, web3 injectors) inject content scripts that intercept failing network calls. If CORS or port mismatches cause repeated fetch errors, the extension leaks event listeners.
- **Solution**: Ensure the backend is running on `http://localhost:8000` with CORS configured. The built-in CORS middleware permits both `http://localhost:3000` and `http://localhost:5173`.

### 2. Neon Database Connection Timeouts
- **Cause**: Neon serverless Postgres instances sleep when idle. Initial wakeups can take 1–2 seconds.
- **Solution**: The engine is configured with `pool_pre_ping=True` and `pool_recycle=300`. Always ensure your connection string ends with `sslmode=require`.

### 3. Missing `GEMINI_API_KEY`
- The application does not crash if `GEMINI_API_KEY` is omitted. It automatically falls back to **Deterministic Playbook Mode**, executing all database tools and emitting live action receipts.

### 4. Port 8000 or Port 3000 Already in Use (Windows)
```powershell
# Find process holding port 8000:
netstat -ano | findstr :8000
# Kill process by PID:
taskkill /F /PID <PID>
```
