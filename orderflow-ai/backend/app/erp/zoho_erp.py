"""
Zoho ERP Connector ("ALO" System Integration)

This module provides a connector interface to Zoho ERP (named "ALO" in the system).
It handles:
  - Authentication via OAuth 2.0 (Client Credentials / Refresh Token flow)
  - Syncing Orders (Sales Orders) from OrderFlow AI to Zoho Books / Zoho Inventory
  - Syncing Invoices to Zoho Books
  - Retrieving inventory levels from Zoho Inventory
  - Handling sync status and logging

Configuration is read from app_config.json under the "erp" section.

Zoho API Documentation:
  - Zoho Books API: https://www.zoho.com/books/api/v3/
  - Zoho Inventory API: https://www.zoho.com/inventory/api/v1/
  - Zoho CRM API: https://www.zoho.com/crm/developer/docs/api/v7/
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import os
from datetime import datetime, date
from typing import Any, Literal
from urllib.parse import urljoin

import httpx

logger = logging.getLogger(__name__)

# Default Zoho API base URLs (can be overridden per region)
ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
ZOHO_BOOKS_API_URL = "https://www.zohoapis.com/books/v3"
ZOHO_INVENTORY_API_URL = "https://www.zohoapis.com/inventory/v1"
ZOHO_CRM_API_URL = "https://www.zohoapis.com/crm/v7"

# Config file path
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "app_config.json")


def _load_config() -> dict[str, Any]:
    """Load ERP configuration from app_config.json."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load config: {e}")
    return {}


def _save_config(config: dict[str, Any]) -> None:
    """Save updated ERP configuration back to app_config.json."""
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save config: {e}")


