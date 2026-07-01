from __future__ import annotations

from typing import Any
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .agents.collections import CollectionsAgent
from .agents.communications import CommunicationAgent
from .agents.email_parser import EmailParserAgent
from .agents.fulfillment import FulfillmentAgent
from .agents.graph import OrderToCashGraph
from .agents.intake import OrderIntakeAgent
from .agents.invoice import InvoiceAgent
from .agents.prioritization import PrioritizationAgent
from .agents.reconciliation import PaymentReconciliationAgent
from .agents.validation import ValidationAgent
from .data import (
    SAMPLE_ORDERS,
    SAMPLE_FULFILLMENT,
    SAMPLE_INVOICES,
    SAMPLE_PAYMENTS,
    SAMPLE_EXCEPTIONS,
    SAMPLE_VENDORS,
    CATALOG,
    USE_CASES,
)

# Dynamic data storage (replace with database in production)
DYNAMIC_ORDERS = list(SAMPLE_ORDERS)
DYNAMIC_INVOICES = list(SAMPLE_INVOICES)
DYNAMIC_PAYMENTS = list(SAMPLE_PAYMENTS)
DYNAMIC_FULFILLMENT = list(SAMPLE_FULFILLMENT)
DYNAMIC_EXCEPTIONS = list(SAMPLE_EXCEPTIONS)
DYNAMIC_USE_CASES: list[dict[str, str]] = list(USE_CASES)
DYNAMIC_VENDORS = list(SAMPLE_VENDORS)
DYNAMIC_CATALOG = dict(CATALOG)

from .models import (
    CollectionReminder,
    CollectionReminderRequest,
    DashboardMetric,
    DashboardResponse,
    ExtractionRequest,
    FulfillmentTask,
    Invoice,
    InvoiceValidationResult,
    OrderPayload,
    Payment,
    PipelineRun,
    PriorityResult,
    ReconciliationResult,
    ValidationResult,
    InventoryItem,
    Vendor,
    ExceptionItem,
    ReplenishRequest,
    ProcureRequest,
    ResolveExceptionRequest,
)


