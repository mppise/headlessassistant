---
name: c03-agent-server-py-interfaces
description: HTTP and SSE interface contracts for C03-AgentServerPy.
license: Apache-2.0
---

# C03-AgentServerPy — Interfaces

---

## 1. HTTP Endpoints

### GET /headless-assistant.js

```
GET /headless-assistant.js
Auth: public (no auth required)
Request: none
Response: 200 application/javascript — contents of ../agent-server/lib/headless-assistant.js
Errors:
  { code: 404, condition: "headless-assistant.js file not found at expected path" }
```

### POST /ask-assistant

```
POST /ask-assistant
Auth: public (no auth required — downstream AI Core call uses server-side OAuth2)
Content-Type: application/json

Request:
{
  "message":  string,          // required — user message; must be non-empty after strip()
  "history":  Array<Turn>,     // optional — defaults to []
  "context":  object           // optional — arbitrary context passed through to tool handlers; defaults to {}
}

Turn shape:
{
  "role":    "user" | "assistant",
  "content": string
}

Response: 200 text/event-stream (SSE) — served via `sse_starlette.sse.EventSourceResponse` wrapping an async generator
  Headers:
    Content-Type:  text/event-stream
    Cache-Control: no-cache
    Connection:    keep-alive

  SSE event types (each line: "data: <json payload>\n\n"):
    { "status":  string }       // emitted during tool execution — human-readable progress message
    { "message": string }       // final answer chunk(s) — one or more, streamed
    { "error":   string }       // on unexpected server error
    [DONE]                      // literal string — signals end of stream

  Stream sequence (tool call path):
    data: {"status":"<tool status message>"}\n\n   ← one per tool call
    data: {"message":"<chunk>"}\n\n                ← one or more (streamed turn 2)
    data: [DONE]\n\n

  Stream sequence (direct answer path):
    data: {"message":"<full answer>"}\n\n
    data: [DONE]\n\n

  Stream sequence (error path):
    data: {"error":"An unexpected error occurred. Please try again."}\n\n
    data: [DONE]\n\n

Errors (pre-stream, HTTP status returned before headers flushed):
  { code: 400, body: { "error": "message is required" },
    condition: "message field missing, not a string, or blank after strip()" }
```

---

## 2. MCP stdio Interface (internal — between mcp_client.py and mcp_server.py)

This interface is **internal only** — not exposed over HTTP. Documents the contract between the MCP client and server subprocesses.

### Tool list (on startup)

```
Client → Server: MCP list_tools request (via stdio JSON-RPC)
Server → Client: list of tool definitions
  [
    {
      "name":        string,
      "description": string,
      "inputSchema": { "type": "object", "properties": {...}, "required": [...] }
    },
    ...
  ]
```

### Tool call (per request)

```
Client → Server: MCP call_tool request
  {
    "name":      string,
    "arguments": { ...tool_args, "_context": object }
  }

Server → Client: MCP tool result
  {
    "content": [{ "type": "text", "text": json_string }],
    "isError": bool   // true only on handler exception
  }
```

**Tool names registered:**

| Tool name | Status message (from tool-registry.json) |
| :-------- | :---------------------------------------- |
| `get_customer_summary` | Pulling together your account summary… |
| `get_open_items` | Retrieving your open invoices… |
| `get_customer_details` | Fetching your account details… |
| `get_paid_bills` | Looking up your payment history… |
| `get_payer_info` | Checking payer information… |

---

## 3. OpenAI-Compatible Tool Shape (AI Core request)

The MCP client maps each MCP tool to the OpenAI function-calling format before passing to AI Core:

```python
{
    "type": "function",
    "function": {
        "name":        str,   # tool name
        "description": str,   # tool description
        "parameters":  dict   # inputSchema from MCP tool definition
    }
}
```

---

## 4. AI Core Chat Completions Contract

### Turn 1 (non-streaming — tool routing)

```
POST {AICORE_BASE_URL}/v2/inference/deployments/{AICORE_LLM_DEPLOYMENT_ID}/chat/completions
     ?api-version={AICORE_API_VERSION}
Headers:
  Authorization:     Bearer {token}
  Content-Type:      application/json
  AI-Resource-Group: {AICORE_RESOURCE_GROUP}

Body:
{
  "model":       string,
  "max_tokens":  1024,
  "temperature": 0.4,
  "messages":    [...],
  "tools":       [...],
  "tool_choice": "auto",
  "stream":      false
}

Response (parsed JSON):
{
  "choices": [{
    "finish_reason": "tool_calls" | "stop",
    "message": {
      "content":    string | null,
      "tool_calls": [{ "id": string, "function": { "name": string, "arguments": string } }]
    }
  }],
  "usage": { "prompt_tokens": int, "completion_tokens": int, "total_tokens": int }
}
```

### Turn 2 (streaming — final answer)

```
POST (same URL as turn 1)
Body: same as turn 1 but:
  "stream": true
  (no "tools" or "tool_choice")

Response: text/event-stream
  Each event: data: <json>\n\n
  JSON shape: { "choices": [{ "delta": { "content": string | null } }] }
  End: data: [DONE]\n\n
```

---

## 5. Standard Response Envelope

There is no envelope wrapping. Responses are:
- SSE event stream for `/ask-assistant`
- Raw file bytes for `/headless-assistant.js`
- Plain JSON `{ "error": "..." }` for 400 errors (pre-stream only)

This matches the Node.js server exactly.
