---
name: c03-agent-server-py-operational-specs
description: Operational requirements for C03-AgentServerPy.
license: Apache-2.0
---

# C03-AgentServerPy — Operational Specifications

---

## 1. Error Handling

| Feature | Error class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C03-F04 (request validation) | Missing/blank `message` field | None | None | Return HTTP 400 `{ "error": "message is required" }` |
| C03-F06 (OAuth2 token fetch) | HTTP 4xx/5xx from auth URL | None | None | Raise exception → propagate to route handler → emit SSE error + `[DONE]` |
| C03-F07 (AI Core turn 1) | HTTP 4xx/5xx from AI Core | None | None | Raise exception → route handler catches → emit `{ "error": "..." }` SSE + `[DONE]` |
| C03-F08 (AI Core turn 2 streaming) | HTTP 4xx/5xx or mid-stream connection drop | None | None | Route handler catches → emit `{ "error": "..." }` SSE + `[DONE]` |
| C03-F10 (MCP tool call) | Tool handler raises exception | None | None | Return `{ "error": "Tool <name> failed — please try again." }` as tool result content; continue agent loop |
| C03-F11 (MCP server dispatch) | Handler `execute()` raises exception | None | None | Return `{ content: [{ type: "text", text: error_json }], isError: True }` |
| C03-F03 (widget file serve) | File not found | None | None | FastAPI returns 404 |

**User-facing error message** (same as Node.js): `"An unexpected error occurred. Please try again."`

No circuit breakers. No automatic retries. This is a demo server; fail-fast is the correct behavior.

---

## 2. UX Detail

Not applicable — this is a backend HTTP + MCP server with no UI surface.

---

## 3. Data Specifics

All tool handlers return **mock data only** — no PII in transit or at rest. The mock data is identical to the Node.js handlers:

| Field | Type | Nullable | Validation | PII? | Retention |
| :---- | :--- | :------- | :--------- | :--- | :-------- |
| `message` (request) | string | No | Non-empty after strip | No | Not stored |
| `history` (request) | array | Yes | Array of `{role, content}` | No | Not stored |
| `context` (request) | object | Yes | Any JSON object | No | Passed through to tool handlers only |
| SSE chunks | string | No | N/A | No | Not stored |
| Tool mock data | dict | — | N/A | Fictional only | In-memory constant |

---

## 4. Security Detail

| Concern | Detail |
| :------ | :----- |
| CORS | All origins allowed (`*`) — this is a local demo server, not a production service |
| Auth on `/ask-assistant` | None — demo server; integrators must add auth in production |
| Auth on `/headless-assistant.js` | None — public asset |
| AI Core credentials | Loaded from `.env`; never logged or returned in responses |
| Input validation | `message` must be a non-empty string; all other fields accepted as-is |
| Injection | No SQL, no shell exec — tool handlers return static in-memory data only |
| `.env` file | Not committed to source control; documented in comments |

**Threat surface:** Minimal. This server runs locally as a demo; it is not designed for internet exposure.

---

## 5. Compliance Obligations

Not applicable. No PII is processed or stored. Mock data is entirely fictional.

---

## 6. Observability

This is a demo server. No SLOs, no alerting, no dashboards. Logging is console-only.

| Signal | Format | Owner |
| :----- | :----- | :---- |
| Request received | `[request]  message="..."  history=N turns  context={...}` | C03-F16 |
| AI Core turn 1 | `[ai-core]  turn-1  Xms  finish=tool_calls|stop  tokens=N` | C03-F16 |
| AI Core turn 2 | `[ai-core]  turn-2  streaming...` / `turn-2  Xms  chars=N` | C03-F16 |
| Tool call dispatched | `[mcp]  → tool_name  "status msg"  args={...}` | C03-F16 |
| Tool call result | `[mcp]  ← tool_name  Xms  result=...` | C03-F16 |
| Tool call error | `[mcp]  ← tool_name  Xms  ERROR: ...` | C03-F16 |
| MCP server tool exec | `[mcp-server]  tool_name  Xms` | C03-F11 |
| Request done | `[done]  total=Xms` | C03-F16 |
| Server startup | `[server]  Agent server → http://localhost:PORT` | C03-F15 |

