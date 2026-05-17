---
release: 2026.05.16.2031
date: 2026-05-16
audience: Internal — operators and integrators
---

# Release Announcement — v2026.05.16.2031

## What's in this release

This release delivers **C02-AgentServerTools** — a complete architectural refactor of the agent-server's tool system. The HeadlessAssistant widget (`src/headless-assistant.js`) is unchanged.

### Plugin Tool Registry (CHG-001)

Tool definitions, schemas, and implementations are now fully decoupled from the server core. Each tool lives in its own directory:

```
tools/
  get_customer_summary/
    schema.json     ← LLM tool definition (JSON Schema)
    handler.js      ← execute(args, context) implementation
  get_open_items/   …
  tool-registry.json  ← single config file registering all tools
```

**Adding a new tool no longer requires touching any server file.** Create `schema.json` + `handler.js`, add one entry to `tool-registry.json`, restart.

### MCP Stdio Server (CHG-002)

Tools are now exposed via the **Model Context Protocol** (stdio transport). The agent-server spawns a standards-compliant MCP server child process at startup. The LLM receives fully-populated tool schemas via `tools/list` — including parameter types, enums, and descriptions — directly from the MCP layer.

### Caller-supplied Context

`EPP_COMP_CODE` and `EPP_CUST_NUM` environment variables are removed. The caller now passes account context in the request body:

```json
{
  "message": "What do I owe?",
  "history": [],
  "context": { "CompCode": "1000", "CustNum": "0000123456" }
}
```

Context is threaded through the MCP protocol to each tool handler as the second argument of `execute(args, context)`.

### Structured Logging

All agent-server modules now emit consistent, timestamped log lines:

```
2026-05-16 20:31:14 [request]    message="What do I owe?"  history=0 turns  context={…}
2026-05-16 20:31:15 [ai-core]    turn-1  812ms  finish=tool_calls  tokens=312
2026-05-16 20:31:15 [agent]      tool_calls: get_customer_summary
2026-05-16 20:31:15 [mcp]        → get_customer_summary  "Pulling together your account summary…"  args={}
2026-05-16 20:31:15 [mcp]        ← get_customer_summary  4ms  result={…}
2026-05-16 20:31:15 [ai-core]    turn-2  streaming...
2026-05-16 20:31:17 [ai-core]    turn-2  1923ms  chars=387
2026-05-16 20:31:17 [done]       total=2741ms
```

The demo `start.sh` now writes agent-server logs to `_DEMO/agent-server.log` and tails it live in the terminal.

---

## Required actions

### For operators running the demo

1. Remove `EPP_COMP_CODE` and `EPP_CUST_NUM` from `_DEMO/agent-server/.env` if present — they are no longer read.
2. Ensure the payment portal passes `context: { CompCode, CustNum }` in the request body. The demo portal already does this.
3. Run `_DEMO/start.sh` as before — no other changes to the start procedure.

### For integrators calling `/ask-assistant` directly

Update your POST body to include the `context` object:

```json
{
  "message": "...",
  "history": [...],
  "context": {
    "CompCode": "<your company code>",
    "CustNum": "<customer number>"
  }
}
```

If `context` is omitted, it defaults to `{}` — handlers will receive an empty context and may return incomplete results.

---

## Known limitations

| # | Limitation | Severity | Plan |
| - | ---------- | :------: | ---- |
| 1 | Widget does not render `status` SSE events (tool-in-progress messages) in the chat UI — they are emitted by the server but silently dropped client-side | SEV-3 | Next release |
| 2 | No automated test suite — all verification is manual | SEV-3 | Next release |
| 3 | MCP tool layer has no automated tests | SEV-3 | Next release |
| 4 | `context` object is not validated at the route boundary | SEV-3 | Next release |
| 5 | Tool handlers use mock fixture data — not connected to live EPP Swiftpay APIs | By design (demo) | Integration release |
