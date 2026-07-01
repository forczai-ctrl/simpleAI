import json
from ..models import Acknowledgement, OrderPayload
from .llm import query_llm

SYSTEM_PROMPT = """You are an AI customer communications agent.
Your task is to draft a polite, professional, and personalized order acknowledgment email to a customer.
You must return a JSON object with two fields:
1. "subject": A concise, professional email subject line referencing the PO number.
2. "body": A friendly, professional email body acknowledging the order details (including items, delivery date, payment terms, and region). Adjust the tone based on the customer tier (e.g. gold, silver, standard), making it particularly warm and appreciative for premium gold/silver tiers.

Only return the JSON object, with no markdown wrappers or additional text.
"""


class CommunicationAgent:
    async def acknowledge(self, order: OrderPayload) -> Acknowledgement:
        line_summary = ", ".join(f"{item.quantity} x {item.sku}" for item in order.items)
        
        try:
            user_prompt = (
                f"Customer: {order.customer_name} ({order.customer_tier} tier)\n"
                f"PO Number: {order.po_number}\n"
                f"Items: {line_summary}\n"
                f"Delivery Date: {order.delivery_date.isoformat()}\n"
                f"Payment Terms: {order.payment_terms}\n"
                f"Region: {order.ship_to_region}\n"
            )
            
            llm_result = await query_llm(SYSTEM_PROMPT, user_prompt, response_format="json")
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
            subject = data.get("subject") or f"Order {order.po_number} received"
            body = data.get("body") or (
                f"Hello {order.customer_name}, we received {order.po_number} for {line_summary}."
            )
            
            return Acknowledgement(
                to_customer=order.customer_name,
                subject=subject,
                body=body,
                next_step="Validation complete; route to fulfillment queue.",
            )
            
        except Exception as e:
            print(f"Acknowledgement generation error: {e}. Falling back to template.")
            return Acknowledgement(
                to_customer=order.customer_name,
                subject=f"Order {order.po_number} received",
                body=(
                    f"Hello {order.customer_name}, we received {order.po_number} for {line_summary}. "
                    f"Your requested delivery date is {order.delivery_date.isoformat()} and payment terms are {order.payment_terms}. "
                    "Our operations team will notify you as fulfillment milestones are completed."
                ),
                next_step="Validation complete; route to fulfillment queue.",
            )


