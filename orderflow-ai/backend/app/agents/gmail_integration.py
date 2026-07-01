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
        self.credentials_path = os.path.join(os.path.dirname(__file__), '..', '..', 'credentials.json')
        self.token_path = os.path.join(os.path.dirname(__file__), '..', '..', 'token.json')
    
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
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
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
        """Extract text body from Gmail message."""
        try:
            payload = msg.get('payload', {})
            
            # Try to get body from payload
            if 'body' in payload and 'data' in payload['body']:
                data = payload['body']['data']
                return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            
            # Try to get body from parts
            if 'parts' in payload:
                for part in payload['parts']:
                    if part.get('mimeType') == 'text/plain':
                        if 'body' in part and 'data' in part['body']:
                            data = part['body']['data']
                            return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            
            return ""
            
        except Exception as e:
            print(f"Error extracting email body: {e}")
            return ""
    
    async def check_for_new_use_cases(self) -> int:
        """Check Gmail for new use cases and update dynamic storage."""
        use_cases = await self.get_emails_with_use_cases()
        
        if use_cases:
            # Update the global dynamic storage
            from ..main import DYNAMIC_USE_CASES
            DYNAMIC_USE_CASES.clear()
            DYNAMIC_USE_CASES.extend(use_cases)
            return len(use_cases)
        
        return 0
