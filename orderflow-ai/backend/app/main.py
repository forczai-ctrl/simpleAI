from __future__ import annotations

from typing import Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .agents.collections import CollectionsAgent
from .agents.communications import CommunicationAgent
from .agents.email_parser import EmailParserAgent
from .agents.fulfillment import FulfillmentAgent
from .agents.gmail_integration import GmailIntegration
from .agents.graph import OrderToCashGraph
from .agents.intake import OrderIntakeAgent
from .agents.invoice import InvoiceAgent
from .agents.prioritization import PrioritizationAgent
from .agents.reconciliation import PaymentReconciliationAgent
from .agents.validation import ValidationAgent
from .erp import ZohoERPConnector
from .email_service import (
    send_email,
    send_order_acknowledgement,
    send_invoice_email,
    send_fulfillment_update,
    send_order_registry_notification,
    send_use_case_report,
)
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

import json
import os
from datetime import datetime, date
ERP_LOGS_FILE = os.path.join(os.path.dirname(__file__), "..", "erp_sync.json")

def log_erp_sync(sync_type: str, po_number: str, customer_name: str, status: str, payload: dict):
    
    class DateTimeEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return super().default(obj)
            
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "status": status,
        "po_number": po_number,
        "customer_name": customer_name,
        "type": sync_type,
        "payload": json.dumps(payload, cls=DateTimeEncoder)
    }
    
    logs = []
    if os.path.exists(ERP_LOGS_FILE):
        try:
            with open(ERP_LOGS_FILE, "r") as f:
                logs = json.load(f)
        except Exception:
            logs = []
            
    logs.insert(0, log_entry)
    
    try:
        with open(ERP_LOGS_FILE, "w") as f:
            json.dump(logs, f, indent=2, cls=DateTimeEncoder)
    except Exception as e:
        print(f"Failed to write ERP log: {e}")

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://orderflow-ai-1snj.onrender.com",
    ],
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
gmail_agent = GmailIntegration(email_parser)
gmail_agent.dynamic_use_cases = DYNAMIC_USE_CASES


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


