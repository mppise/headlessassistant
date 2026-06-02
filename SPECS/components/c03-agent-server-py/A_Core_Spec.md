---
name: c03-agent-server-py-core-spec
description: Core specification for C03-AgentServerPy — Python port of C02 using FastAPI + Python MCP SDK.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C03 — Agent Server (Python): Core Specification

Architecture refs: `SPECS/artifacts/Architecture/0_Overview.md`, `SPECS/artifacts/Architecture/4_API.md`

> A faithful Python port of C02 (`_DEMO/agent-server`). Serves the same two HTTP endpoints and runs the same MCP stdio server architecture using FastAPI + uvicorn + Python MCP SDK. **Demo only — not production-hardened.**

---

## 1. Purpose

Replace the Node.js agent-server in the demo with an equivalent Python implementation so that developers who prefer Python can operate the full demo stack without installing Node.js. Both servers are **drop-in compatible** — the widget and all tool handlers behave identically.

**Ownership boundary:** `_DEMO/agent-server-py/` only. C03 reads shared files from `_DEMO/agent-server/tools/` and `_DEMO/prompts/` via relative path but never modifies them.

---

## 2. Feature Inventory

| Status | ID | Description | Priority |
| :----- | :- | :---------- | :------- |
| `Complete` | C03-F01 | HTTP server entry point — load `.env`, mount routes, start uvicorn on `PORT` (default 3000) | P1 |
| `Complete` | C03-F02 | CORS middleware — `CORSMiddleware` allow all origins, `Content-Type` + `Authorization` headers, respond to OPTIONS | P1 |
| `Complete` | C03-F03 | `GET /headless-assistant.js` — serve `../agent-server/lib/headless-assistant.js` as `application/javascript` | P1 |
| `Complete` | C03-F04 | `POST /ask-assistant` — validate request body `{ message, history?, context? }`; return 400 on missing/blank message | P1 |
| `Complete` | C03-F05 | SSE response streaming — `EventSourceResponse`; emit `data: <json>` events; end with `data: [DONE]` | P1 |
| `Complete` | C03-F06 | AI Core OAuth2 token cache — fetch client-credentials token via httpx; cache until 60s before expiry | P1 |
| `Complete` | C03-F07 | AI Core turn-1 call (non-streaming) — POST to AI Core with tools list and `tool_choice: auto`; parse `choices[0]` | P1 |
| `Complete` | C03-F08 | AI Core turn-2 call (streaming) — POST with `stream: True`; proxy SSE delta chunks to browser | P1 |
| `Complete` | C03-F09 | Agent logic — `build_messages(history, user_message)` prepends system prompt; `handle_tool_calls()` runs tools in parallel via `asyncio.gather()`, appends results, triggers turn 2 | P1 |
| `Complete` | C03-F10 | MCP client — spawn `mcp_server.py` as subprocess via `StdioServerParameters`; `_initialise()` on FastAPI lifespan startup; `call_tool(name, args, context)`, `get_status_message(name)` | P1 |
| `Complete` | C03-F11 | MCP server — read `tool-registry.json` from Node.js tree; build `types.Tool` objects from each `schema.json`; `@server.list_tools()` + `@server.call_tool()` dispatch to Python handlers | P1 |
| `Complete` | C03-F12 | Tool handlers — Python equivalents of all five tools: `get_customer_details`, `get_customer_summary`, `get_open_items`, `get_paid_bills`, `get_payer_info`; each exports `async execute(args, context)` with identical mock data | P1 |
| `Complete` | C03-F13 | Logger — `log()`, `warn()`, `err()` with `YYYY-MM-DD HH:MM:SS [label]  message` format matching C02 output | P2 |
| `Complete` | C03-F14 | `requirements.txt` — pin all runtime dependencies; `fastapi`, `uvicorn[standard]`, `sse-starlette`, `mcp`, `httpx`, `python-dotenv` | P1 |
| `Complete` | C03-F15 | Startup banner — log server URL and available routes on startup matching C02 format | P2 |
| `Complete` | C03-F16 | Request logging — log each `/ask-assistant` request with truncated message, history length, context; log AI Core turn timing | P2 |

---

## 3. Dependencies

### Runtime (Python packages)

| Package | Version constraint | Purpose |
| :------ | :----------------- | :------ |
| `fastapi` | `>=0.111` | HTTP server framework |
| `uvicorn[standard]` | `>=0.29` | ASGI server |
| `sse-starlette` | `>=1.6` | `EventSourceResponse` for SSE |
| `mcp` | `>=1.0` | Python MCP SDK — `ClientSession`, `Server`, stdio transport |
| `httpx` | `>=0.27` | Async HTTP client for AI Core OAuth2 + completions |
| `python-dotenv` | `>=1.0` | `.env` file loading |

### Shared files (read-only, from C02 tree)

| Path | Used by |
| :--- | :------ |
| `_DEMO/agent-server/lib/headless-assistant.js` | C03-F03 — served verbatim |
| `_DEMO/prompts/system-prompt.txt` | C03-F09 — loaded at startup |
| `_DEMO/agent-server/tools/tool-registry.json` | C03-F10, C03-F11 |
| `_DEMO/agent-server/tools/*/schema.json` | C03-F11 |

---

## 4. Data Flows

```
POST /ask-assistant
  Input: { message, history[], context{} }
  → [C03-F04] validate → 400 if invalid
  → [C03-F09] build_messages(history, message) → messages[]
  → [C03-F06] get_access_token() → Bearer token (cached)
  → [C03-F07] call_ai_core(token, messages, stream=False, tools, tool_choice="auto") → turn1
  → if finish_reason == "tool_calls":
      → [C03-F09] handle_tool_calls()
          → [C03-F10] call_tool(name, args, context) × N  [asyncio.gather parallel]
              → MCP stdio IPC → [C03-F11] mcp_server.py dispatch → [C03-F12] execute()
          → emit status SSE events per tool
          → append tool results to messages
          → [C03-F08] call_ai_core(token, messages, stream=True) → streaming turn 2
          → proxy delta chunks to browser
  → else:
      → [C03-F05] emit content as single chunk
  → [C03-F05] emit [DONE]

GET /headless-assistant.js
  → [C03-F03] return FileResponse(../agent-server/lib/headless-assistant.js)
```

---

## 5. Execution Mode

**Request-driven service.** `server.py` is the main entry point; uvicorn serves HTTP. The MCP server (`mcp_server.py`) is a long-running subprocess spawned by the MCP client during FastAPI lifespan startup (`_initialise()`).

**Lifecycle:**
1. `python server.py` → loads `.env` → FastAPI lifespan starts → `mcp_client._initialise()` spawns `mcp_server.py`, connects, lists tools → uvicorn starts serving.
2. Uvicorn serves requests until SIGINT/SIGTERM.
3. On shutdown, `_exit_stack` closes; stdio pipe to `mcp_server.py` closes; subprocess exits.

---

## 6. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial Python port specification | 2026-05-XX | SpecGantry |
| — | Updated by reverse engineering — feature inventory aligned to current code | 2026-06-01 | SpecGantry |
