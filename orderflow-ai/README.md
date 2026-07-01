# OrderFlow AI

Agentic order-to-cash automation platform for small businesses, based on the supplied UC-01 through UC-24 backend operations lifecycle requirements.

This repository is an MVP foundation, not a toy landing page. It includes a runnable React + Material UI operations console, a FastAPI backend, deterministic agent implementations for the Phase 1 use cases, PostgreSQL schema, n8n workflow starters, and Docker Compose infrastructure.

## MVP Scope

Implemented in this first version:

- UC-01 Multi-format order intake and structured extraction
- UC-02 Contract, catalog, credit, MOQ, inventory, and serviceability validation
- UC-03 Priority scoring and queue management
- UC-05 Order acknowledgement generation
- UC-08 Fulfillment status tracking dashboard data
- UC-11 Invoice generation
- UC-12 Invoice validation
- UC-16 Payment matching and reconciliation
- UC-17 Collections reminder generation
- UC-23 Operations dashboard metrics

Designed for extension:

- Fulfillment scheduling, vendor procurement, payment retry, disputes, financial close, revenue recognition, Superset dashboards, Keycloak auth, MinIO storage, Chroma retrieval, Ollama LLM extraction, and full n8n automation.

## Repository Layout

```text
orderflow-ai/
  frontend/          React + TypeScript + Material UI app
  backend/           FastAPI API and agent services
  workflow-engine/   n8n workflow starter JSON files
  n8n/               n8n import manifest
  docs/              use cases, API notes, implementation roadmap
  docker/            local Docker support notes
  scripts/           smoke test helpers
  docker-compose.yml
```

## Run Locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

Entire platform infrastructure:

```powershell
docker compose up -d
```

## API Highlights

- `GET /api/dashboard`
- `GET /api/orders`
- `POST /api/orders/extract`
- `POST /api/orders/upload`
- `POST /api/orders/validate`
- `POST /api/orders/prioritize`
- `POST /api/orders/acknowledge`
- `POST /api/fulfillment/schedule`
- `POST /api/invoice/generate`
- `POST /api/invoice/validate`
- `POST /api/payment/reconcile`
- `POST /api/collections/remind`
- `POST /api/pipeline/run`

The backend currently uses in-memory sample data so the MVP starts instantly. The SQL schema in `backend/app/database/schema.sql` is ready to back the same API with PostgreSQL.

## AI Integration Path

The current agents are deterministic and testable. They are intentionally shaped around the LangGraph pipeline nodes:

1. order intake
2. validation
3. prioritization
4. fulfilment scheduling
5. invoice generation
6. invoice validation
7. payment reconciliation
8. collections

Next step for true LLM extraction is to replace `OrderIntakeAgent.extract` with a Docling/PyMuPDF/OCR parser and an Ollama-backed structured extraction call, keeping the same response model.