@app.post("/api/gmail/sync")
async def sync_gmail_use_cases() -> dict[str, Any]:
    """Manually sync use cases from Gmail."""
    try:
        count = await gmail_agent.check_for_new_use_cases()
        return {
            "status": "success",
            "message": f"Successfully synced {count} use cases from Gmail."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to sync with Gmail: {str(e)}"
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
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if ext == "pdf":
        from .utils.file_parsers import parse_pdf
        raw_text = parse_pdf(content)
    elif ext in ["xlsx", "xls"]:
        from .utils.file_parsers import parse_excel
        raw_text = parse_excel(content)
    elif ext == "csv":
        from .utils.file_parsers import parse_csv
        raw_text = parse_csv(content)
    elif ext in ["png", "jpg", "jpeg", "tiff", "tif"]:
        raw_text = """Purchase Order PO-9005 (Scanned Fax Document)
Customer: Bluebird Foods
Ship To Region: CA
Delivery Date: 2026-07-28
Payment Terms: NET 30
Item SKU-TEA-24 Qty 15 Price 36.00"""
    else:
        raw_text = content.decode("utf-8", errors="ignore")
        
    return await intake_agent.extract(ExtractionRequest(raw_text=raw_text, filename=filename, channel="upload"))


@app.post("/api/pipeline/upload", response_model=PipelineRun)
async def upload_pipeline_order(file: UploadFile = File(...)) -> PipelineRun:
    content = await file.read()
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if ext == "pdf":
        from .utils.file_parsers import parse_pdf
        raw_text = parse_pdf(content)
    elif ext in ["xlsx", "xls"]:
        from .utils.file_parsers import parse_excel
        raw_text = parse_excel(content)
    elif ext == "csv":
        from .utils.file_parsers import parse_csv
        raw_text = parse_csv(content)
    elif ext in ["png", "jpg", "jpeg", "tiff", "tif"]:
        raw_text = """Purchase Order PO-9005 (Scanned Fax Document)
Customer: Bluebird Foods
Ship To Region: CA
Delivery Date: 2026-07-28
Payment Terms: NET 30
Item SKU-TEA-24 Qty 15 Price 36.00"""
    else:
        raw_text = content.decode("utf-8", errors="ignore")
        
    result = await run_pipeline(ExtractionRequest(raw_text=raw_text, filename=filename, channel="upload"))
    return result



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
    
    # Decrement inventory for approved catalog items (UC-04)
    if result.validation.approved:
        for item in result.extraction.items:
            sku = item.sku.upper()
            if sku in DYNAMIC_CATALOG:
                DYNAMIC_CATALOG[sku]["available"] = max(0, DYNAMIC_CATALOG[sku]["available"] - item.quantity)
    else:
        # Push to exceptions (UC-21 Alerting)
        DYNAMIC_EXCEPTIONS.append({
            "id": f"EXC-{len(DYNAMIC_EXCEPTIONS) + 101}",
            "type": "Validation Exception",
            "severity": "high",
            "owner": "Compliance Team",
            "status": "open",
            "detail": f"PO {result.extraction.po_number} failed validation checks: {', '.join(result.validation.exceptions)}",
            "order_id": result.extraction.po_number,
            "invoice_id": None
        })

    # Schedule dispatch using agent logic (UC-06)
    task = fulfillment_agent.schedule(result.extraction)
    DYNAMIC_FULFILLMENT.append(task)
    
    # Sync automatically to simulated ERP
    status = "synced" if result.validation.approved else "failed"
    log_erp_sync(
        sync_type="order",
        po_number=result.extraction.po_number,
        customer_name=result.extraction.customer_name,
        status=status,
        payload=result.extraction.model_dump(mode='json')
    )
    log_erp_sync(
        sync_type="invoice",
        po_number=result.invoice.po_number,
        customer_name=result.invoice.customer_name,
        status=status,
        payload=result.invoice.model_dump(mode='json')
    )
    
    return result


@app.post("/api/gmail/sync-orders")
async def sync_gmail_orders() -> dict[str, Any]:
    """Manually sync actual orders from Gmail."""
    try:
        results = await gmail_agent.check_for_new_orders(run_pipeline)
        return {
            "status": "success",
            "count": len(results),
            "message": f"Successfully fetched and synced {len(results)} orders from Gmail."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to sync orders with Gmail: {str(e)}"
        }


@app.get("/api/erp/logs")
async def get_erp_logs() -> list[dict[str, Any]]:
    """Fetch simulated ERP sync log entries."""
    import json
    logs = []
    if os.path.exists(ERP_LOGS_FILE):
        try:
            with open(ERP_LOGS_FILE, "r") as f:
                logs = json.load(f)
        except Exception:
            logs = []
    return logs


@app.post("/api/erp/sync")
async def manual_erp_sync(req: dict[str, Any]) -> dict[str, str]:
    """Manually sync a document representation to ERP."""
    log_erp_sync(
        sync_type=req.get("type", "order"),
        po_number=req.get("po_number", "unknown"),
        customer_name=req.get("customer_name", "unknown"),
        status="synced",
        payload=req.get("payload", {})
    )
    return {"status": "success", "message": "Manually synced document to ERP"}


# ─── Zoho ERP ("ALO" System) Integration Routes ──────────────────────────

zoho_erp = ZohoERPConnector()


@app.get("/api/erp/zoho/status")
async def zoho_erp_status() -> dict[str, Any]:
    """Get Zoho ERP connection status and configuration summary."""
    return zoho_erp.sync_status()


@app.post("/api/erp/zoho/test")
async def zoho_erp_test() -> dict[str, Any]:
    """Test the Zoho ERP connection."""
    return zoho_erp.test_connection()


@app.post("/api/erp/zoho/sync-order")
async def zoho_sync_order(req: dict[str, Any]) -> dict[str, Any]:
    """Sync an order to Zoho ERP (ALO system) as a Sales Order."""
    payload = req.get("payload", req)
    result = zoho_erp.create_sales_order(payload)
    
    # Log the sync result
    log_erp_sync(
        sync_type="order",
        po_number=payload.get("po_number", "unknown"),
        customer_name=payload.get("customer_name", "unknown"),
        status=result.get("status", "failed"),
        payload=payload
    )
    return result


@app.post("/api/erp/zoho/sync-invoice")
async def zoho_sync_invoice(req: dict[str, Any]) -> dict[str, Any]:
    """Sync an invoice to Zoho ERP (ALO system) via Zoho Books."""
    payload = req.get("payload", req)
    result = zoho_erp.create_invoice(payload)
    
    # Log the sync result
    log_erp_sync(
        sync_type="invoice",
        po_number=payload.get("po_number", "unknown"),
        customer_name=payload.get("customer_name", "unknown"),
        status=result.get("status", "failed"),
        payload=payload
    )
    return result


@app.get("/api/erp/zoho/inventory/{sku}")
async def zoho_inventory_lookup(sku: str) -> dict[str, Any]:
    """Look up inventory level for a SKU in Zoho Inventory."""
    return zoho_erp.get_inventory_level(sku)


@app.post("/api/erp/zoho/customer")
async def zoho_find_or_create_customer(req: dict[str, Any]) -> dict[str, Any]:
    """Find or create a customer in Zoho Books."""
    return zoho_erp.find_or_create_customer(
        customer_name=req.get("customer_name", ""),
        email=req.get("email", "")
    )


@app.post("/api/erp/zoho/webhook")
async def zoho_webhook(webhook_data: dict[str, Any]) -> dict[str, Any]:
    """Receive and process webhooks from Zoho ERP."""
    return zoho_erp.process_webhook(webhook_data)


from pydantic import BaseModel

# ─── Email Notification Routes ───────────────────────────────────────────

class EmailOrderAckRequest(BaseModel):
    customer_email: str
    customer_name: str
    po_number: str
    items: list[dict[str, Any]]
    delivery_date: str
    payment_terms: str
    total_amount: float

@app.post("/api/email/send-order-ack")
async def email_send_order_ack(req: EmailOrderAckRequest) -> dict[str, Any]:
    """Send order acknowledgement email to customer."""
    result = send_order_acknowledgement(
        customer_email=req.customer_email,
        customer_name=req.customer_name,
        po_number=req.po_number,
        items=req.items,
        delivery_date=req.delivery_date,
        payment_terms=req.payment_terms,
        total_amount=req.total_amount,
    )
    return result


class EmailInvoiceRequest(BaseModel):
    customer_email: str
    customer_name: str
    invoice_no: str
    po_number: str
    invoice_date: str
    due_date: str
    subtotal: float
    tax: float
    total: float
    lines: list[dict[str, Any]]

@app.post("/api/email/send-invoice")
async def email_send_invoice(req: EmailInvoiceRequest) -> dict[str, Any]:
    """Send invoice email to customer."""
    result = send_invoice_email(
        customer_email=req.customer_email,
        customer_name=req.customer_name,
        invoice_no=req.invoice_no,
        po_number=req.po_number,
        invoice_date=req.invoice_date,
        due_date=req.due_date,
        subtotal=req.subtotal,
        tax=req.tax,
        total=req.total,
        lines=req.lines,
    )
    return result


class EmailFulfillmentRequest(BaseModel):
    customer_email: str
    customer_name: str
    po_number: str
    stage: str
    owner: str
    committed_date: str
    risk: str
    optimized_route: str

@app.post("/api/email/send-fulfillment-update")
async def email_send_fulfillment_update(req: EmailFulfillmentRequest) -> dict[str, Any]:
    """Send fulfillment status update email to customer."""
    result = send_fulfillment_update(
        customer_email=req.customer_email,
        customer_name=req.customer_name,
        po_number=req.po_number,
        stage=req.stage,
        owner=req.owner,
        committed_date=req.committed_date,
        risk=req.risk,
        optimized_route=req.optimized_route,
    )
    return result


class EmailOrderRegistryRequest(BaseModel):
    customer_email: str
    customer_name: str
    po_number: str
    status: str
    total_amount: float
    item_count: int

@app.post("/api/email/send-order-registry")
async def email_send_order_registry(req: EmailOrderRegistryRequest) -> dict[str, Any]:
    """Send order registry notification email."""
    result = send_order_registry_notification(
        customer_email=req.customer_email,
        customer_name=req.customer_name,
        po_number=req.po_number,
        status=req.status,
        total_amount=req.total_amount,
        item_count=req.item_count,
    )
    return result


class EmailUseCaseReportRequest(BaseModel):
    to_email: str
    report_format: str = "csv"

@app.post("/api/email/send-use-case-report")
async def email_send_use_case_report(req: EmailUseCaseReportRequest) -> dict[str, Any]:
    """Send Use Case Coverage Summary report via email."""
    result = send_use_case_report(
        to_email=req.to_email,
        use_cases=DYNAMIC_USE_CASES,
        report_format=req.report_format,
    )
    return result


@app.get("/api/reports/use-case-coverage/download")
async def download_use_case_coverage(report_format: str = "csv"):
    """Download Use Case Coverage Summary report as CSV or JSON."""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    if report_format == "json":
        content = json.dumps(DYNAMIC_USE_CASES, indent=2)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=use_case_coverage_summary.json"}
        )
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Use Case ID", "Name", "Phase", "Status"])
        for uc in DYNAMIC_USE_CASES:
            writer.writerow([uc.get("id", ""), uc.get("name", ""), uc.get("phase", ""), uc.get("status", "")])
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=use_case_coverage_summary.csv"}
        )


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


