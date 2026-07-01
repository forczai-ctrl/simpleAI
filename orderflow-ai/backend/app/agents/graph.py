from __future__ import annotations

from ..models import ExtractionRequest, PipelineRun
from .communications import CommunicationAgent
from .intake import OrderIntakeAgent
from .invoice import InvoiceAgent
from .validation import ValidationAgent

try:
    from langgraph.graph import StateGraph  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    StateGraph = None


class OrderToCashGraph:
    """LangGraph-shaped pipeline with a deterministic fallback runtime."""

    nodes = [
        "extract_order",
        "validate_order",
        "acknowledge_order",
        "generate_invoice",
        "validate_invoice",
    ]

    def __init__(self) -> None:
        self.intake = OrderIntakeAgent()
        self.validation = ValidationAgent()
        self.communication = CommunicationAgent()
        self.invoice = InvoiceAgent()

    async def run(self, request: ExtractionRequest) -> PipelineRun:
        order = await self.intake.extract(request)
        validation = self.validation.validate(order)
        acknowledgement = await self.communication.acknowledge(validation.order)
        invoice = self.invoice.generate(validation.order)
        invoice_validation = self.invoice.validate(invoice, validation.order)
        return PipelineRun(
            extraction=order,
            validation=validation,
            acknowledgement=acknowledgement,
            invoice=invoice,
            invoice_validation=invoice_validation,
        )

    def describe(self) -> dict[str, object]:
        return {
            "runtime": "langgraph" if StateGraph else "deterministic-fallback",
            "nodes": self.nodes,
            "edges": [
                ["extract_order", "validate_order"],
                ["validate_order", "acknowledge_order"],
                ["acknowledge_order", "generate_invoice"],
                ["generate_invoice", "validate_invoice"],
            ],
        }

