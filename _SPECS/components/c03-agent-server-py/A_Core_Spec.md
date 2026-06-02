---
name: c03-agent-server-py-core-spec
description: Core specification for C03-AgentServerPy — the Python port of the Node.js _DEMO/agent-server.
license: Apache-2.0
---

# C03-AgentServerPy — Core Specification

> A faithful Python port of `_DEMO/agent-server` (Node.js/Express). Serves the same two HTTP endpoints (`GET /headless-assistant.js`, `POST /ask-assistant`) and runs the same MCP stdio server architecture, using FastAPI + uvicorn + the Python MCP SDK.

---

## 1. Purpose

Replace the Node.js agent-server in the demo with an equivalent Python implementation so that developers who prefer a Python runtime can operate the full demo stack without installing Node.js. Both servers are **drop-in compatible** — the widget (`headless-assistant.js`) and all tool handlers behave identically.

---

## 2. Feature Inventory

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----: | :- | :---------- | :------- | :------ | :-------- |
| Complete | C03-F01 | HTTP server entry point — load `.env`, mount routes, start uvicorn on `PORT` (default 3000) | P1 | — (demo infra) | - |
| Complete | C03-F02 | CORS middleware — allow all origins, `Content-Type` + `Authorization` headers, respond 204 to OPTIONS | P1 | — | - |
| Complete | C03-F03 | `GET /headless-assistant.js` — serve `lib/headless-assistant.js` as `application/javascript` | P1 | — | - |
| Complete | C03-F04 | `POST /ask-assistant` — validate request body `{ message, history?, context? }`, return 400 on missing/blank message | P1 | — | - |
| Complete | C03-F05 | SSE response streaming — set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`; emit `data: <json>\n\n` events; end with `data: [DONE]\n\n` | P1 | — | - |
| Complete | C03-F06 | AI Core OAuth2 token cache — fetch client-credentials token; cache until 60s before expiry; re-fetch on expiry | P1 | — | - |
| Complete | C03-F07 | AI Core chat completions call (non-streaming turn 1) — POST to AI Core with tools list and `tool_choice: auto`; parse `choices[0]` | P1 | — | - |
| Complete | C03-F08 | AI Core chat completions call (streaming turn 2) — POST with `stream: true`; proxy SSE chunks to browser via `send.chunk()` | P1 | — | - |
| Complete | C03-F09 | Agent logic — `build_messages(history, user_message)` prepends system prompt + history; `handle_tool_calls()` runs all tool calls in parallel, appends results, triggers turn 2 | P1 | — | - |
| Complete | C03-F10 | MCP client — spawn `mcp_server.py` as subprocess via stdio transport; connect on startup; call `list_tools()` and map to OpenAI-compatible tool shape; expose `call_tool(name, args, context)` | P1 | — | - |
| Complete | C03-F11 | MCP server — read `tool-registry.json`; use `@server.list_tools()` to return `mcp.types.Tool` objects built from each tool's `schema.json`; use `@server.call_tool()` to dispatch to each tool's `execute(args, context)`; return `{ content: [{ type: "text", text: json }] }` | P1 | — | - |
| Complete | C03-F12 | Tool handlers — Python equivalents of all five JS handlers: `get_customer_details`, `get_customer_summary`, `get_open_items`, `get_paid_bills`, `get_payer_info` with identical mock data | P1 | — | - |
| Complete | C03-F13 | Logger — timestamped console output matching Node.js logger format: `YYYY-MM-DD HH:MM:SS [label]  message` | P2 | — | - |
| Complete | C03-F14 | `requirements.txt` — pin all runtime dependencies; include `fastapi`, `uvicorn[standard]`, `sse-starlette`, `mcp`, `httpx`, `python-dotenv` | P1 | — | - |
| Complete | C03-F15 | `server.py` startup banner — log server URL and available routes on startup (matching Node.js `warn('[server]', ...)` output) | P2 | — | - |
| Complete | C03-F16 | Request logging — log each `/ask-assistant` request with truncated message, history length, context JSON; log timing per AI Core turn | P2 | — | - |

---

## 3. Dependencies

### Runtime (Python packages)

| Package | Version constraint | Purpose |
| :------ | :----------------- | :------ |
| `fastapi` | `>=0.111` | HTTP server framework (replaces Express) |
| `uvicorn[standard]` | `>=0.29` | ASGI server (replaces Node built-in HTTP) |
| `sse-starlette` | `>=1.6` | SSE `EventSourceResponse` for FastAPI (replaces Express `res.write` SSE pattern) |
| `mcp` | `>=1.0` | Python MCP SDK — `ClientSession` + `Server` + stdio transport |
| `httpx` | `>=0.27` | Async HTTP client for AI Core OAuth2 + completions |
| `python-dotenv` | `>=1.0` | `.env` file loading |

### File dependencies (shared with Node server — read-only)

| Path | Used by |
| :--- | :------ |
| `_DEMO/agent-server/lib/headless-assistant.js` | C03-F03 — served verbatim |
| `_DEMO/prompts/system-prompt.txt` | C03-F09 — loaded at startup |
| `_DEMO/agent-server/tools/tool-registry.json` | C03-F10, C03-F11 — read at startup |
| `_DEMO/agent-server/tools/*/schema.json` | C03-F11 — tool parameter schemas |

> The Python server reads shared files from `_DEMO/prompts/` (prompts) and the Node.js tree (widget JS, tool schemas) via relative paths. It does **not** duplicate them.

### Environment variables (`.env` in server root)

| Name | Purpose |
| :--- | :------ |
| `PORT` | HTTP listen port (default `3000`) |
| `AICORE_AUTH_URL` | OAuth2 token endpoint base URL |
| `AICORE_CLIENT_ID` | OAuth2 client ID |
| `AICORE_CLIENT_SECRET` | OAuth2 client secret |
| `AICORE_BASE_URL` | AI Core inference base URL |
| `AICORE_LLM_DEPLOYMENT_ID` | Deployment ID for the LLM |
| `AICORE_LLM_MODEL` | Model name (default `gpt-4o`) |
| `AICORE_RESOURCE_GROUP` | AI Core resource group (default `default`) |
| `AICORE_API_VERSION` | API version string (default `2024-02-01`) |

---

## 4. Data Flows

```
POST /ask-assistant
  Input: { message, history[], context{} }
  → [C03-F04] Validate request body → 400 if invalid
  → [C03-F09] build_messages(history, message)  →  messages[]
  → [C03-F06] get_access_token()  →  Bearer token (cached)
  → [C03-F07] callAiCore(token, messages, stream=False, tools, tool_choice="auto")  →  turn1 response
  → if finish_reason == "tool_calls":
      → [C03-F09] handle_tool_calls()
          → [C03-F10] call_tool(name, args, context) × N  [async parallel]
              → MCP stdio IPC → [C03-F11] mcp_server.py dispatch → [C03-F12] execute()
          → append tool results to messages
          → [C03-F05] emit status SSE events during each tool call
          → [C03-F08] callAiCore(token, messages, stream=True)  →  streaming turn 2
          → [C03-F05] proxy SSE chunks to browser
  → else:
      → [C03-F05] emit direct answer as single chunk
  → [C03-F05] emit [DONE]
  Output: SSE stream → browser

GET /headless-assistant.js
  Input: HTTP GET
  → [C03-F03] Read ../agent-server/lib/headless-assistant.js
  Output: JavaScript file response

MCP server lifecycle (subprocess)
  Input: spawned by [C03-F10] on first request
  → [C03-F11] load tool-registry.json → register tools with JSON Schema
  → await tool call via stdio
  → [C03-F12] execute(args, context)
  Output: { content: [{ type: "text", text: json_string }] }
```

---

## 5. Execution Mode

**Request-driven service.** `server.py` is the main entry point; uvicorn serves HTTP requests. The MCP server (`mcp_server.py`) is a long-running subprocess spawned by the MCP client at startup and kept alive for the server lifetime. Tool calls are dispatched via stdio IPC for every `/ask-assistant` request that produces `tool_calls`.

**Lifecycle:**
1. `python server.py` → loads `.env` → imports `mcp_client` (spawns `mcp_server.py` subprocess, connects, lists tools) → starts uvicorn.
2. Uvicorn serves requests until SIGINT/SIGTERM.
3. On shutdown, uvicorn closes; `mcp_server.py` subprocess exits when its stdio pipe closes.

---

## 6. File Structure

```
_DEMO/agent-server-py/
  server.py                  ← entry point (FastAPI app, uvicorn launch)
  requirements.txt           ← pinned runtime dependencies
  .env                       ← not committed; same vars as agent-server/.env
  routes/
    assistant.py             ← POST /ask-assistant SSE handler
    widget.py                ← GET /headless-assistant.js handler
  lib/
    agent.py                 ← build_messages(), handle_tool_calls()
    ai_core.py               ← get_access_token(), call_ai_core(), stream_response()
    mcp_client.py            ← MCP client — spawns mcp_server.py, lists tools, call_tool()
    mcp_server.py            ← MCP server — registers tools, dispatches to handlers
    logger.py                ← log(), err(), warn()
  tools/
    tool_registry.json       ← symlink or copy of ../agent-server/tools/tool-registry.json
    get_customer_details/
      handler.py
    get_customer_summary/
      handler.py
    get_open_items/
      handler.py
    get_paid_bills/
      handler.py
    get_payer_info/
      handler.py
```

> `tool_registry.json` and `schema.json` files are **read from the Node.js tree** via relative path (`../agent-server/tools/...`) — no duplication.
