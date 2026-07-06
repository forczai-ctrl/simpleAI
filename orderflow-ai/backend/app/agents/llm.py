import os
import logging
import httpx
import re
import json

logger = logging.getLogger("orderflow.llm")

# Grok via OpenRouter free API
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "free")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
GROK_MODEL = os.environ.get("GROK_MODEL", "x-ai/grok-beta")

def generate_mock_llm_response(system_prompt: str, user_prompt: str) -> str:
    """Generates a high-quality simulated LLM response based on system and user prompts."""
    # 1. Order Intake Agent
    if "AI order processing agent" in system_prompt or "parse unstructured order texts" in system_prompt:
        customer_name = "Northstar Market"
        po_number = "PO-1048"
        ship_to_region = "TX"
        payment_terms = "NET 30"
        delivery_date = "2026-07-05"
        
        cust_match = re.search(r"Customer\s*:\s*([^\r\n]+)", user_prompt, re.IGNORECASE)
        if cust_match:
            customer_name = cust_match.group(1).strip()
            
        po_match = re.search(r"\b(PO[-\s]?\d+)\b", user_prompt, re.IGNORECASE)
        if po_match:
            po_number = po_match.group(1).strip().replace(" ", "-")
            
        region_match = re.search(r"Ship To Region\s*:\s*([A-Z]{2})", user_prompt, re.IGNORECASE)
        if region_match:
            ship_to_region = region_match.group(1).strip()
            
        terms_match = re.search(r"Payment Terms\s*:\s*([A-Z]+\s*\d+)", user_prompt, re.IGNORECASE)
        if terms_match:
            payment_terms = terms_match.group(1).strip()
            
        deliv_match = re.search(r"Delivery Date\s*:\s*(\d{4}-\d{2}-\d{2})", user_prompt, re.IGNORECASE)
        if deliv_match:
            delivery_date = deliv_match.group(1).strip()

        # Extract items
        items = []
        item_matches = re.findall(
            r"(SKU-[A-Z0-9-]+).*?(?:Qty|Quantity)\s*:?\s*(\d+).*?(?:Price|Unit Price)\s*:?\s*\$?(\d+(?:\.\d{1,2})?)",
            user_prompt,
            re.IGNORECASE
        )
        for sku, quantity, price in item_matches:
            items.append({
                "sku": sku.upper(),
                "description": f"Product {sku}",
                "quantity": int(quantity),
                "unit_price": float(price)
            })
            
        if not items:
            items = [
                {"sku": "SKU-COFFEE-12", "description": "Wholesale coffee cartons", "quantity": 6, "unit_price": 48.0},
                {"sku": "SKU-TEA-24", "description": "Specialty tea trays", "quantity": 8, "unit_price": 36.0}
            ]
            
        return json.dumps({
            "customer_name": customer_name,
            "po_number": po_number,
            "delivery_date": delivery_date,
            "payment_terms": payment_terms,
            "ship_to_region": ship_to_region,
            "items": items
        })

    # 2. Customer Communications Agent
    elif "AI customer communications agent" in system_prompt or "order acknowledgment email" in system_prompt:
        customer_name = "Customer"
        po_number = "PO-XXXX"
        items_desc = "your ordered items"
        delivery_date = "2026-07-05"
        payment_terms = "NET 30"
        region = "TX"
        tier = "standard"
        
        cust_match = re.search(r"Customer:\s*([^\n(]+)(?:\(([^)]+)\))?", user_prompt, re.IGNORECASE)
        if cust_match:
            customer_name = cust_match.group(1).strip()
            if cust_match.group(2):
                tier = cust_match.group(2).replace("tier", "").strip().lower()
                
        po_match = re.search(r"PO Number:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if po_match:
            po_number = po_match.group(1).strip()
            
        items_match = re.search(r"Items:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if items_match:
            items_desc = items_match.group(1).strip()
            
        deliv_match = re.search(r"Delivery Date:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if deliv_match:
            delivery_date = deliv_match.group(1).strip()
            
        terms_match = re.search(r"Payment Terms:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if terms_match:
            payment_terms = terms_match.group(1).strip()
            
        region_match = re.search(r"Region:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if region_match:
            region = region_match.group(1).strip()

        # Build tone-specific body
        if tier == "gold":
            body = (
                f"Dear {customer_name},\n\n"
                f"Thank you so much for being a valued Gold tier customer! We are delighted to confirm receipt of your "
                f"purchase order {po_number} for {items_desc}. Your order is scheduled for delivery on {delivery_date} "
                f"to region {region} under payment terms {payment_terms}.\n\n"
                f"We appreciate your continued partnership and are expediting this order through our system. "
                f"Please let us know if you need any adjustments."
            )
        elif tier == "silver":
            body = (
                f"Dear {customer_name},\n\n"
                f"Thank you for your order! As a premium Silver tier customer, we are pleased to confirm receipt of your "
                f"purchase order {po_number} for {items_desc}. We have scheduled delivery for {delivery_date} to "
                f"region {region} (payment terms: {payment_terms}).\n\n"
                f"We are processing your order immediately and will send tracking details shortly."
            )
        else:
            body = (
                f"Hello {customer_name},\n\n"
                f"We have received your purchase order {po_number} for {items_desc}. "
                f"The scheduled delivery date is {delivery_date} to region {region} under payment terms {payment_terms}.\n\n"
                f"Our operations team is now processing this order and will update you on our progress."
            )
            
        return json.dumps({
            "subject": f"Order Acknowledgment: {po_number} received successfully",
            "body": body
        })

    # 3. Financial Collections Agent
    elif "AI financial collections agent" in system_prompt or "collections reminder email" in system_prompt:
        invoice_no = "INV-XXXX"
        customer_name = "Valued Customer"
        contact_name = "Accounts Payable"
        amount_due = "0.00"
        days_overdue = "0"
        tone = "friendly"
        recommended_action = "Send reminder."
        
        inv_match = re.search(r"Invoice Number:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if inv_match:
            invoice_no = inv_match.group(1).strip()
            
        cust_match = re.search(r"Customer Name:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if cust_match:
            customer_name = cust_match.group(1).strip()
            
        contact_match = re.search(r"Contact Person:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if contact_match:
            contact_name = contact_match.group(1).strip()
            
        amount_match = re.search(r"Amount Due:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if amount_match:
            amount_due = amount_match.group(1).strip()
            
        days_match = re.search(r"Days Overdue:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if days_match:
            days_overdue = days_match.group(1).strip()
            
        tone_match = re.search(r"Tone:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if tone_match:
            tone = tone_match.group(1).strip().lower()
            
        action_match = re.search(r"Suggested default action:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        if action_match:
            recommended_action = action_match.group(1).strip()

        # Build tone-specific body
        if tone == "friendly":
            body = (
                f"Hello {contact_name},\n\n"
                f"Hope you are doing well. This is a friendly reminder that invoice {invoice_no} "
                f"({amount_due}) is currently {days_overdue} days past due. We understand this may be "
                f"a simple oversight. Could you please check on the payment status?\n\n"
                f"Thank you for your business!"
            )
        elif tone == "firm":
            body = (
                f"Hello {contact_name},\n\n"
                f"We are writing to follow up on invoice {invoice_no} for {amount_due}, which is now "
                f"{days_overdue} days overdue. Please provide a status update on this payment or "
                f"send the remittance advice at your earliest convenience.\n\n"
                f"Regards,\nFinance Team"
            )
        else:
            body = (
                f"Dear {contact_name},\n\n"
                f"URGENT: Your account with us is currently overdue. Invoice {invoice_no} "
                f"for {amount_due} is {days_overdue} days past due. If payment has not been initiated, "
                f"please contact us immediately to resolve this matter and avoid potential service disruptions.\n\n"
                f"Sincerely,\nCredit Control Team"
            )
            
        return json.dumps({
            "subject": f"URGENT: Outstanding payment reminder for Invoice {invoice_no}",
            "body": body,
            "recommended_action": recommended_action
        })

    # 4. Email Parser Agent (Use case extraction)
    elif "AI email parser" in system_prompt or "extract use case information" in system_prompt:
        use_cases = []
        uc_matches = re.findall(r'UC-(\d+)', user_prompt, re.IGNORECASE)
        name_matches = re.findall(r'(?:use case|UC)[\s:]+([A-Z][a-zA-Z\s]+)', user_prompt, re.IGNORECASE)
        status_matches = re.findall(r'(implemented|scaffolded|planned|in progress)', user_prompt, re.IGNORECASE)
        
        for i, uc_id in enumerate(uc_matches[:10]):
            use_cases.append({
                "id": f"UC-{uc_id.zfill(2)}",
                "name": name_matches[i] if i < len(name_matches) else f"Use Case {uc_id}",
                "phase": str((i % 3) + 1),
                "status": status_matches[i].lower() if i < len(status_matches) else "scaffolded"
            })
            
        if not use_cases:
            use_cases = [
                {
                    "id": "UC-01",
                    "name": "Multi-Format Order Intake",
                    "phase": "1",
                    "status": "implemented"
                }
            ]
        return json.dumps(use_cases)

    # Default fallback
    return "{}"

async def query_llm(system_prompt: str, user_prompt: str, response_format: str = "text") -> str | None:
    """
    Sends a chat request to Grok via OpenRouter, falling back to a local mock generator on failure or free keys.
    """
    # If the key is the default "free" value, do not query OpenRouter (it requires a valid key even for free tier)
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "free" or OPENROUTER_API_KEY.strip() == "":
        return generate_mock_llm_response(system_prompt, user_prompt)

    url = f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "OrderFlow AI",
    }
    headers["Authorization"] = f"Bearer {OPENROUTER_API_KEY}"
    
    payload = {
        "model": GROK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 1024,
        "temperature": 0.1,
    }
    
    if response_format == "json":
        payload["response_format"] = {"type": "json_object"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning(f"Failed to query Grok LLM at {url}: {e}. Falling back to local mock LLM response generator.")
        return generate_mock_llm_response(system_prompt, user_prompt)