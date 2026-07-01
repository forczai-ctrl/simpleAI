import os
import logging
import httpx

logger = logging.getLogger("orderflow.llm")

# Grok via OpenRouter free API
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "free")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
GROK_MODEL = os.environ.get("GROK_MODEL", "x-ai/grok-beta")

async def query_llm(system_prompt: str, user_prompt: str, response_format: str = "text") -> str | None:
    """
    Sends a chat request to Grok via OpenRouter.
    
    Args:
        system_prompt: Guidelines and context for the system behavior.
        user_prompt: The dynamic input text.
        response_format: "text" (default) or "json" (forces JSON structure).
        
    Returns:
        The response content string from the LLM, or None if the request failed.
    """
    url = f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "OrderFlow AI",
    }
    if OPENROUTER_API_KEY and OPENROUTER_API_KEY != "free":
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
        logger.error(f"Failed to query Grok LLM at {url}: {e}")
        return None