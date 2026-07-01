from __future__ import annotations

from datetime import date

from ..models import OrderPayload, PriorityResult


class PrioritizationAgent:
    def score(self, order: OrderPayload) -> PriorityResult:
        tier_weight = {"gold": 95, "silver": 78, "standard": 60}.get(order.customer_tier.lower(), 50)
        revenue_weight = min(100, int((order.total_amount / 5000) * 100))
        days_until_due = max(0, (order.delivery_date - date.today()).days)
        deadline_weight = 100 if days_until_due <= 2 else 82 if days_until_due <= 5 else 65 if days_until_due <= 10 else 45
        complexity_weight = max(30, 100 - (len(order.items) - 1) * 12)
        score = round(
            tier_weight * 0.4
            + revenue_weight * 0.3
            + deadline_weight * 0.2
            + complexity_weight * 0.1
        )

        rationale = [
            f"{order.customer_tier.title()} customer tier",
            f"${order.total_amount:,.2f} order value",
            f"{days_until_due} days until committed delivery",
            f"{len(order.items)} line item complexity",
        ]
        return PriorityResult(
            score=score,
            tier_weight=tier_weight,
            revenue_weight=revenue_weight,
            deadline_weight=deadline_weight,
            complexity_weight=complexity_weight,
            rationale=rationale,
        )

