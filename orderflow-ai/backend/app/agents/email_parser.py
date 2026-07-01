"""Email integration for dynamic use case extraction."""
from __future__ import annotations

import re
import json
from typing import Any
from .llm import query_llm

SYSTEM_PROMPT = """You are an AI email parser.
Your task is to extract use case information from emails and return a JSON object.
The JSON must match this schema:
{
  "id": "UC-XX",
  "name": "Use Case Name",
  "phase": "1-3",
  "status": "implemented|scaffolded|planned"
}

Look for patterns like:
- "UC-01: Multi-Format Order Intake"
- "Use case: Order Validation"
- "Phase 2 - Automated Order Validation"
- Status keywords: implemented, in progress, planned, scaffolded

Return an array of use case objects found in the email.
"""


class EmailParserAgent:
    """Parse use cases from emails dynamically."""

    async def extract_use_cases(self, email_content: str) -> list[dict[str, str]]:
        """Extract use cases from email content using LLM."""
        try:
            llm_result = await query_llm(
                SYSTEM_PROMPT,
                f"Email content:\n{email_content}\n\nExtract all use cases mentioned in this email.",
                response_format="json"
            )
            
            if not llm_result:
                return []
            
            cleaned = llm_result.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            
            data = json.loads(cleaned)
            if isinstance(data, list):
                return data
            return [data]
            
        except Exception as e:
            print(f"Email parsing error: {e}. Using regex fallback.")
            return self._regex_fallback(email_content)

    def _regex_fallback(self, text: str) -> list[dict[str, str]]:
        """Fallback regex parser if LLM fails."""
        use_cases = []
        
        # Pattern to match UC-XX codes
        uc_pattern = re.compile(r'UC-(\d+)', re.IGNORECASE)
        uc_matches = uc_pattern.findall(text)
        
        # Pattern to match use case names
        name_pattern = re.compile(r'(?:use case|UC)[\s:]+([A-Z][a-zA-Z\s]+)', re.IGNORECASE)
        names = name_pattern.findall(text)
        
        # Pattern to match status
        status_pattern = re.compile(r'(implemented|scaffolded|planned|in progress)', re.IGNORECASE)
        statuses = status_pattern.findall(text)
        
        for i, uc_id in enumerate(uc_matches[:10]):  # Limit to 10
            use_cases.append({
                "id": f"UC-{uc_id.zfill(2)}",
                "name": names[i] if i < len(names) else f"Use Case {uc_id}",
                "phase": str((i % 3) + 1),  # Cycle through phases 1-3
                "status": statuses[i].lower() if i < len(statuses) else "scaffolded"
            })
        
        return use_cases