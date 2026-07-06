"""
Email Service for OrderFlow AI

Handles sending transactional emails via SMTP (Gmail) for:
  - Order acknowledgements (PO received)
  - Invoice generation and sending
  - Fulfillment status updates
  - Order registry notifications
  - Use Case Coverage Summary reports

Configuration is read from app_config.json.
"""

from __future__ import annotations

import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Any

logger = logging.getLogger(__name__)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "app_config.json")


def _load_config() -> dict[str, Any]:
    """Load email configuration from app_config.json."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load config: {e}")
    return {}


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    attachments: list[tuple[str, str, bytes]] | None = None,
) -> dict[str, Any]:
    """
    Send an email via SMTP (Gmail).
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        body_text: Plain text email body
        body_html: Optional HTML email body
        attachments: List of (filename, mime_type, content_bytes) tuples
        
    Returns:
        dict: Result with status and message
    """
    config = _load_config()
    
    smtp_host = config.get("gmail_smtp_host", "smtp.gmail.com")
    smtp_port = config.get("gmail_smtp_port", 465)
    sender_email = config.get("gmail_email", "")
    app_password = config.get("gmail_app_password", "")
    
    if not sender_email or not app_password:
        logger.warning("Gmail credentials not configured. Email not sent.")
        return {
            "status": "skipped",
            "message": "Gmail credentials not configured. Set gmail_email and gmail_app_password in app_config.json.",
        }
    
    try:
        # Build message
        msg = MIMEMultipart("alternative" if body_html else "mixed")
        msg["From"] = sender_email
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Attach plain text
        msg.attach(MIMEText(body_text, "plain"))
        
        # Attach HTML if provided
        if body_html:
            msg.attach(MIMEText(body_html, "html"))
        
        # Attach files if provided
        if attachments:
            for filename, mime_type, content in attachments:
                part = MIMEBase(*mime_type.split("/", 1))
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={filename}",
                )
                msg.attach(part)
        
        # Send via SMTP
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(sender_email, app_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return {
            "status": "sent",
            "message": f"Email sent to {to_email}",
            "subject": subject,
        }
        
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed. Check gmail_email and gmail_app_password.")
        return {"status": "error", "message": "SMTP authentication failed. Check Gmail credentials."}
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        return {"status": "error", "message": f"SMTP error: {str(e)}"}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return {"status": "error", "message": str(e)}


def send_order_acknowledgement(
    customer_email: str,
    customer_name: str,
    po_number: str,
    items: list[dict[str, Any]],
    delivery_date: str,
    payment_terms: str,
    total_amount: float,
) -> dict[str, Any]:
    """
    Send order acknowledgement email when a PO is received.
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer name
        po_number: Purchase order number
        items: List of ordered items
        delivery_date: Expected delivery date
        payment_terms: Payment terms
        total_amount: Total order amount
        
    Returns:
        dict: Email send result
    """
    # Build items table for HTML
    items_html = "".join(
        f"<tr><td>{item.get('sku', '')}</td><td>{item.get('description', '')}</td>"
        f"<td align='center'>{item.get('quantity', 0)}</td>"
        f"<td align='right'>${item.get('unit_price', 0):.2f}</td>"
        f"<td align='right'>${item.get('quantity', 0) * item.get('unit_price', 0):.2f}</td></tr>"
        for item in items
    )
    
    subject = f"Order Confirmation - {po_number} - OrderFlow AI"
    
    body_text = f"""
Dear {customer_name},

Thank you for your order! We are pleased to confirm receipt of Purchase Order {po_number}.

ORDER SUMMARY:
  PO Number:     {po_number}
  Delivery Date: {delivery_date}
  Payment Terms: {payment_terms}
  Total Amount:  ${total_amount:.2f}

ITEMS ORDERED:
{chr(10).join(f'  - {item.get("sku", "")} x {item.get("quantity", 0)} @ ${item.get("unit_price", 0):.2f} = ${item.get("quantity", 0) * item.get("unit_price", 0):.2f}' for item in items)}

Your order has been received and is being processed. You will receive updates as it moves through fulfillment.

Best regards,
OrderFlow AI Operations Team
"""
    
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #245f5a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">Order Confirmation</h2>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{customer_name}</strong>,</p>
    <p>Thank you for your order! We are pleased to confirm receipt of <strong>{po_number}</strong>.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; font-weight: bold;">PO Number:</td><td style="padding: 8px;">{po_number}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Delivery Date:</td><td style="padding: 8px;">{delivery_date}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Payment Terms:</td><td style="padding: 8px;">{payment_terms}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Total Amount:</td><td style="padding: 8px; color: #245f5a; font-weight: bold;">${total_amount:.2f}</td></tr>
    </table>
    
    <h3 style="color: #245f5a;">Items Ordered</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #f4f7f4;">
        <th style="padding: 8px; text-align: left;">SKU</th>
        <th style="padding: 8px; text-align: left;">Description</th>
        <th style="padding: 8px; text-align: center;">Qty</th>
        <th style="padding: 8px; text-align: right;">Price</th>
        <th style="padding: 8px; text-align: right;">Total</th>
      </tr>
      {items_html}
    </table>
    
    <p style="margin-top: 20px; padding: 15px; background: #f4f7f4; border-radius: 5px;">
      Your order has been received and is being processed. You will receive updates as it moves through fulfillment.
    </p>
    
    <p>Best regards,<br><strong>OrderFlow AI Operations Team</strong></p>
  </div>
</div></body></html>
"""
    
    return send_email(
        to_email=customer_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
    )


