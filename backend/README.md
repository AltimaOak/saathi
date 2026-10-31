# Saathi Backend API

FastAPI + SQLAlchemy + PostgreSQL (Neon) + Google Gemini AI for Paytm Merchants.

## Setup Instructions

1. **Create and activate Python virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your connection details:
   ```bash
   copy .env.example .env
   ```
   Variables required in `.env`:
   - `DATABASE_URL`: Neon PostgreSQL connection string (ending with `sslmode=require`)
   - `GEMINI_API_KEY`: Google Gemini API key from https://aistudio.google.com
   - `MODEL`: Default `gemini-2.5-flash`
   - `AI_LIMIT`: Default `10000`
   - `ALLOWED_ORIGINS`: Default `http://localhost:5173` (comma-separated if multiple)

4. **Seed Database**:
   ```bash
   python seed.py
   ```

5. **Start Development Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## Endpoints Summary

- `POST /api/chat/stream`: Real-time Server-Sent Events (SSE) AI agent stream with manual tool calling
- `GET /api/health`: Health status & DB check
- `POST /api/auth/login`: Merchant login
- `POST /api/auth/register`: Merchant self-registration
- `GET /api/merchants`: List all merchants
- `GET /api/merchants/{id}/overview`: Merchant daily transactions, settlements & device status
- `GET /api/dashboard/summary`: Ops cluster KPIs (cases solved, AI vs human %, first reply speed)
- `GET /api/dashboard/timeseries`: 7-day volume breakdown
- `GET /api/actions`: Action log audit trail
- `GET /api/events?after=<id>`: Fast non-blocking polling stream for live UI dashboard sync
- `GET /api/tickets`: Human escalation tickets queue
- `POST /api/tickets/{id}/take`: Assign escalation ticket
- `GET /api/leads`: Sales leads kanban grouped by stage
- `PATCH /api/leads/{id}/stage`: Move lead between stages (new -> talking -> booked)
- `POST /api/reset`: Reset database to deterministic hackathon demo state

