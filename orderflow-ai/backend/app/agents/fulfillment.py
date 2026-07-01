from __future__ import annotations

from ..models import FulfillmentTask, OrderPayload


class FulfillmentAgent:
    def schedule(self, order: OrderPayload) -> FulfillmentTask:
        risk = "high" if order.total_amount > 5000 else "medium" if len(order.items) > 2 else "low"
        owner = "Ops Team A" if order.ship_to_region in {"TX", "OK", "LA"} else "Ops Team B"
        return FulfillmentTask(
            order_id=f"ord-{order.po_number.lower().replace('po-', '')}",
            po_number=order.po_number,
            customer_name=order.customer_name,
            stage="pending",
            owner=owner,
            committed_date=order.delivery_date,
            risk=risk,
        )

