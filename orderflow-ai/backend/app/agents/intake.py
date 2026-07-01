from __future__ import annotations

import json
import re
from datetime import date

from ..data import CATALOG, CUSTOMERS, SAMPLE_RAW_ORDER
from ..models import ExtractionRequest, OrderItem, OrderPayload
from .llm import query_llm

SYSTEM_PROMPT = """You are an AI order processing agent.
Your task is to parse unstructured order texts (emails, forms, transcripts) and extract structured fields into a single JSON object.
The JSON object must strictly match the following JSON Schema:
{
  "customer_name": "string (The name of the customer, e.g., 'Northstar Market', 'Bluebird Foods')",
  "po_number": "string (The purchase order number, e.g., 'PO-2001')",
  "delivery_date": "string (The delivery date in YYYY-MM-DD format)",
  "payment_terms": "string (e.g. 'NET 30', 'NET 15')",
  "ship_to_region": "string (2-letter US state code, e.g., 'TX', 'CA')",
  "items": [
    {
      "sku": "string (The product SKU, e.g., 'SKU-COFFEE-12')",
      "description": "string (Description of the item)",
      "quantity": "integer (Quantity ordered)",
      "unit_price": "number (Price per unit)"
    }
  ]
}

Only return the JSON object, with no markdown wrappers or additional text.
"""


class OrderIntakeAgent:
    """Extract structured order fields from email/PDF text.

    The interface is intentionally narrow so OCR, Docling, and Ollama can be
    plugged in later without changing API routes or frontend contracts.
    """

    async def extract(self, request: ExtractionRequest) -> OrderPayload:
        text = (request.raw_text or SAMPLE_RAW_ORDER).replace("\\n", "\n").replace("`n", "\n")
        
        try:
            llm_result = await query_llm(SYSTEM_PROMPT, text, response_format="json")
            if not llm_result:
                raise ValueError("Empty response from LLM")
                
            cleaned = llm_result.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
                
            data = json.loads(cleaned)
            
            customer_name = data.get("customer_name") or "Northstar Market"
            customer = CUSTOMERS.get(customer_name, CUSTOMERS["Northstar Market"])
            
            po_number = data.get("po_number") or "PO-1048"
            ship_to_region = data.get("ship_to_region") or "TX"
            payment_terms = data.get("payment_terms") or "NET 30"
            delivery = data.get("delivery_date") or "2026-07-05"
            
            items = []
            for item in data.get("items", []):
                sku = str(item.get("sku", "")).upper()
                catalog_item = CATALOG.get(sku, {})
                items.append(
                    OrderItem(
                        sku=sku or "SKU-UNKNOWN",
                        description=item.get("description") or catalog_item.get("description") or "Customer requested item",
                        quantity=int(item.get("quantity") or 1),
                        unit_price=float(item.get("unit_price") or catalog_item.get("contract_price") or 0.0)
                    )
                )
                
            if not items:
                raise ValueError("No items found in LLM extraction")
                
            return OrderPayload(
                customer_name=customer_name,
                po_number=po_number,
                items=items,
                delivery_date=date.fromisoformat(delivery),
                payment_terms=payment_terms,
                channel=request.channel,
                ship_to_region=ship_to_region,
                customer_tier=customer["tier"],
                credit_limit=customer["credit_limit"],
                current_balance=customer["current_balance"],
                status="extracted",
            )
            
        except Exception as e:
            # Fall back to regex parsing on error or timeout
            print(f"Extraction error: {e}. Falling back to regex parsing.")
            customer_name = self._find(text, r"Customer\s*:\s*([^\r\n]+)", "Northstar Market")
            po_number = self._find(text, r"\b(PO[-\s]?\d+)\b", "PO-1048").replace(" ", "-")
            ship_to_region = self._find(text, r"Ship To Region\s*:\s*([A-Z]{2})", "TX")
            payment_terms = self._find(text, r"Payment Terms\s*:\s*([A-Z]+\s*\d+)", "NET 30")
            delivery = self._find(text, r"Delivery Date\s*:\s*(\d{4}-\d{2}-\d{2})", "2026-07-05")
            items = self._extract_items(text)
            customer = CUSTOMERS.get(customer_name, CUSTOMERS["Northstar Market"])

            return OrderPayload(
                customer_name=customer_name,
                po_number=po_number,
                items=items,
                delivery_date=date.fromisoformat(delivery),
                payment_terms=payment_terms,
                channel=request.channel,
                ship_to_region=ship_to_region,
                customer_tier=customer["tier"],
                credit_limit=customer["credit_limit"],
                current_balance=customer["current_balance"],
                status="extracted",
            )

    def _extract_items(self, text: str) -> list[OrderItem]:
        pattern = re.compile(
            r"(SKU-[A-Z0-9-]+).*?(?:Qty|Quantity)\s*:?\s*(\d+).*?(?:Price|Unit Price)\s*:?\s*\$?(\d+(?:\.\d{1,2})?)",
            re.IGNORECASE,
        )
        items = []
        for sku, quantity, price in pattern.findall(text):
            catalog_item = CATALOG.get(sku.upper(), {})
            items.append(
                OrderItem(
                    sku=sku.upper(),
                    description=str(catalog_item.get("description", "Customer requested item")),
                    quantity=int(quantity),
                    unit_price=float(price),
                )
            )

        if items:
            return items

        return [
            OrderItem(sku="SKU-COFFEE-12", description="Wholesale coffee cartons", quantity=18, unit_price=48),
            OrderItem(sku="SKU-TEA-24", description="Specialty tea trays", quantity=10, unit_price=36),
        ]

    def _find(self, text: str, pattern: str, default: str) -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        return match.group(1).strip() if match else default

