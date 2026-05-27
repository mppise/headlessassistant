# [C03-F06, C03-F07, C03-F08] SAP AI Core client — OAuth2 token cache and chat completions.

import os
import time
from typing import AsyncIterator

import httpx

_cached_token: str | None = None
_token_expires_at: float = 0


def _cfg() -> dict:
    return {
        "auth_url": os.environ["AICORE_AUTH_URL"],
        "base_url": os.environ["AICORE_BASE_URL"],
        "deployment_id": os.environ["AICORE_LLM_DEPLOYMENT_ID"],
        "model": os.environ.get("AICORE_LLM_MODEL", "gpt-4o"),
        "resource_group": os.environ.get("AICORE_RESOURCE_GROUP", "default"),
        "api_version": os.environ.get("AICORE_API_VERSION", "2024-02-01"),
        "client_id": os.environ["AICORE_CLIENT_ID"],
        "client_secret": os.environ["AICORE_CLIENT_SECRET"],
    }


async def get_access_token() -> str:
    # [C03-F06] Return cached token if still valid (with 60s buffer).
    global _cached_token, _token_expires_at
    if _cached_token and time.time() < _token_expires_at - 60:
        return _cached_token

    cfg = _cfg()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{cfg['auth_url']}/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
            },
        )
    if not resp.is_success:
        raise RuntimeError(f"AI Core OAuth2 error {resp.status_code}: {resp.text}")

    data = resp.json()
    _cached_token = data["access_token"]
    _token_expires_at = time.time() + data["expires_in"]
    return _cached_token


def _ai_url(cfg: dict) -> str:
    return (
        f"{cfg['base_url']}/v2/inference/deployments/{cfg['deployment_id']}"
        f"/chat/completions?api-version={cfg['api_version']}"
    )


def _headers(token: str, cfg: dict) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "AI-Resource-Group": cfg["resource_group"],
    }


async def call_ai_core(token: str, overrides: dict) -> dict | httpx.Response:
    # [C03-F07] Non-streaming: returns parsed JSON dict.
    # [C03-F08] Streaming: returns raw httpx.Response for SSE proxying.
    cfg = _cfg()
    body = {"model": cfg["model"], "max_tokens": 1024, "temperature": 0.4, **overrides}
    streaming = overrides.get("stream", False)

    if streaming:
        client = httpx.AsyncClient(timeout=None)
        req = client.build_request(
            "POST", _ai_url(cfg), headers=_headers(token, cfg), json=body
        )
        resp = await client.send(req, stream=True)
        if not resp.is_success:
            await resp.aread()
            await client.aclose()
            raise RuntimeError(f"AI Core {resp.status_code}: {resp.text}")
        # Caller must close the client; attach it to response for cleanup.
        resp._httpx_client = client  # type: ignore[attr-defined]
        return resp
    else:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                _ai_url(cfg), headers=_headers(token, cfg), json=body
            )
        if not resp.is_success:
            raise RuntimeError(f"AI Core {resp.status_code}: {resp.text}")
        return resp.json()


async def stream_response(ai_resp: httpx.Response, send_chunk) -> int:
    # [C03-F08] Proxy AI Core SSE stream to browser. Returns total chars streamed.
    total_chars = 0
    buffer = ""
    try:
        async for raw in ai_resp.aiter_bytes():
            buffer += raw.decode("utf-8", errors="replace")
            events, buffer = buffer.rsplit("\n\n", 1) if "\n\n" in buffer else (buffer, "")
            if not events:
                continue
            for event in (events + "\n\n").split("\n\n"):
                line = event.strip()
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    continue
                try:
                    parsed = __import__("json").loads(payload)
                except Exception:
                    continue
                content = (parsed.get("choices") or [{}])[0].get("delta", {}).get("content")
                if content:
                    await send_chunk(content)
                    total_chars += len(content)
    finally:
        await ai_resp.aclose()
        client = getattr(ai_resp, "_httpx_client", None)
        if client:
            await client.aclose()
    return total_chars
