from __future__ import annotations

import os
import json
from datetime import date

from .models import OrderPayload, OrderItem, FulfillmentTask, Invoice, InvoiceLine, Payment


# Determine path to the JSON database relative to this module's location
current_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(current_dir, "db_mock.json")

# Load seed data from the JSON database file
with open(json_path, "r", encoding="utf-8") as f:
    db_data = json.load(f)


CATALOG = db_data["catalog"]
CUSTOMERS = db_data["customers"]
SAMPLE_RAW_ORDER = db_data["raw_order_template"]


SAMPLE_ORDERS = []
for o in db_data["orders"]:
    items = [
        OrderItem(
            sku=item["sku"],
            description=item["description"],
            quantity=item["quantity"],
            unit_price=item["unit_price"]
        ) for item in o["items"]
    ]
    SAMPLE_ORDERS.append(
        OrderPayload(
            customer_name=o["customer_name"],
            po_number=o["po_number"],
            items=items,
            delivery_date=date.fromisoformat(o["delivery_date"]),
            payment_terms=o["payment_terms"],
            channel=o["channel"],
            ship_to_region=o["ship_to_region"],
            customer_tier=o["customer_tier"],
            credit_limit=o["credit_limit"],
            current_balance=o["current_balance"],
            status=o["status"],
        )
    )


SAMPLE_FULFILLMENT = []
for f in db_data["fulfillment"]:
    SAMPLE_FULFILLMENT.append(
        FulfillmentTask(
            order_id=f["order_id"],
            po_number=f["po_number"],
            customer_name=f["customer_name"],
            stage=f["stage"],
            owner=f["owner"],
            committed_date=date.fromisoformat(f["committed_date"]),
            risk=f["risk"],
        )
    )


SAMPLE_INVOICES = []
for inv in db_data["invoices"]:
    lines = [
        InvoiceLine(
            sku=line["sku"],
            description=line["description"],
            quantity=line["quantity"],
            unit_price=line["unit_price"],
            amount=line["amount"]
        ) for line in inv["lines"]
    ]
    SAMPLE_INVOICES.append(
        Invoice(
            invoice_no=inv["invoice_no"],
            po_number=inv["po_number"],
            customer_name=inv["customer_name"],
            invoice_date=date.fromisoformat(inv["invoice_date"]),
            due_date=date.fromisoformat(inv["due_date"]),
            subtotal=inv["subtotal"],
            tax=inv["tax"],
            total=inv["total"],
            status=inv["status"],
            lines=lines,
        )
    )


SAMPLE_PAYMENTS = []
for p in db_data["payments"]:
    SAMPLE_PAYMENTS.append(
        Payment(
            payment_id=p["payment_id"],
            customer_name=p["customer_name"],
            amount=p["amount"],
            received_date=date.fromisoformat(p["received_date"]),
            reference=p["reference"],
        )
    )


SAMPLE_EXCEPTIONS = db_data["exceptions"]
SAMPLE_VENDORS = db_data["vendors"]
USE_CASES = db_data["use_cases"]
