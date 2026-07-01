from __future__ import annotations

from ..data import CATALOG, CUSTOMERS
from ..models import OrderPayload, ValidationCheck, ValidationResult
from .prioritization import PrioritizationAgent


class ValidationAgent:
    def __init__(self) -> None:
        self.prioritization = PrioritizationAgent()

    def validate(self, order: OrderPayload) -> ValidationResult:
        checks: list[ValidationCheck] = []
        exceptions: list[str] = []

        customer = CUSTOMERS.get(order.customer_name)
        if customer:
            checks.append(ValidationCheck(name="Customer record", status="pass", detail="Customer exists in master data."))
        else:
            checks.append(ValidationCheck(name="Customer record", status="fail", detail="Customer is not in master data."))
            exceptions.append("Unknown customer")

        projected_balance = order.current_balance + order.total_amount
        if projected_balance <= order.credit_limit:
            checks.append(ValidationCheck(name="Credit limit", status="pass", detail=f"Projected balance ${projected_balance:,.2f} is within limit."))
        else:
            checks.append(ValidationCheck(name="Credit limit", status="fail", detail=f"Projected balance ${projected_balance:,.2f} exceeds ${order.credit_limit:,.2f}."))
            exceptions.append("Credit limit exceeded")

        if customer and order.ship_to_region in customer["service_regions"]:
            checks.append(ValidationCheck(name="Serviceability", status="pass", detail=f"{order.ship_to_region} is serviceable."))
        else:
            checks.append(ValidationCheck(name="Serviceability", status="fail", detail=f"{order.ship_to_region} is not currently serviceable."))
            exceptions.append("Out-of-region delivery")

        for item in order.items:
            catalog_item = CATALOG.get(item.sku)
            if not catalog_item:
                checks.append(ValidationCheck(name=f"{item.sku} catalog", status="fail", detail="SKU does not exist in catalog."))
                exceptions.append(f"{item.sku} missing from catalog")
                continue
            if not catalog_item["active"]:
                checks.append(ValidationCheck(name=f"{item.sku} status", status="fail", detail="SKU is inactive."))
                exceptions.append(f"{item.sku} inactive")
            else:
                checks.append(ValidationCheck(name=f"{item.sku} status", status="pass", detail="SKU is active."))

            if item.quantity < int(catalog_item["moq"]):
                checks.append(ValidationCheck(name=f"{item.sku} MOQ", status="warning", detail=f"Quantity is below MOQ {catalog_item['moq']}."))
                exceptions.append(f"{item.sku} below MOQ")
            else:
                checks.append(ValidationCheck(name=f"{item.sku} MOQ", status="pass", detail="Minimum order quantity met."))

            if item.quantity <= int(catalog_item["available"]):
                checks.append(ValidationCheck(name=f"{item.sku} inventory", status="pass", detail=f"{catalog_item['available']} units available."))
            else:
                checks.append(ValidationCheck(name=f"{item.sku} inventory", status="fail", detail=f"Only {catalog_item['available']} units available."))
                exceptions.append(f"{item.sku} inventory shortage")

            if abs(item.unit_price - float(catalog_item["contract_price"])) <= 0.01:
                checks.append(ValidationCheck(name=f"{item.sku} price", status="pass", detail="Unit price matches contract."))
            else:
                checks.append(ValidationCheck(name=f"{item.sku} price", status="warning", detail=f"Contract price is ${catalog_item['contract_price']:.2f}."))
                exceptions.append(f"{item.sku} price mismatch")

        approved = not any(check.status == "fail" for check in checks)
        status_order = order.model_copy(update={"status": "validated" if approved else "exception"})
        return ValidationResult(
            order=status_order,
            checks=checks,
            approved=approved,
            exceptions=exceptions,
            priority=self.prioritization.score(order),
        )

