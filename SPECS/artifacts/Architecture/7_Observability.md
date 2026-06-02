---
name: b-architecture-observability
description: Observability standards — logging patterns and format for HeadlessAssistant demo servers.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Observability Standards

> **Audience:** SRE · Engineers
> C01 is a browser bundle — no server-side observability. C02/C03 demo servers use console logging only.

---

## 1. Logging Standard

| Concern | Standard |
| :------ | :------- |
| Format | Timestamped plain text: `YYYY-MM-DD HH:MM:SS [label]  message` |
| Required fields | timestamp, label (e.g., `[request]`, `[ai-core]`, `[mcp]`, `[done]`, `[error]`), message |
| Centralized sink | None — stdout/stderr only (demo servers) |
| PII in logs | Prohibited — messages are truncated to 80–120 chars in log output |

**C02 (Node.js) log labels:**
- `[request]` — incoming `/ask-assistant` with truncated message, history length, context
- `[ai-core]` — turn-1 and turn-2 timing, finish_reason, token counts
- `[agent]` — tool_calls list or direct answer char count
- `[mcp]` — tool call dispatch + result timing (120-char result excerpt)
- `[mcp-server]` — tool execution timing from inside MCP server
- `[done]` — total request duration
- `[error]` — unexpected errors

**C03 (Python) log labels:** Identical labels matching Node.js format.

---

## 2. Distributed Tracing

Not implemented — demo servers have no distributed tracing. All timing is local `Date.now()` / `time.monotonic()` differences logged inline.

---

## 3. Product Analytics Platform

Not applicable — C01 has no built-in analytics or telemetry. No third-party analytics are integrated.

---

## 4. C01 Browser Logging

C01 emits to `console.warn` only in exceptional cases:
- `[HeadlessAssistant] Already mounted. Call destroy() first.`
- `[HeadlessAssistant] Could not write history to localStorage: <message>`
- `[HeadlessAssistant] Config load failed: <message>`

No verbose logging in normal operation.

> 🔽 **Deferred to Detailed Design:** SLO targets, alert thresholds, dashboard design — not applicable for demo servers; would be resolved per component if production-deployed.
