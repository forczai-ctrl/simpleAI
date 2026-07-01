from __future__ import annotations

from ..models import Invoice, Payment, ReconciliationResult


class PaymentReconciliationAgent:
    def reconcile(self, payment: Payment, invoices: list[Invoice]) -> ReconciliationResult:
        reference = (payment.reference or "").upper()

        for invoice in invoices:
            if invoice.invoice_no.upper() in reference:
                status = "matched" if abs(payment.amount - invoice.total) < 0.01 else "partial"
                confidence = 0.98 if status == "matched" else 0.82
                notes = ["Matched by invoice reference."]
                if status == "partial":
                    notes.append(f"Payment amount differs from invoice total ${invoice.total:,.2f}.")
                return ReconciliationResult(
                    payment=payment,
                    matched_invoice_no=invoice.invoice_no,
                    confidence=confidence,
                    status=status,
                    notes=notes,
                )

        for invoice in invoices:
            same_customer = invoice.customer_name.lower() == payment.customer_name.lower()
            same_amount = abs(invoice.total - payment.amount) < 0.01
            if same_customer and same_amount:
                return ReconciliationResult(
                    payment=payment,
                    matched_invoice_no=invoice.invoice_no,
                    confidence=0.88,
                    status="matched",
                    notes=["Matched by customer and exact amount."],
                )

        return ReconciliationResult(
            payment=payment,
            matched_invoice_no=None,
            confidence=0.35,
            status="unmatched",
            notes=["No invoice reference or exact customer amount match found."],
        )

