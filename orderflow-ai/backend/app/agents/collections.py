import json
from ..models import CollectionReminder, CollectionReminderRequest
from .llm import query_llm

SYSTEM_PROMPT = """You are an AI financial collections agent.
Your task is to draft a polite but effective collections reminder email for an overdue invoice.
You must return a JSON object with three fields:
1. "subject": A professional subject line referencing the invoice number.
2. "body": The email body asking for payment.
3. "recommended_action": A brief recommendation for the next operations/finance team action (referencing the suggested default action).

Adapt the email body tone dynamically based on the "tone" parameter:
- "friendly": Keep it warm, polite, and assuming it's a simple oversight.
- "firm": Keep it professional, direct, and slightly urgent, asking for payment status.
- "escalation": Keep it formal, serious, and outline necessary next steps or account reviews.

Only return the JSON object, with no markdown wrappers or additional text.
"""


class CollectionsAgent:
    async def remind(self, request: CollectionReminderRequest) -> CollectionReminder:
        if request.days_overdue <= 7:
            tone = "friendly"
            recommended_action = "Send reminder and monitor for payment."
        elif request.days_overdue <= 30:
            tone = "firm"
            recommended_action = "Send reminder and flag account owner for follow-up."
        else:
            tone = "escalation"
            recommended_action = "Route to finance lead for phone call and credit hold review."

        try:
            user_prompt = (
                f"Invoice Number: {request.invoice_no}\n"
                f"Customer Name: {request.customer_name}\n"
                f"Contact Person: {request.contact_name}\n"
                f"Amount Due: ${request.amount_due:,.2f}\n"
                f"Days Overdue: {request.days_overdue}\n"
                f"Tone: {tone}\n"
                f"Suggested default action: {recommended_action}\n"
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
            subject = data.get("subject") or f"Payment reminder for {request.invoice_no}"
            body = data.get("body") or (
                f"Hello {request.contact_name}, our records show invoice {request.invoice_no} "
                f"for ${request.amount_due:,.2f} is {request.days_overdue} days overdue. "
                "Please share payment timing or any documentation needed from our team."
            )
            rec_action = data.get("recommended_action") or recommended_action
            
            return CollectionReminder(
                invoice_no=request.invoice_no,
                tone=tone,
                subject=subject,
                body=body,
                recommended_action=rec_action,
            )
            
        except Exception as e:
            print(f"Collections reminder generation error: {e}. Falling back to template.")
            subject = f"Payment reminder for {request.invoice_no}"
            body = (
                f"Hello {request.contact_name}, our records show invoice {request.invoice_no} "
                f"for ${request.amount_due:,.2f} is {request.days_overdue} days overdue. "
                "Please share payment timing or any documentation needed from our team."
            )
            return CollectionReminder(
                invoice_no=request.invoice_no,
                tone=tone,
                subject=subject,
                body=body,
                recommended_action=recommended_action,
            )


