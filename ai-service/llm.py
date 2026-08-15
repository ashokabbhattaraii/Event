"""Groq/Gemini LLM calls.

Mirrors backend/src/utils/aiProvider.js's provider list and retry/fallback
logic exactly (Gemini primary, Groq fallback) — moved here so this service
is the single place all AI work actually happens (trained ML models AND
LLM calls), not split across two languages. The Node backend only builds
prompts and orchestrates *when* to call an LLM (chatbot fallback, freeform
answers, recommendation "why" text); the actual Groq/Gemini HTTP calls now
live here. aiProvider.js is kept in Node only as a fallback for when this
service itself is unreachable — same "augments, never blocks" pattern as
every other AI integration in this app.

No new dependency: uses urllib (stdlib) instead of requests/httpx, since
this service's requirements.txt doesn't otherwise need an HTTP client.
"""

import json
import os
import time
import urllib.error
import urllib.request

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

TIMEOUT_S = 10
MAX_RETRIES = 2


def _post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = TIMEOUT_S) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def _call_groq(messages: list[dict]) -> str | None:
    if not GROQ_API_KEY:
        return None
    data = _post_json(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 700,
            "top_p": 0.9,
        },
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
    )
    choices = data.get("choices") or []
    if not choices:
        return None
    content = choices[0].get("message", {}).get("content")
    return content.strip() if content else None


def _call_gemini(messages: list[dict]) -> str | None:
    if not GEMINI_API_KEY:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    # Gemini has no system role in v1beta — fold the system prompt into the
    # first user turn, same as aiProvider.js's callGemini.
    contents = [
        {"role": "user" if m["role"] == "system" else m["role"], "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    if messages and messages[0]["role"] == "system":
        second = messages[1]["content"] if len(messages) > 1 else ""
        contents[0]["parts"] = [{"text": f"{messages[0]['content']}\n\n{second}"}]
        del contents[1]

    data = _post_json(
        url,
        {
            "contents": contents,
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700, "topP": 0.9},
        },
    )
    candidates = data.get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts") or []
    text = parts[0].get("text") if parts else None
    return text.strip() if text else None


# Gemini first (primary), Groq second (fallback) — see module docstring.
_PROVIDERS = [("gemini", _call_gemini), ("groq", _call_groq)]


def generate_reply(system_prompt: str, user_prompt: str, history: list[dict] | None = None) -> str | None:
    """history: optional [{role: "user"|"assistant", content}] so the model
    sees the conversation so far, not just the latest message."""
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history or []:
        role = "assistant" if turn.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": turn.get("content", "")})
    messages.append({"role": "user", "content": user_prompt})

    for name, call in _PROVIDERS:
        for attempt in range(MAX_RETRIES):
            try:
                reply = call(messages)
                if reply:
                    return reply
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as exc:
                print(f"[llm] {name} attempt {attempt + 1} failed: {exc}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(0.5 * (attempt + 1))
    return None
