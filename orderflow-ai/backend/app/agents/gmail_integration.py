"""Gmail integration for automatic email parsing."""
from __future__ import annotations

import os
import json
import base64
from typing import Any
from datetime import datetime
from .email_parser import EmailParserAgent

try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False
    print("Warning: Gmail libraries not installed. Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

class GmailIntegration:
    """Integrate with Gmail to automatically parse use cases from emails."""
    
    def __init__(self, email_parser: EmailParserAgent):
        self.email_parser = email_parser
        self.service = None
        self.credentials_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'credentials.json'
        )
        self.token_path = os.path.join(os.path.dirname(__file__), '..', '..', 'token.json')
        self.dynamic_use_cases = None
    
    def authenticate(self) -> bool:
        """Authenticate with Gmail API."""
        if not GMAIL_AVAILABLE:
            print("Gmail libraries not available")
            return False
        
        creds = None
        
        # Load existing token
        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            try:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_path):
                        print(f"Gmail credentials file not found: {self.credentials_path}")
                        return False
                    
                    flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, SCOPES)
                    creds = flow.run_local_server(port=0)
            except Exception as e:
                print(f"Error during token refresh or login: {e}. Attempting full re-authentication...")
                if not os.path.exists(self.credentials_path):
                    print(f"Gmail credentials file not found: {self.credentials_path}")
                    return False
                flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save token for next time
            with open(self.token_path, 'w') as token:
                token.write(creds.to_json())
        
        try:
            self.service = build('gmail', 'v1', credentials=creds)
            return True
        except Exception as e:
            print(f"Failed to build Gmail service: {e}")
            return False
    
    async def get_emails_with_use_cases(self, query: str = "use case OR UC-", max_results: int = 10) -> list[dict[str, str]]:
        """Fetch emails that might contain use cases."""
        if not self.service:
            if not self.authenticate():
                return []
        
        try:
            # Search for emails
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            all_use_cases = []
            
            for message in messages:
                msg = self.service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='full'
                ).execute()
                
                # Extract email body
                email_body = self._extract_email_body(msg)
                
                if email_body:
                    # Parse use cases from email
                    use_cases = await self.email_parser.extract_use_cases(email_body)
                    all_use_cases.extend(use_cases)
            
            return all_use_cases
            
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []
    
    def _extract_email_body(self, msg: dict) -> str:
        """Extract text body from Gmail message (handles plain text and nested multiparts)."""
        def get_body_from_part(part: dict) -> str:
            mime_type = part.get('mimeType', '')
            body = part.get('body', {})
            if mime_type == 'text/plain' and 'data' in body:
                return base64.urlsafe_b64decode(body['data']).decode('utf-8', errors='ignore')
            
            if 'parts' in part:
                for subpart in part['parts']:
                    text = get_body_from_part(subpart)
                    if text:
                        return text
            return ""

        try:
            payload = msg.get('payload', {})
            return get_body_from_part(payload)
        except Exception as e:
            print(f"Error extracting email body: {e}")
            return ""
    
    async def check_for_new_use_cases(self) -> int:
        """Check Gmail for new use cases and update dynamic storage."""
        use_cases = await self.get_emails_with_use_cases()
        
        if use_cases:
            # Update the global dynamic storage (injected reference)
            if self.dynamic_use_cases is not None:
                self.dynamic_use_cases.clear()
                self.dynamic_use_cases.extend(use_cases)
            return len(use_cases)
        
        return 0

    async def get_emails_with_orders(self, query: str = 'subject:order OR subject:PO OR "purchase order" OR "PO-"', max_results: int = 5) -> list[str]:
        """Fetch emails that look like purchase orders and return their plain text bodies."""
        if not self.service:
            if not self.authenticate():
                return []
        
        try:
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            order_texts = []
            
            for message in messages:
                msg = self.service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='full'
                ).execute()
                
                email_body = self._extract_email_body(msg)
                if email_body:
                    order_texts.append(email_body)
            
            return order_texts
            
        except Exception as e:
            print(f"Error fetching order emails: {e}")
            return []

    async def check_for_new_orders(self, run_pipeline_fn) -> list[Any]:
        """Fetch emails representing purchase orders and run them through the Order-to-Cash pipeline."""
        order_texts = await self.get_emails_with_orders()
        pipeline_runs = []
        
        for text in order_texts:
            try:
                # Import here to avoid circular imports
                from ..models import ExtractionRequest
                result = await run_pipeline_fn(ExtractionRequest(raw_text=text, channel="gmail"))
                pipeline_runs.append(result)
            except Exception as e:
                print(f"Error executing pipeline for email order: {e}")
                
        return pipeline_runs