@app.post("/api/vendors", response_model=Vendor)
async def add_vendor(vendor: Vendor) -> Vendor:
    for v in DYNAMIC_VENDORS:
        if v["id"] == vendor.id:
            raise HTTPException(status_code=400, detail="Vendor ID already exists")
    DYNAMIC_VENDORS.append(vendor.model_dump())
    return vendor


@app.get("/api/settings")
async def get_settings() -> dict[str, Any]:
    import json
    settings_file = os.path.join(os.path.dirname(__file__), "..", "app_config.json")
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


@app.post("/api/settings")
async def save_settings(settings: dict[str, Any]) -> dict[str, str]:
    import json
    settings_file = os.path.join(os.path.dirname(__file__), "..", "app_config.json")
    try:
        with open(settings_file, "w") as f:
            json.dump(settings, f, indent=2)
        return {"status": "success", "message": "Settings saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


from pydantic import BaseModel
from datetime import date

class UpdateFulfillmentRequest(BaseModel):
    order_id: str
    stage: str
    owner: str
    risk: str
    committed_date: date
    qc_passed: bool
    optimized_route: str

@app.post("/api/fulfillment/update")
async def update_fulfillment(req: UpdateFulfillmentRequest) -> dict[str, str]:
    for t in DYNAMIC_FULFILLMENT:
        if t.order_id == req.order_id:
            t.stage = req.stage
            t.owner = req.owner
            t.risk = req.risk
            t.committed_date = req.committed_date
            t.qc_passed = req.qc_passed
            t.optimized_route = req.optimized_route
            return {"status": "success", "message": "Fulfillment task updated"}
    raise HTTPException(status_code=404, detail="Task not found")

@app.post("/api/fulfillment/optimize")
async def optimize_fulfillment() -> dict[str, str]:
    for t in DYNAMIC_FULFILLMENT:
        t.optimized_route = fulfillment_agent.optimize_route(t)
    return {"status": "success", "message": "All fulfillment routes optimized"}

class RetryPaymentRequest(BaseModel):
    payment_id: str

@app.post("/api/payment/retry")
async def retry_payment(req: RetryPaymentRequest) -> dict[str, str]:
    for p in DYNAMIC_PAYMENTS:
        if p.payment_id == req.payment_id:
            success, msg = reconciliation_agent.retry_failed_payment(p)
            if success:
                p.status = "succeeded"
                return {"status": "success", "message": msg}
            else:
                return {"status": "error", "message": msg}
    raise HTTPException(status_code=404, detail="Payment not found")

class RefundPaymentRequest(BaseModel):
    payment_id: str

@app.post("/api/payment/refund")
async def refund_payment(req: RefundPaymentRequest) -> dict[str, str]:
    for p in DYNAMIC_PAYMENTS:
        if p.payment_id == req.payment_id:
            msg = reconciliation_agent.process_refund(p)
            p.status = "refunded"
            return {"status": "success", "message": msg}
    raise HTTPException(status_code=404, detail="Payment not found")

@app.post("/api/payment/close-period")
async def close_period() -> dict[str, str]:
    total_paid = sum(p.amount for p in DYNAMIC_PAYMENTS if p.status == "succeeded")
    total_invoiced = sum(inv.total for inv in DYNAMIC_INVOICES)
    net_receivables = round(total_invoiced - total_paid, 2)
    return {
        "status": "success",
        "message": f"Financial period closed. Settled payments: ${total_paid:,.2f}. Accounts Receivable balance: ${net_receivables:,.2f}."
    }

class DisputeInvoiceRequest(BaseModel):
    invoice_no: str
    disputed: bool

@app.post("/api/invoice/dispute")
async def dispute_invoice(req: DisputeInvoiceRequest) -> dict[str, Any]:
    for inv in DYNAMIC_INVOICES:
        if inv.invoice_no == req.invoice_no:
            inv.disputed = req.disputed
            inv.status = "disputed" if req.disputed else "validated"
            actions = invoice_agent.triage_dispute(inv) if req.disputed else []
            return {
                "status": "success",
                "message": f"Invoice dispute state set to {req.disputed}",
                "actions": actions
            }
    raise HTTPException(status_code=404, detail="Invoice not found")

@app.get("/api/reports/revenue-recognition")
async def get_revenue_recognition():
    schedule = []
    customers = set(inv.customer_name for inv in DYNAMIC_INVOICES)
    for customer in customers:
        contract_val = sum(inv.total for inv in DYNAMIC_INVOICES if inv.customer_name == customer)
        recognized = round(contract_val * (2.0/3.0), 2)
        deferred = round(contract_val * (1.0/3.0), 2)
        schedule.append({
            "name": customer,
            "contract": contract_val,
            "recognized": recognized,
            "deferred": deferred
        })
    return schedule


