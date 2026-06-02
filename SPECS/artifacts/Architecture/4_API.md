---
name: b-architecture-api
description: API design patterns, versioning strategy, and interface contracts for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# API Design

> **Audience:** Backend · Frontend · Integrators

---

## 1. API Patterns

| Boundary | Pattern | Rationale |
| :------- | :------ | :-------- |
| C01 Widget → Integrator API | HTTPS POST (JSON body) | Simple, universally supported; Bearer token auth |
| C01 Widget → Integrator API (streaming) | SSE via `fetch` + `ReadableStream` | Standard browser streaming; `[DONE]` sentinel for termination |
| C02/C03 Agent Server → SAP AI Core | HTTPS POST (OpenAI-compatible chat completions API) | OAuth2 client-credentials token; streaming turn 2 |
| C02/C03 Agent Server → MCP Server | stdio JSON-RPC (MCP protocol) | Plugin isolation; tool schemas negotiated at startup |

---

## 2. C01 Outbound Request Contract

```
POST {config.ai_endpoint}
Authorization: Bearer {config.bearer_token}
Content-Type: application/json

{
  "customer_id": string,           — user ID (config.customer_id or ha_user_id UUID)
  "message":     string,           — current user message (non-empty, max 4000 chars)
  "history":     ConversationTurn[] — last max_turns turns from ha_history
}

ConversationTurn:
{
  "role":    "user" | "assistant"
  "content": string
}
```

---

## 3. C01 Inbound Response Contracts

**Full JSON mode (`stream_mode: "json"`):**
```
HTTP 200 OK
Content-Type: application/json

{ "message": "## Markdown content…" }   ← field path from config.response_field (default: "message")
```
- Dot-notation path supported (e.g., `data.reply` → `{ "data": { "reply": "…" } }`)
- Max path depth: 5 levels

**SSE streaming mode (`stream_mode: "sse"`):**
```
HTTP 200 OK
Content-Type: text/event-stream

data: {"message": "chunk of text"}

data: [DONE]          ← sentinel; or connection close
```
- Unparseable chunks are silently skipped
- Each chunk: accumulate → re-render full markdown → update bubble innerHTML

**Error responses:**
```
HTTP 4xx / 5xx → toast/banner shown; response body not displayed to user
Network error  → toast/banner shown ("Could not reach the server")
```

---

## 4. C02/C03 Inbound Request Contract (from C01)

```
POST /ask-assistant
Content-Type: application/json

{
  "message":  string,
  "history":  ConversationTurn[],   — optional
  "context":  object                — optional; passed through to tool calls
}
```

---

## 5. C02/C03 Outbound SSE Contract (to C01)

```
Content-Type: text/event-stream

data: {"status":"Pulling together your account summary…"}   ← during tool execution
data: {"message":"chunk of assistant text"}                 ← streaming answer
data: [DONE]                                                ← end of stream
data: {"error":"An unexpected error occurred…"}             ← on server error, followed by [DONE]
```

---

## 6. Versioning Strategy

**C01:** Not applicable — the widget consumes the integrator's API; versioning is the integrator's responsibility. The widget itself is a versioned static file (by filename or CDN tag).

**C02/C03:** Not applicable — demo servers; no versioning policy.

> 🔽 **Deferred to Detailed Design:** Full input validation rules, timeout handling, per-endpoint error codes — resolved per component in `B_Specification.md`.