def send_invoice_email(
    customer_email: str,
    customer_name: str,
    invoice_no: str,
    po_number: str,
    invoice_date: str,
    due_date: str,
    subtotal: float,
    tax: float,
    total: float,
    lines: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Send invoice email to customer.
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer name
        invoice_no: Invoice number
        po_number: Related PO number
        invoice_date: Invoice date
        due_date: Payment due date
        subtotal: Invoice subtotal
        tax: Tax amount
        total: Total amount
        lines: Invoice line items
        
    Returns:
        dict: Email send result
    """
    lines_html = "".join(
        f"<tr><td>{line.get('sku', '')}</td><td>{line.get('description', '')}</td>"
        f"<td align='center'>{line.get('quantity', 0)}</td>"
        f"<td align='right'>${line.get('unit_price', 0):.2f}</td>"
        f"<td align='right'>${line.get('amount', 0):.2f}</td></tr>"
        for line in lines
    )
    
    subject = f"Invoice {invoice_no} - {po_number} - OrderFlow AI"
    
    body_text = f"""
Dear {customer_name},

Please find your invoice {invoice_no} for Purchase Order {po_number}.

INVOICE SUMMARY:
  Invoice No:    {invoice_no}
  PO Number:     {po_number}
  Invoice Date:  {invoice_date}
  Due Date:      {due_date}
  Subtotal:      ${subtotal:.2f}
  Tax (8.25%):   ${tax:.2f}
  Total Due:     ${total:.2f}

Payment is due by {due_date}. Please remit payment according to your payment terms.

Best regards,
OrderFlow AI Billing Team
"""
    
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #245f5a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">Invoice {invoice_no}</h2>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{customer_name}</strong>,</p>
    <p>Please find your invoice for <strong>{po_number}</strong>.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; font-weight: bold;">Invoice No:</td><td style="padding: 8px;">{invoice_no}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Invoice Date:</td><td style="padding: 8px;">{invoice_date}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Due Date:</td><td style="padding: 8px; color: #c62828; font-weight: bold;">{due_date}</td></tr>
    </table>
    
    <h3 style="color: #245f5a;">Invoice Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #f4f7f4;">
        <th style="padding: 8px; text-align: left;">SKU</th>
        <th style="padding: 8px; text-align: left;">Description</th>
        <th style="padding: 8px; text-align: center;">Qty</th>
        <th style="padding: 8px; text-align: right;">Price</th>
        <th style="padding: 8px; text-align: right;">Amount</th>
      </tr>
      {lines_html}
    </table>
    
    <table style="width: 100%; margin-top: 15px; border-collapse: collapse;">
      <tr><td style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td><td style="padding: 8px; text-align: right; width: 120px;">${subtotal:.2f}</td></tr>
      <tr><td style="padding: 8px; text-align: right;">Tax (8.25%):</td><td style="padding: 8px; text-align: right;">${tax:.2f}</td></tr>
      <tr style="background: #f4f7f4;"><td style="padding: 8px; text-align: right; font-weight: bold; font-size: 1.1em;">Total Due:</td><td style="padding: 8px; text-align: right; font-weight: bold; color: #245f5a; font-size: 1.1em;">${total:.2f}</td></tr>
    </table>
    
    <p style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 5px; border-left: 4px solid #ff9800;">
      <strong>Payment Due:</strong> {due_date}. Please remit payment according to your payment terms.
    </p>
    
    <p>Best regards,<br><strong>OrderFlow AI Billing Team</strong></p>
  </div>
</div></body></html>
"""
    
    return send_email(
        to_email=customer_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
    )


def send_fulfillment_update(
    customer_email: str,
    customer_name: str,
    po_number: str,
    stage: str,
    owner: str,
    committed_date: str,
    risk: str,
    optimized_route: str,
) -> dict[str, Any]:
    """
    Send fulfillment status update email.
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer name
        po_number: PO number
        stage: Current fulfillment stage
        owner: Fulfillment owner/dispatcher
        committed_date: Committed delivery date
        risk: Risk level
        optimized_route: Route details
        
    Returns:
        dict: Email send result
    """
    stage_labels = {
        "pending": "Pending - Awaiting Processing",
        "in_progress": "In Progress - Being Fulfilled",
        "blocked": "Blocked - Requires Attention",
        "completed": "Completed - Shipped/Delivered",
    }
    
    stage_label = stage_labels.get(stage, stage.capitalize())
    
    subject = f"Fulfillment Update - {po_number} - {stage_label}"
    
    body_text = f"""
Dear {customer_name},

Fulfillment status update for Purchase Order {po_number}.

Current Status: {stage_label}
Owner:          {owner}
Committed Date: {committed_date}
Risk Level:     {risk.upper()}
Route:          {optimized_route}

We will continue to keep you updated as your order progresses.

Best regards,
OrderFlow AI Logistics Team
"""
    
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #245f5a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">Fulfillment Status Update</h2>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{customer_name}</strong>,</p>
    <p>Fulfillment status update for <strong>{po_number}</strong>.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; font-weight: bold;">Status:</td>
          <td style="padding: 8px;"><span style="background: {'#4caf50' if stage == 'completed' else '#ff9800' if stage == 'in_progress' else '#f44336' if stage == 'blocked' else '#9e9e9e'}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85em;">{stage_label}</span></td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Owner:</td><td style="padding: 8px;">{owner}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Committed Date:</td><td style="padding: 8px;">{committed_date}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Risk Level:</td><td style="padding: 8px;">{risk.upper()}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Route:</td><td style="padding: 8px;">{optimized_route}</td></tr>
    </table>
    
    <p style="margin-top: 20px; padding: 15px; background: #f4f7f4; border-radius: 5px;">
      We will continue to keep you updated as your order progresses.
    </p>
    
    <p>Best regards,<br><strong>OrderFlow AI Logistics Team</strong></p>
  </div>
</div></body></html>
"""
    
    return send_email(
        to_email=customer_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
    )


def send_order_registry_notification(
    customer_email: str,
    customer_name: str,
    po_number: str,
    status: str,
    total_amount: float,
    item_count: int,
) -> dict[str, Any]:
    """
    Send order registry notification when an order is registered in the system.
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer name
        po_number: PO number
        status: Order status
        total_amount: Total order amount
        item_count: Number of line items
        
    Returns:
        dict: Email send result
    """
    subject = f"Order Registered - {po_number} - OrderFlow AI"
    
    body_text = f"""
Dear {customer_name},

Purchase Order {po_number} has been registered in the OrderFlow AI system.

Order Details:
  PO Number:     {po_number}
  Status:        {status.upper()}
  Items:         {item_count}
  Total Amount:  ${total_amount:.2f}

The order has been entered into our processing pipeline and will be validated shortly.

Best regards,
OrderFlow AI System
"""
    
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; color: #333;">
<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #245f5a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">Order Registered in System</h2>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{customer_name}</strong>,</p>
    <p>Purchase Order <strong>{po_number}</strong> has been registered in the OrderFlow AI system.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; font-weight: bold;">PO Number:</td><td style="padding: 8px;">{po_number}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">{status.upper()}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Items:</td><td style="padding: 8px;">{item_count}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Total Amount:</td><td style="padding: 8px; color: #245f5a; font-weight: bold;">${total_amount:.2f}</td></tr>
    </table>
    
    <p style="margin-top: 20px; padding: 15px; background: #f4f7f4; border-radius: 5px;">
      The order has been entered into our processing pipeline and will be validated shortly.
    </p>
    
    <p>Best regards,<br><strong>OrderFlow AI System</strong></p>
  </div>
</div></body></html>
"""
    
    return send_email(
        to_email=customer_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
    )


def send_use_case_report(
    to_email: str,
    use_cases: list[dict[str, str]],
    report_format: str = "csv",
) -> dict[str, Any]:
    """
    Send Use Case Coverage Summary report via email.
    
    Args:
        to_email: Recipient email address
        use_cases: List of use case dictionaries
        report_format: "csv" or "json"
        
    Returns:
        dict: Email send result
    """
    import csv
    import io
    
    if report_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Use Case ID", "Name", "Phase", "Status"])
        for uc in use_cases:
            writer.writerow([uc.get("id", ""), uc.get("name", ""), uc.get("phase", ""), uc.get("status", "")])
        csv_content = output.getvalue().encode("utf-8")
        
        attachments = [("use_case_coverage_summary.csv", "text/csv", csv_content)]
        
        body_text = "Please find attached the Use Case Coverage Summary report.\n\nGenerated by OrderFlow AI."
        body_html = f"""
<html><body style="font-family: Arial, sans-serif;">
<p>Please find attached the <strong>Use Case Coverage Summary</strong> report.</p>
<p>Total Use Cases: {len(use_cases)}<br>
Implemented: {sum(1 for uc in use_cases if uc.get('status') == 'implemented')}<br>
Scaffolded: {sum(1 for uc in use_cases if uc.get('status') == 'scaffolded')}</p>
<p>Generated by OrderFlow AI.</p>
</body></html>
"""
    else:
        json_content = json.dumps(use_cases, indent=2).encode("utf-8")
        attachments = [("use_case_coverage_summary.json", "application/json", json_content)]
        body_text = "Please find attached the Use Case Coverage Summary report in JSON format.\n\nGenerated by OrderFlow AI."
        body_html = None
    
    return send_email(
        to_email=to_email,
        subject="Use Case Coverage Summary Report - OrderFlow AI",
        body_text=body_text,
        body_html=body_html,
        attachments=attachments,
    )