Log format: `YYYY-MM-DD HH:MM:SS [label padded to 12]  message` — matches Node.js logger output exactly.

---

## 7. Infrastructure

### Entry point

```
python _DEMO/agent-server-py/server.py
```

Uvicorn is started programmatically from `server.py` (not via CLI) so the startup banner can be emitted before uvicorn takes over.

### Environment variable table

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `PORT` | HTTP listen port | `.env` or OS env; default `3000` |
| `AICORE_AUTH_URL` | OAuth2 token endpoint base | `.env` |
| `AICORE_CLIENT_ID` | OAuth2 client ID | `.env` |
| `AICORE_CLIENT_SECRET` | OAuth2 client secret | `.env` |
| `AICORE_BASE_URL` | AI Core inference base URL | `.env` |
| `AICORE_LLM_DEPLOYMENT_ID` | LLM deployment ID | `.env` |
| `AICORE_LLM_MODEL` | Model name | `.env`; default `gpt-4o` |
| `AICORE_RESOURCE_GROUP` | AI Core resource group | `.env`; default `default` |
| `AICORE_API_VERSION` | AI Core API version | `.env`; default `2024-02-01` |

`.env` file is placed in `_DEMO/agent-server-py/`. It is the same file as `_DEMO/agent-server/.env` — both servers share the same AI Core credentials. The file is **not committed** to source control.

### Health check

No dedicated health endpoint. Server readiness is inferred from the startup log line. This is acceptable for a local demo server.

### MCP subprocess

`mcp_server.py` is spawned as a subprocess by `mcp_client.py` during module import (at server startup). It communicates via stdin/stdout (stdio transport). It shares the parent process's environment (`env=os.environ.copy()`).

---

## 8. AI Behavior

### C03-F07 / C03-F08 — AI Core Chat Completions

| Parameter | Value |
| :-------- | :---- |
| Model | `AICORE_LLM_MODEL` env var (default `gpt-4o`) |
| Max tokens | 1024 |
| Temperature | 0.4 |
| System prompt | Loaded from `../agent-server/lib/system-prompt.txt` at startup |
| Tool choice | `auto` (turn 1 only) |
| Streaming | `False` for turn 1 (tool routing); `True` for turn 2 (final answer) |

**Turn 1 behavior:** Non-streaming call to determine if tool calls are needed. Parse `finish_reason`:
- `"tool_calls"` → run tools, then turn 2
- `"stop"` → emit `choices[0].message.content` as direct answer chunk

**Turn 2 behavior:** Streaming call after tool results appended to messages. Proxy SSE delta chunks directly to the browser SSE connection.

**Failure fallback:** Any exception from AI Core → emit `{ "error": "An unexpected error occurred. Please try again." }` SSE event + `[DONE]`.

---

## 9. Testing

No automated tests. This is a demo server. Validation is manual:

| Type | Threshold | Critical paths | Fixture approach |
| :--- | :-------- | :------------- | :--------------- |
| Manual | N/A | (1) Widget loads via `GET /headless-assistant.js`; (2) Direct answer from AI Core works; (3) Tool call path: ask about open invoices → tool called → streamed response returned | Mock data in handler.py files |

Manual test procedure: start `python server.py`, open `_DEMO/payment-portal/` in a browser, send a message that triggers a tool call, verify SSE stream delivers status events followed by streamed answer and `[DONE]`.

---

## 10. Notifications

Not applicable — no notification system.

---

## 11. Scalability

This is a local demo server. Scalability is not a concern. Single process, single worker.

| Bottleneck | Note |
| :--------- | :--- |
| MCP subprocess | One subprocess shared for all requests — adequate for local demo (low concurrency) |
| AI Core latency | Network-bound; no mitigation needed for demo |
| Token cache | In-memory module-level cache; adequate for single process |
