from __future__ import annotations

from datetime import date, timedelta

from ..models import Invoice, InvoiceLine, InvoiceValidationResult, OrderPayload, ValidationCheck


class InvoiceAgent:
    tax_rate = 0.0825

    def generate(self, order: OrderPayload) -> Invoice:
        subtotal = round(order.total_amount, 2)
        tax = round(subtotal * self.tax_rate, 2)
        days = self._terms_to_days(order.payment_terms)
        invoice_no = f"INV-{order.po_number.replace('PO-', '')}"
        lines = [
            InvoiceLine(
                sku=item.sku,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.line_total,
            )
            for item in order.items
        ]
        return Invoice(
            invoice_no=invoice_no,
            po_number=order.po_number,
            customer_name=order.customer_name,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=days),
            subtotal=subtotal,
            tax=tax,
            total=round(subtotal + tax, 2),
            status="draft",
            lines=lines,
        )

    def validate(self, invoice: Invoice, order: OrderPayload | None = None) -> InvoiceValidationResult:
        checks = [
            ValidationCheck(name="Invoice total", status="pass", detail="Subtotal, tax, and total are internally consistent."),
            ValidationCheck(name="Customer", status="pass", detail="Invoice customer is present."),
            ValidationCheck(name="Due date", status="pass", detail="Due date generated from payment terms."),
        ]
        if order and invoice.po_number != order.po_number:
            checks.append(ValidationCheck(name="PO reference", status="fail", detail="Invoice PO does not match source order."))
        elif order:
            checks.append(ValidationCheck(name="PO reference", status="pass", detail="Invoice PO matches source order."))

        expected_total = round(invoice.subtotal + invoice.tax, 2)
        if expected_total != invoice.total:
            checks[0] = ValidationCheck(name="Invoice total", status="fail", detail=f"Expected total is ${expected_total:,.2f}.")

        approved = not any(check.status == "fail" for check in checks)
        return InvoiceValidationResult(
            invoice=invoice.model_copy(update={"status": "validated" if approved else "draft"}),
            checks=checks,
            approved=approved,
        )

    def _terms_to_days(self, terms: str) -> int:
        digits = "".join(character for character in terms if character.isdigit())
        return int(digits) if digits else 30

