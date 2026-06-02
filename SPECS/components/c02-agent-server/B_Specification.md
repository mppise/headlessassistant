---
name: c02-specification
description: Interface contracts, request/response schemas, MCP protocol, and operational requirements for C02 Agent Server (Node.js).
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C02 — Agent Server (Node.js): Specification

---

## 1. HTTP Endpoints

### `GET /headless-assistant.js`

Serves the widget bundle file.

```
GET /headless-assistant.js
→ 200 OK
   Content-Type: application/javascript
   Body: contents of lib/headless-assistant.js
```

---

### `POST /ask-assistant`

Accepts a conversation turn and streams the agent response via SSE.

**Request:**
```
POST /ask-assistant
Content-Type: application/json

{
  "message":  string,              — required; non-empty
  "history":  ConversationTurn[],  — optional; default []
  "context":  object               — optional; default {}; passed to tool handlers
}

ConversationTurn: { "role": "user"|"assistant", "content": string }
```

**Validation:**
- `message` missing, not a string, or blank → `400 { "error": "message is required" }`

**Response (success — SSE stream):**
```
HTTP 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"status":"Pulling together your account summary…"}   ← 0..N during tool calls
data: {"message":"chunk of assistant text"}                  ← 1..N streaming answer
data: [DONE]
```

**Response (server error):**
```
data: {"error":"An unexpected error occurred. Please try again."}
data: [DONE]
```

---

## 2. SSE Event Types

| Event | Field | When emitted |
| :---- | :---- | :----------- |
| Status | `{"status": "..."}` | Once per tool call, before the tool executes |
| Chunk | `{"message": "..."}` | One per streaming delta from AI Core (turn 2) or once for direct answer |
| Done | `[DONE]` | Always last event (success or error) |
| Error | `{"error": "..."}` | On unhandled server error, followed by `[DONE]` |

---

## 3. AI Core Integration

**OAuth2 client-credentials token fetch:**
```
POST {AICORE_AUTH_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={AICORE_CLIENT_ID}&client_secret={AICORE_CLIENT_SECRET}

→ 200 { "access_token": "...", "expires_in": 3600 }
```
Token cached in module memory; refreshed 60s before expiry.

**Chat completions call (turn 1):**
```
POST {AICORE_BASE_URL}/v2/inference/deployments/{AICORE_LLM_DEPLOYMENT_ID}/chat/completions
     ?api-version={AICORE_API_VERSION}
Authorization: Bearer {token}
AI-Resource-Group: {AICORE_RESOURCE_GROUP}
Content-Type: application/json

{
  "model": "{AICORE_LLM_MODEL}",
  "max_tokens": 1024,
  "temperature": 0.4,
  "messages": [...],
  "tools": [...],
  "tool_choice": "auto",
  "stream": false
}
```

**Chat completions call (turn 2):**
Same endpoint; `stream: true`; no `tools` or `tool_choice`.

---

## 4. MCP Protocol (C02 internal)

**Client → Server (via stdio JSON-RPC):**

`listTools` → returns array of tool descriptors (name, description, inputSchema)

`callTool(name, arguments)` → returns `{ content: [{ type: "text", text: "{json}" }] }`

**Tool call arguments shape:**
```json
{
  "...tool specific args...",
  "_context": { "CompCode": "...", "CustNum": "..." }
}
```
`_context` is stripped by the MCP server before calling `execute(args, context)`.

---

## 5. Tool Handler Contract

```js
// tools/<name>/handler.js
export async function execute(args, context) {
  // args: tool-specific arguments from LLM
  // context: { CompCode, CustNum } from eppDefaults() in agent.js
  // returns: any JSON-serializable value
}
```

On throw: MCP server catches, returns `{ error: "Tool <name> failed — please try again." }`.

---

## 6. Tool Registry Schema

```json
// tools/tool-registry.json
[
  {
    "name": "get_customer_summary",
    "statusMessage": "Pulling together your account summary…",
    "schema": "./tools/get_customer_summary/schema.json",
    "handler": "./tools/get_customer_summary/handler.js"
  }
]
```

`name` must match `function.name` in the tool's `schema.json`.

---

## 7. Tool Schema (`schema.json`)

OpenAI-compatible tool definition:
```json
{
  "type": "function",
  "function": {
    "name": "get_customer_summary",
    "description": "Returns a combined summary…",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}
```

---

## 8. Environment Variables

| Name | Required | Default | Purpose |
| :--- | :------- | :------ | :------ |
| `PORT` | N | `3000` | HTTP listen port |
| `AICORE_AUTH_URL` | Y | — | OAuth2 token endpoint base URL |
| `AICORE_CLIENT_ID` | Y | — | OAuth2 client ID |
| `AICORE_CLIENT_SECRET` | Y | — | OAuth2 client secret |
| `AICORE_BASE_URL` | Y | — | AI Core inference base URL |
| `AICORE_LLM_DEPLOYMENT_ID` | Y | — | Deployment ID for the LLM |
| `AICORE_LLM_MODEL` | N | `gpt-4o` | Model name |
| `AICORE_RESOURCE_GROUP` | N | `default` | AI Core resource group |
| `AICORE_API_VERSION` | N | `2024-02-01` | API version string |

---

## 9. Error Handling

| Scenario | Behavior |
| :------- | :------- |
| Missing/blank `message` | 400 JSON response before SSE headers set |
| AI Core OAuth2 failure | Throws → caught at route level → SSE error event + `[DONE]` |
| AI Core API error (non-2xx) | Throws → same |
| Tool call throws | Caught per-tool in MCP server; `{ error: "..." }` returned to LLM |
| Unknown tool name | MCP server `handlers.get(name)` → `ValueError`; error returned to LLM |
| Unexpected route error | `err('[error]', e.message)` → SSE error event + `[DONE]` |

---

## 10. Security Notes

- CORS `*` is intentional — demo only; not for production.
- Bearer token in `.env` — never committed.
- Tool handlers use mock data only — no real external HTTP calls.

---

## 11. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Plugin tool registry | 2026-05-16 | SpecGantry |
| CHG-002 | MCP stdio transport | 2026-05-16 | SpecGantry |
| — | Updated by reverse engineering | 2026-06-01 | SpecGantry |