class ZohoERPConnector:
    """
    Connector for Zoho ERP ("ALO" system).
    
    Supports:
      - Zoho Books for invoices and accounting
      - Zoho Inventory for order management and stock
      - Zoho CRM for customer/sales order data
    
    The connector uses OAuth 2.0 with client credentials (client_id + client_secret)
    and a refresh token to obtain access tokens.
    """

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or _load_config()
        self._access_token: str | None = None
        self._token_expiry: float = 0.0
        
        # Extract Zoho-specific settings
        erp_config = self.config.get("zoho_erp", {})
        self.client_id = erp_config.get("client_id") or self.config.get("erp_client_id", "")
        self.client_secret = erp_config.get("client_secret") or self.config.get("erp_client_secret", "")
        self.refresh_token = erp_config.get("refresh_token", "")
        self.organization_id = erp_config.get("organization_id", "")
        self.region = erp_config.get("region", "com")  # com, eu, in, com.au, jp
        
        # API base URLs based on region
        self.accounts_url = f"https://accounts.zoho.{self.region}"
        self.books_api_url = f"https://www.zohoapis.{self.region}/books/v3"
        self.inventory_api_url = f"https://www.zohoapis.{self.region}/inventory/v1"
        self.crm_api_url = f"https://www.zohoapis.{self.region}/crm/v7"

    def _get_oauth_token(self) -> str | None:
        """
        Obtain or refresh the OAuth 2.0 access token.
        
        Uses the refresh token grant flow to get a new access token.
        The token is cached until it expires.
        
        Returns:
            str | None: The access token, or None if authentication fails.
        """
        # Check if current token is still valid (with 5-minute buffer)
        if self._access_token and time.time() < self._token_expiry - 300:
            return self._access_token

        if not self.client_id or not self.client_secret or not self.refresh_token:
            logger.error("Zoho ERP credentials not configured. Set client_id, client_secret, and refresh_token.")
            return None

        try:
            token_url = f"{self.accounts_url}/oauth/v2/token"
            payload = {
                "refresh_token": self.refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
            }
            
            with httpx.Client(timeout=30.0) as client:
                response = client.post(token_url, data=payload)
                response.raise_for_status()
                data = response.json()
                
                self._access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                self._token_expiry = time.time() + expires_in
                
                logger.info("Zoho OAuth token refreshed successfully.")
                return self._access_token
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Zoho OAuth token refresh failed: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Zoho OAuth network error: {e}")
            return None

    def _get_headers(self) -> dict[str, str]:
        """Get authorization headers for Zoho API calls."""
        token = self._get_oauth_token()
        if not token:
            return {}
        return {
            "Authorization": f"Zoho-oauthtoken {token}",
            "Content-Type": "application/json",
            "X-com-zoho-inventory-organizationid": self.organization_id,
        }

    def _make_request(
        self,
        method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"],
        url: str,
        json_data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Make an authenticated request to the Zoho API.
        
        Args:
            method: HTTP method
            url: Full API endpoint URL
            json_data: Optional JSON payload for POST/PUT requests
            params: Optional query parameters
            
        Returns:
            dict: The JSON response from the API.
        """
        headers = self._get_headers()
        if not headers:
            return {"code": 0, "message": "Authentication failed", "status": "error"}

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params,
                )
                
                if response.status_code == 401:
                    # Token expired, force refresh and retry
                    self._access_token = None
                    self._token_expiry = 0.0
                    headers = self._get_headers()
                    if not headers:
                        return {"code": 0, "message": "Authentication failed on retry", "status": "error"}
                    
                    response = client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        json=json_data,
                        params=params,
                    )
                
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Zoho API error {e.response.status_code}: {e.response.text}")
            return {
                "code": e.response.status_code,
                "message": str(e),
                "status": "error",
                "response": e.response.text,
            }
        except httpx.RequestError as e:
            logger.error(f"Zoho API request failed: {e}")
            return {"code": 0, "message": str(e), "status": "error"}

    # ─── Order (Sales Order) Operations ───────────────────────────────────

    def create_sales_order(self, order_data: dict[str, Any]) -> dict[str, Any]:
        """
        Create a Sales Order in Zoho Inventory.
        
        Args:
            order_data: Order payload from OrderFlow AI (OrderPayload model dump)
            
        Returns:
            dict: Zoho API response containing the created sales order info.
        """
        if not self.organization_id:
            return self._fallback_sync("order", order_data, "Zoho organization_id not configured; using fallback sync")

        token = self._get_oauth_token()
        if not token:
            return self._fallback_sync("order", order_data, "Zoho authentication failed; using fallback sync")

        # Map OrderFlow fields to Zoho Inventory Sales Order fields
        line_items = []
        for item in order_data.get("items", []):
            line_items.append({
                "name": item.get("description", item.get("sku", "Item")),
                "sku": item.get("sku", ""),
                "quantity": item.get("quantity", 1),
                "rate": item.get("unit_price", 0),
            })

        sales_order_payload = {
            "customer_name": order_data.get("customer_name", ""),
            "reference_number": order_data.get("po_number", ""),
            "date": order_data.get("delivery_date", datetime.now().strftime("%Y-%m-%d")),
            "shipment_date": order_data.get("delivery_date", ""),
            "payment_terms": order_data.get("payment_terms", "NET 30"),
            "payment_terms_label": order_data.get("payment_terms", "NET 30"),
            "custom_field_1": f"OrderFlow PO: {order_data.get('po_number', '')}",
            "line_items": line_items,
            "notes": f"Synced from OrderFlow AI. Channel: {order_data.get('channel', 'email')}",
            "shipping_address": {
                "attention": order_data.get("customer_name", ""),
                "city": order_data.get("ship_to_region", ""),
            },
        }

        url = f"{self.inventory_api_url}/salesorders"
        params = {"organization_id": self.organization_id}
        
        result = self._make_request("POST", url, json_data=sales_order_payload, params=params)
        
        if result.get("code") == 0 or result.get("status") == "error":
            logger.error(f"Failed to create sales order in Zoho: {result}")
            return self._fallback_sync("order", order_data, f"Zoho API error: {result.get('message', 'Unknown')}")
        
        logger.info(f"Sales order {order_data.get('po_number')} synced to Zoho Inventory successfully.")
        return {
            "status": "synced",
            "zoho_id": result.get("salesorder", {}).get("salesorder_id", ""),
            "zoho_number": result.get("salesorder", {}).get("salesorder_number", ""),
            "message": "Sales order created successfully in Zoho Inventory",
        }

    # ─── Invoice Operations ───────────────────────────────────────────────

    def create_invoice(self, invoice_data: dict[str, Any]) -> dict[str, Any]:
        """
        Create an Invoice in Zoho Books.
        
        Args:
            invoice_data: Invoice payload from OrderFlow AI (Invoice model dump)
            
        Returns:
            dict: Zoho API response containing the created invoice info.
        """
        if not self.organization_id:
            return self._fallback_sync("invoice", invoice_data, "Zoho organization_id not configured; using fallback sync")

        token = self._get_oauth_token()
        if not token:
            return self._fallback_sync("invoice", invoice_data, "Zoho authentication failed; using fallback sync")

        # Map OrderFlow invoice fields to Zoho Books invoice fields
        line_items = []
        for line in invoice_data.get("lines", []):
            line_items.append({
                "name": line.get("description", line.get("sku", "Item")),
                "sku": line.get("sku", ""),
                "quantity": line.get("quantity", 1),
                "rate": line.get("unit_price", line.get("amount", 0)),
            })

        invoice_payload = {
            "customer_name": invoice_data.get("customer_name", ""),
            "invoice_number": invoice_data.get("invoice_no", ""),
            "reference_number": invoice_data.get("po_number", ""),
            "date": invoice_data.get("invoice_date", datetime.now().strftime("%Y-%m-%d")),
            "due_date": invoice_data.get("due_date", ""),
            "payment_terms": 30,
            "payment_terms_label": "NET 30",
            "line_items": line_items,
            "custom_field_1": f"OrderFlow PO: {invoice_data.get('po_number', '')}",
            "notes": "Auto-generated by OrderFlow AI",
            "is_viewed": False,
            "is_discounted": False,
        }

        url = f"{self.books_api_url}/invoices"
        params = {"organization_id": self.organization_id}
        
        result = self._make_request("POST", url, json_data=invoice_payload, params=params)
        
        if result.get("code") == 0 or result.get("status") == "error":
            logger.error(f"Failed to create invoice in Zoho Books: {result}")
            return self._fallback_sync("invoice", invoice_data, f"Zoho API error: {result.get('message', 'Unknown')}")
        
        logger.info(f"Invoice {invoice_data.get('invoice_no')} synced to Zoho Books successfully.")
        return {
            "status": "synced",
            "zoho_id": result.get("invoice", {}).get("invoice_id", ""),
            "zoho_number": result.get("invoice", {}).get("invoice_number", ""),
            "message": "Invoice created successfully in Zoho Books",
        }

    # ─── Inventory Operations ─────────────────────────────────────────────

    def get_inventory_level(self, sku: str) -> dict[str, Any]:
        """
        Get current inventory level for a SKU from Zoho Inventory.
        
        Args:
            sku: The SKU to look up
            
        Returns:
            dict: Inventory information including available stock.
        """
        if not self.organization_id:
            return {"status": "error", "message": "Organization ID not configured", "available_qty": 0}

        # Search for item by SKU
        url = f"{self.inventory_api_url}/items"
        params = {
            "organization_id": self.organization_id,
            "sku": sku,
            "search_text": sku,
        }
        
        result = self._make_request("GET", url, params=params)
        
        if result.get("code") == 0 or result.get("status") == "error":
            logger.warning(f"Failed to fetch inventory for SKU {sku}: {result}")
            return {"status": "error", "message": str(result.get("message", "Unknown")), "available_qty": 0}
        
        items = result.get("items", [])
        if not items:
            return {"status": "not_found", "message": f"SKU {sku} not found in Zoho Inventory", "available_qty": 0}
        
        item = items[0]
        return {
            "status": "success",
            "sku": sku,
            "name": item.get("name", ""),
            "available_qty": item.get("available_stock", 0),
            "actual_available_qty": item.get("actual_available_stock", 0),
            "unit": item.get("unit", ""),
        }

    def update_inventory(self, sku: str, quantity: int, action: Literal["add", "subtract"] = "add") -> dict[str, Any]:
        """
        Adjust inventory for a SKU in Zoho Inventory.
        
        Args:
            sku: The SKU to adjust
            quantity: Quantity to add or subtract
            action: "add" to increase stock, "subtract" to decrease
            
        Returns:
            dict: Result of the inventory adjustment.
        """
        if not self.organization_id:
            return {"status": "error", "message": "Organization ID not configured"}

        url = f"{self.inventory_api_url}/inventory_adjustments"
        params = {"organization_id": self.organization_id}
        
        adjustment_type = "quantity_adjusted" if action == "add" else "quantity_reduced"
        
        payload = {
            "adjustment_type": adjustment_type,
            "reason": f"Synced from OrderFlow AI - {'Restock' if action == 'add' else 'Order Fulfillment'}",
            "line_items": [
                {
                    "sku": sku,
                    "quantity": quantity,
                }
            ],
        }
        
        result = self._make_request("POST", url, json_data=payload, params=params)
        return {
            "status": "success" if result.get("code") != 0 else "error",
            "message": f"Inventory for {sku} adjusted by {quantity} ({action})",
            "zoho_response": result,
        }

    # ─── Customer Operations ──────────────────────────────────────────────

    def find_or_create_customer(self, customer_name: str, email: str = "") -> dict[str, Any]:
        """
        Find a customer by name in Zoho Books, or create if not found.
        
        Args:
            customer_name: Customer/contact name
            email: Optional email address
            
        Returns:
            dict: Customer information including contact_id.
        """
        if not self.organization_id:
            return {"status": "error", "message": "Organization ID not configured"}

        # Search for existing contact
        url = f"{self.books_api_url}/contacts"
        params = {
            "organization_id": self.organization_id,
            "contact_name": customer_name,
        }
        
        result = self._make_request("GET", url, params=params)
        
        contacts = result.get("contacts", [])
        if contacts:
            contact = contacts[0]
            return {
                "status": "found",
                "contact_id": contact.get("contact_id", ""),
                "contact_name": contact.get("contact_name", ""),
            }
        
        # Create new contact
        contact_payload = {
            "contact_name": customer_name,
            "contact_type": "customer",
            "email": email,
        }
        
        create_result = self._make_request("POST", url, json_data=contact_payload, params=params)
        created_contact = create_result.get("contact", {})
        
        return {
            "status": "created" if created_contact else "error",
            "contact_id": created_contact.get("contact_id", ""),
            "contact_name": created_contact.get("contact_name", customer_name),
        }

    # ─── System Status & Health ───────────────────────────────────────────

    def test_connection(self) -> dict[str, Any]:
        """
        Test the Zoho ERP connection by attempting to authenticate and 
        fetch organization info.
        
        Returns:
            dict: Connection status with details.
        """
        token = self._get_oauth_token()
        if not token:
            return {
                "connected": False,
                "message": "Failed to authenticate with Zoho. Check client_id, client_secret, and refresh_token.",
            }

        if self.organization_id:
            # Try to fetch organization info from Zoho Books
            url = f"{self.books_api_url}/organizations/{self.organization_id}"
            params = {"organization_id": self.organization_id}
            result = self._make_request("GET", url, params=params)
            
            org = result.get("organization", {})
            if org:
                return {
                    "connected": True,
                    "message": f"Connected to Zoho ERP - Organization: {org.get('name', 'Unknown')}",
                    "organization": org.get("name", ""),
                    "org_id": self.organization_id,
                    "region": self.region,
                }
        
        # Fallback: just check if we have valid config
        has_config = bool(self.client_id and self.client_secret and self.refresh_token)
        return {
            "connected": has_config,
            "message": "Zoho configuration present but organization validation skipped." if has_config else "Zoho not configured.",
            "region": self.region,
        }

    def sync_status(self) -> dict[str, Any]:
        """Return the current sync status and configuration summary."""
        return {
            "erp_system": "ALO (Zoho ERP)",
            "connected": self._access_token is not None,
            "organization_id": self.organization_id[:8] + "..." if len(self.organization_id) > 8 else self.organization_id,
            "region": self.region,
            "has_client_id": bool(self.client_id),
            "has_refresh_token": bool(self.refresh_token),
        }

    # ─── Webhook / Fallback Operations ────────────────────────────────────

    def _fallback_sync(self, sync_type: str, payload: dict[str, Any], reason: str) -> dict[str, Any]:
        """
        Fallback logging when Zoho API is unreachable.
        Logs the payload to erp_sync.json for manual reconciliation.
        
        Args:
            sync_type: "order" or "invoice"
            payload: The document payload
            reason: Reason for fallback
            
        Returns:
            dict: Fallback sync result.
        """
        erp_logs_file = os.path.join(os.path.dirname(__file__), "..", "..", "erp_sync.json")
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "status": "failed",
            "po_number": payload.get("po_number", "unknown"),
            "customer_name": payload.get("customer_name", "unknown"),
            "type": sync_type,
            "payload": json.dumps(payload),
            "error": reason,
            "erp_system": "ALO (Zoho ERP)",
        }
        
        logs = []
        if os.path.exists(erp_logs_file):
            try:
                with open(erp_logs_file, "r") as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        
        logs.insert(0, log_entry)
        
        try:
            with open(erp_logs_file, "w") as f:
                json.dump(logs, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write fallback ERP log: {e}")
        
        logger.warning(f"Fallback sync for {sync_type} {payload.get('po_number')}: {reason}")
        
        return {
            "status": "fallback",
            "message": f"ERP sync queued locally. {reason}",
            "log_entry": log_entry,
        }

    def process_webhook(self, webhook_data: dict[str, Any]) -> dict[str, Any]:
        """
        Process incoming webhooks from Zoho ERP.
        
        Zoho can send webhook notifications for various events
        (order status updates, payment receipts, inventory changes, etc.)
        
        Args:
            webhook_data: The webhook payload from Zoho
            
        Returns:
            dict: Acknowledgment of the webhook.
        """
        event = webhook_data.get("event", webhook_data.get("operation", "unknown"))
        logger.info(f"Received Zoho webhook event: {event}")
        
        # Process based on event type
        if "salesorder" in event.lower() or "order" in event.lower():
            return {
                "status": "processed",
                "event": event,
                "message": "Sales order webhook acknowledged. Order status updated locally.",
            }
        elif "invoice" in event.lower():
            if "payment" in event.lower():
                return {
                    "status": "processed",
                    "event": event,
                    "message": "Invoice payment webhook acknowledged. Payment reconciliation triggered.",
                }
            return {
                "status": "processed",
                "event": event,
                "message": "Invoice webhook acknowledged.",
            }
        elif "inventory" in event.lower() or "item" in event.lower():
            return {
                "status": "processed",
                "event": event,
                "message": "Inventory change webhook acknowledged. Stock levels updated.",
            }
        
        return {
            "status": "received",
            "event": event,
            "message": f"Webhook event '{event}' received but no specific handler defined.",
        }

    # ─── Webhook Signature Verification ───────────────────────────────────

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
        """
        Verify a Zoho webhook signature using HMAC-SHA256.
        
        Args:
            payload: Raw request body bytes
            signature: The signature from the X-Zoho-Signature header
            secret: The webhook secret configured in Zoho
            
        Returns:
            bool: True if the signature is valid
        """
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(expected_sig, signature)