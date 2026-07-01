# Gmail Integration Setup Guide

## Step 1: Install Required Packages

```bash
cd orderflow-ai/backend
.venv\Scripts\pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

## Step 2: Get Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Desktop app"
   - Download the JSON file
5. Rename the downloaded file to `credentials.json`
6. Place it in: `orderflow-ai/backend/credentials.json`

## Step 3: Update Backend Code

The integration code is already created in:
- `orderflow-ai/backend/app/agents/gmail_integration.py`
- `orderflow-ai/backend/app/agents/email_parser.py`

## Step 4: Add API Endpoint to Main

Add this endpoint to `orderflow-ai/backend/app/main.py`:

```python
@app.post("/api/gmail/sync")
async def sync_gmail_use_cases():
    """Manually sync use cases from Gmail."""
    # This will be implemented after setup
    return {"status": "Gmail sync endpoint", "message": "Setup required"}
```

## Step 5: How to Use

### Option A: Manual Sync (Current - No Setup Required)
```bash
POST http://localhost:8002/api/email/parse
{
  "raw_text": "Your email content with use cases here",
  "channel": "email"
}
```

### Option B: Automatic Gmail Sync (After Setup)
1. First time: Run backend, it will open browser for authentication
2. Grant permissions to access Gmail
3. Token is saved in `token.json`
4. Call `/api/gmail/sync` to fetch emails

### Option C: Add Email Parsing to Intake Page
Add a button to parse emails directly from the UI.

## Step 6: Email Format for Use Cases

Send emails in this format:
```
Subject: Use Cases Update

UC-01: Multi-Format Order Intake - Phase 1 - Implemented
UC-02: Automated Order Validation - Phase 2 - Implemented
UC-03: Order Prioritization - Phase 2 - Scaffolded
```

Or use the LLM to extract use cases from any email content.

## Notes

- Gmail integration is optional
- Current system works without Gmail (use manual email parsing)
- Install Gmail libraries only if you want automatic email fetching
- Without Gmail libraries, use the manual `/api/email/parse` endpoint