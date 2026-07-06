from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, computed_field


CheckStatus = Literal["pass", "warning", "fail"]
OrderStatus = Literal[
    "received",
    "extracted",
    "validated",
    "scheduled",
    "fulfilled",
    "invoiced",
    "paid",
    "exception",
]


class OrderItem(BaseModel):
    sku: str
    description: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)

    @computed_field
    @property
    def line_total(self) -> float:
        return round(self.quantity * self.unit_price, 2)


class OrderPayload(BaseModel):
    customer_name: str
    po_number: str
    items: list[OrderItem]
    delivery_date: date
    payment_terms: str = "NET 30"
    channel: str = "email"
    ship_to_region: str = "TX"
    customer_tier: str = "standard"
    credit_limit: float = 10000
    current_balance: float = 0
    status: OrderStatus = "received"

    @computed_field
    @property
    def total_amount(self) -> float:
        return round(sum(item.line_total for item in self.items), 2)


class ExtractionRequest(BaseModel):
    raw_text: str | None = None
    filename: str | None = None
    channel: str = "email"


class ValidationCheck(BaseModel):
    name: str
    status: CheckStatus
    detail: str


class PriorityResult(BaseModel):
    score: int
    tier_weight: int
    revenue_weight: int
    deadline_weight: int
    complexity_weight: int
    rationale: list[str]


class ValidationResult(BaseModel):
    order: OrderPayload
    checks: list[ValidationCheck]
    approved: bool
    exceptions: list[str]
    priority: PriorityResult


class Acknowledgement(BaseModel):
    to_customer: str
    subject: str
    body: str
    next_step: str


class FulfillmentTask(BaseModel):
    order_id: str
    po_number: str
    customer_name: str
    stage: Literal["pending", "in_progress", "blocked", "completed"]
    owner: str
    committed_date: date
    risk: Literal["low", "medium", "high"]
    qc_passed: bool = True
    optimized_route: str = "Standard Ground Route"


class InvoiceLine(BaseModel):
    sku: str
    description: str
    quantity: int
    unit_price: float
    amount: float


class Invoice(BaseModel):
    invoice_no: str
    po_number: str
    customer_name: str
    invoice_date: date
    due_date: date
    subtotal: float
    tax: float
    total: float
    status: Literal["draft", "validated", "sent", "paid", "overdue", "disputed"] = "draft"
    lines: list[InvoiceLine]
    billing_type: str = "one_time"
    disputed: bool = False


class InvoiceValidationResult(BaseModel):
    invoice: Invoice
    checks: list[ValidationCheck]
    approved: bool


class Payment(BaseModel):
    payment_id: str
    customer_name: str
    amount: float
    received_date: date
    reference: str | None = None
    status: Literal["succeeded", "failed", "refunded"] = "succeeded"


class ReconciliationResult(BaseModel):
    payment: Payment
    matched_invoice_no: str | None
    confidence: float
    status: Literal["matched", "partial", "unmatched"]
    notes: list[str]


class CollectionReminderRequest(BaseModel):
    invoice_no: str
    customer_name: str
    amount_due: float
    days_overdue: int
    contact_name: str = "Accounts Payable"


class CollectionReminder(BaseModel):
    invoice_no: str
    tone: Literal["friendly", "firm", "escalation"]
    subject: str
    body: str
    recommended_action: str


class DashboardMetric(BaseModel):
    label: str
    value: str
    change: str
    tone: Literal["good", "warning", "critical", "neutral"]


class DashboardResponse(BaseModel):
    metrics: list[DashboardMetric]
    orders: list[OrderPayload]
    fulfillment: list[FulfillmentTask]
    invoices: list[Invoice]
    payments: list[Payment]
    exceptions: list[dict[str, str | None]]


class PipelineRun(BaseModel):
    extraction: OrderPayload
    validation: ValidationResult
    acknowledgement: Acknowledgement
    invoice: Invoice
    invoice_validation: InvoiceValidationResult


class InventoryItem(BaseModel):
    sku: str
    description: str
    active: bool
    contract_price: float
    available_qty: int
    minimum_order_qty: int


class Vendor(BaseModel):
    id: str
    name: str
    contact: str
    rating: float
    status: str
    category: str
    active_pos: int


class ExceptionItem(BaseModel):
    id: str
    type: str
    severity: Literal["low", "medium", "high"]
    owner: str
    status: Literal["open", "resolved"]
    detail: str
    order_id: str | None = None
    invoice_id: str | None = None


class ReplenishRequest(BaseModel):
    sku: str
    quantity: int


class ProcureRequest(BaseModel):
    vendor_id: str


class ResolveExceptionRequest(BaseModel):
    exception_id: str


class ErpSyncLog(BaseModel):
    timestamp: str
    status: Literal["synced", "failed"]
    po_number: str
    customer_name: str
    type: Literal["order", "invoice", "payment"]
    payload: str