app = FastAPI(
    title="OrderFlow AI API",
    version="0.1.0",
    description="Agentic order-to-cash automation MVP for small businesses.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

intake_agent = OrderIntakeAgent()
validation_agent = ValidationAgent()
priority_agent = PrioritizationAgent()
communication_agent = CommunicationAgent()
fulfillment_agent = FulfillmentAgent()
invoice_agent = InvoiceAgent()
reconciliation_agent = PaymentReconciliationAgent()
collections_agent = CollectionsAgent()
email_parser = EmailParserAgent()
pipeline_graph = OrderToCashGraph()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard", response_model=DashboardResponse)
async def dashboard() -> DashboardResponse:
    outstanding = sum(invoice.total for invoice in DYNAMIC_INVOICES if invoice.status in {"sent", "overdue"})
    revenue = sum(order.total_amount for order in DYNAMIC_ORDERS)
    metrics = [
        DashboardMetric(label="Orders", value=str(len(DYNAMIC_ORDERS)), change="Live data", tone="good"),
        DashboardMetric(label="Revenue", value=f"${revenue / 1000:.1f}K" if revenue > 0 else "$0.0K", change="Live pipeline", tone="neutral"),
        DashboardMetric(label="Outstanding", value=f"${outstanding / 1000:.1f}K" if outstanding > 0 else "$0.0K", change="Live AR", tone="warning"),
        DashboardMetric(label="SLA", value="0%", change="Awaiting data", tone="neutral"),
    ]
    return DashboardResponse(
        metrics=metrics,
        orders=DYNAMIC_ORDERS,
        fulfillment=DYNAMIC_FULFILLMENT,
        invoices=DYNAMIC_INVOICES,
        payments=DYNAMIC_PAYMENTS,
        exceptions=DYNAMIC_EXCEPTIONS,
    )


@app.get("/api/use-cases")
async def use_cases() -> list[dict[str, str]]:
    return DYNAMIC_USE_CASES


@app.post("/api/email/parse")
async def parse_email(request: ExtractionRequest) -> dict[str, Any]:
    """Parse email to extract use cases dynamically."""
    email_content = request.raw_text or ""
    use_cases = await email_parser.extract_use_cases(email_content)
    
    # Update dynamic storage
    DYNAMIC_USE_CASES.clear()
    DYNAMIC_USE_CASES.extend(use_cases)
    
    return {
        "status": "success",
        "use_cases_found": len(use_cases),
        "use_cases": use_cases
    }


@app.get("/api/agents/graph")
async def graph() -> dict[str, object]:
    return pipeline_graph.describe()


@app.get("/api/orders", response_model=list[OrderPayload])
async def orders() -> list[OrderPayload]:
    return DYNAMIC_ORDERS


@app.post("/api/orders/extract", response_model=OrderPayload)
async def extract_order(request: ExtractionRequest) -> OrderPayload:
    return await intake_agent.extract(request)


@app.post("/api/orders/upload", response_model=OrderPayload)
async def upload_order(file: UploadFile = File(...)) -> OrderPayload:
    content = await file.read()
    raw_text = content.decode("utf-8", errors="ignore")
    return await intake_agent.extract(ExtractionRequest(raw_text=raw_text, filename=file.filename, channel="upload"))


@app.post("/api/orders/validate", response_model=ValidationResult)
async def validate_order(order: OrderPayload) -> ValidationResult:
    return validation_agent.validate(order)


@app.post("/api/orders/prioritize", response_model=PriorityResult)
async def prioritize_order(order: OrderPayload) -> PriorityResult:
    return priority_agent.score(order)


@app.post("/api/orders/acknowledge")
async def acknowledge_order(order: OrderPayload):
    return await communication_agent.acknowledge(order)


@app.post("/api/fulfillment/schedule", response_model=FulfillmentTask)
async def schedule_fulfillment(order: OrderPayload) -> FulfillmentTask:
    return fulfillment_agent.schedule(order)


@app.post("/api/invoice/generate", response_model=Invoice)
async def generate_invoice(order: OrderPayload) -> Invoice:
    return invoice_agent.generate(order)


@app.post("/api/invoice/validate", response_model=InvoiceValidationResult)
async def validate_invoice(invoice: Invoice) -> InvoiceValidationResult:
    return invoice_agent.validate(invoice)


@app.post("/api/payment/reconcile", response_model=ReconciliationResult)
async def reconcile_payment(payment: Payment) -> ReconciliationResult:
    return reconciliation_agent.reconcile(payment, DYNAMIC_INVOICES)


@app.post("/api/collections/remind", response_model=CollectionReminder)
async def collections_reminder(request: CollectionReminderRequest) -> CollectionReminder:
    return await collections_agent.remind(request)


@app.post("/api/pipeline/run", response_model=PipelineRun)
async def run_pipeline(request: ExtractionRequest) -> PipelineRun:
    result = await pipeline_graph.run(request)
    # Store results in dynamic storage for dashboard
    DYNAMIC_ORDERS.append(result.extraction)
    DYNAMIC_INVOICES.append(result.invoice)
    DYNAMIC_FULFILLMENT.append(
        FulfillmentTask(
            order_id=f"ord-{result.extraction.po_number}",
            po_number=result.extraction.po_number,
            customer_name=result.extraction.customer_name,
            stage="pending",
            owner="Ops Team A",
            committed_date=result.extraction.delivery_date,
            risk="low",
        )
    )
    return result


@app.get("/api/inventory", response_model=list[InventoryItem])
async def get_inventory() -> list[InventoryItem]:
    items = []
    for sku, details in DYNAMIC_CATALOG.items():
        items.append(
            InventoryItem(
                sku=sku,
                description=details["description"],
                active=details["active"],
                contract_price=details["contract_price"],
                available_qty=details["available"],
                minimum_order_qty=details["moq"],
            )
        )
    return items


@app.post("/api/inventory/replenish")
async def replenish_inventory(req: ReplenishRequest) -> dict[str, str | int]:
    sku = req.sku.upper()
    if sku in DYNAMIC_CATALOG:
        DYNAMIC_CATALOG[sku]["available"] += req.quantity
        return {"status": "success", "sku": sku, "new_qty": DYNAMIC_CATALOG[sku]["available"]}
    return {"status": "error", "message": "SKU not found"}


@app.get("/api/vendors", response_model=list[Vendor])
async def get_vendors() -> list[Vendor]:
    return [Vendor(**v) for v in DYNAMIC_VENDORS]


@app.post("/api/vendors/procure")
async def procure_vendor(req: ProcureRequest) -> dict[str, str | int]:
    for v in DYNAMIC_VENDORS:
        if v["id"] == req.vendor_id:
            v["active_pos"] += 1
            return {"status": "success", "vendor_id": req.vendor_id, "active_pos": v["active_pos"]}
    return {"status": "error", "message": "Vendor not found"}


@app.get("/api/exceptions", response_model=list[ExceptionItem])
async def get_exceptions() -> list[ExceptionItem]:
    return [ExceptionItem(**e) for e in DYNAMIC_EXCEPTIONS]


@app.post("/api/exceptions/resolve")
async def resolve_exception(req: ResolveExceptionRequest) -> dict[str, str]:
    for e in DYNAMIC_EXCEPTIONS:
        if e["id"] == req.exception_id:
            e["status"] = "resolved"
            return {"status": "success", "exception_id": req.exception_id, "state": "resolved"}
    return {"status": "error", "message": "Exception not found"}


