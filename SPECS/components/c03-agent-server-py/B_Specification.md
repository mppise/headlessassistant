---
name: c03-specification
description: Interface contracts, request/response schemas, MCP protocol, and operational requirements for C03 Agent Server (Python).
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C03 — Agent Server (Python): Specification

> All contracts are drop-in compatible with C02 (`_DEMO/agent-server`). This document records Python-specific implementation details where they differ.

---

## 1. HTTP Endpoints

Identical to C02 — see `C02/B_Specification.md §1`. Both endpoints (`GET /headless-assistant.js`, `POST /ask-assistant`) behave identically.

**Python-specific:** `GET /headless-assistant.js` uses FastAPI `FileResponse`; path resolves to `../agent-server/lib/headless-assistant.js`.

---

## 2. SSE Event Format

Identical to C02 — see `C02/B_Specification.md §2`. Uses `sse-starlette` `EventSourceResponse` with raw `data: <json>` lines and `data: [DONE]` terminator.

---

## 3. AI Core Integration

Identical semantics to C02. Python-specific:
- HTTP client: `httpx.AsyncClient`
- OAuth2 token cached in module-level variables `_cached_token`, `_token_expires_at`
- Turn 1: `await client.post(url, json={...})` → parse JSON
- Turn 2: `await client.stream("POST", url, json={...})` → iterate async lines

---

## 4. MCP Protocol (C03 internal)

Identical semantics to C02. Python-specific:
- Transport: `StdioServerParameters(command=sys.executable, args=[...mcp_server.py...])`
- Client: `mcp.ClientSession` via `stdio_client` async context manager
- Initialisation: `_initialise()` called during FastAPI lifespan startup (blocking until ready)
- `call_tool(name, args, context)` is `async`; called via `asyncio.gather()` for parallel tool execution

---

## 5. Tool Handler Contract

```python
# tools/<name>/handler.py
async def execute(args: dict, context: dict) -> any:
    # args: tool-specific arguments from LLM
    # context: { "CompCode": "...", "CustNum": "..." }
    # returns: any JSON-serializable value
```

Same error contract as C02: exceptions caught by MCP server; `{ "error": "Tool <name> failed…" }` returned.

---

## 6. Environment Variables

Identical to C02 — see `C02/B_Specification.md §8`. Loaded from `.env` in `_DEMO/agent-server-py/` via `python-dotenv`.

---

## 7. Error Handling

Identical to C02 — see `C02/B_Specification.md §9`. Python-specific notes:
- Route-level exception handling uses `try/except Exception as e`
- Async SSE generator catches all exceptions and emits error event before `yield "[DONE]"`

---

## 8. Startup Sequence

1. `load_dotenv()` runs before any imports that read env vars.
2. FastAPI `lifespan` context manager runs `mcp_client._initialise()`:
   - Spawns `mcp_server.py` subprocess
   - Opens `ClientSession` via `stdio_client`
   - Calls `session.initialize()` + `session.list_tools()`
   - Populates module-level `tools` list (OpenAI-compatible shape)
3. Uvicorn starts accepting requests.

Any failure in `_initialise()` will prevent the server from starting.

---

## 9. Shared File Path Resolution

| File | Resolved from (`_DEMO/agent-server-py/`) |
| :--- | :--------------------------------------- |
| `headless-assistant.js` | `../agent-server/lib/headless-assistant.js` |
| `system-prompt.txt` | `../../../prompts/system-prompt.txt` (3 dirs up from `lib/agent.py`) |
| `tool-registry.json` | `../agent-server/tools/tool-registry.json` (from `lib/mcp_client.py`) |
| `schema.json` | `../agent-server/tools/<name>/schema.json` (from `lib/mcp_server.py`) |

---

## 10. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-XX | SpecGantry |
| — | Updated by reverse engineering — aligned to current code | 2026-06-01 | SpecGantry |
