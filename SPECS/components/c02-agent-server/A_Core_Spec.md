---
name: c02-agent-server-core-spec
description: Core specification for C02 — Node.js reference agent server with plugin MCP tool registry and SAP AI Core integration.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C02 — Agent Server (Node.js): Core Specification

Architecture refs: `SPECS/artifacts/Architecture/0_Overview.md`, `SPECS/artifacts/Architecture/4_API.md`

> Reference demo backend. An Express HTTP server that bridges C01 to SAP AI Core using a two-turn agentic loop with MCP-based plugin tool dispatch. **Demo only — not production-hardened.**

---

## 1. Purpose

C02 provides a reference implementation of the server side of the HeadlessAssistant integration. It demonstrates:
- How to receive C01's SSE-based POST request and stream a response back
- A two-turn agentic loop: turn 1 (tool detection) → tool execution via MCP → turn 2 (streaming answer)
- A plugin tool registry pattern where tools are isolated in directories and registered via a JSON config file

**Ownership boundary:** `_DEMO/agent-server/` only. C02 must not modify `src/`.

---

## 2. Feature Inventory

| Status | ID | Description | Priority |
| :----- | :- | :---------- | :------- |
| `Complete` | C02-F01 | HTTP server entry point — load `.env`, apply CORS (`*`), mount widget + assistant routes, listen on `PORT` (default 3000) | P1 |
| `Complete` | C02-F02 | `GET /headless-assistant.js` — serve `lib/headless-assistant.js` as `application/javascript` | P1 |
| `Complete` | C02-F03 | `POST /ask-assistant` — validate request body `{ message, history?, context? }`; return 400 on missing/blank message; set SSE response headers | P1 |
| `Complete` | C02-F04 | SSE response streaming — emit `data: {"status":"..."}` during tool execution; `data: {"message":"..."}` for answer chunks; `data: [DONE]` on completion | P1 |
| `Complete` | C02-F05 | AI Core OAuth2 token cache — `getAccessToken()` fetches client-credentials token; caches in module memory until 60s before expiry | P1 |
| `Complete` | C02-F06 | AI Core turn-1 call (non-streaming) — POST to AI Core with `tools`, `tool_choice: "auto"`, `stream: false`; parse `choices[0]` | P1 |
| `Complete` | C02-F07 | Agent agentic loop — if `finish_reason === "tool_calls"`: dispatch tools via MCP, append results, trigger turn 2; else emit content directly | P1 |
| `Complete` | C02-F08 | AI Core turn-2 call (streaming) — POST with `stream: true`; proxy SSE chunks to browser via `send.chunk()` using `choices[0].delta.content` | P1 |
| `Complete` | C02-F09 | MCP client — spawn `mcp-server.js` subprocess via `StdioClientTransport`; call `listTools()` at startup; `callTool(name, args, context)` via JSON-RPC | P1 |
| `Complete` | C02-F10 | MCP server — read `tool-registry.json`; convert each `schema.json` to Zod via `zod-from-json-schema`; register tools with `McpServer`; dispatch to `handler.js execute()` | P1 |
| `Complete` | C02-F11 | Tool plugin registry — `tool-registry.json` declares all tools: `name`, `statusMessage`, `schema` path, `handler` path | P1 |
| `Complete` | C02-F12 | Five tool handlers — `get_customer_details`, `get_customer_summary`, `get_open_items`, `get_paid_bills`, `get_payer_info`; each exports `execute(args, context)` returning mock data | P1 |
| `Complete` | C02-F13 | Logger — `log()`, `warn()`, `err()` with `YYYY-MM-DD HH:MM:SS [label]  message` format | P2 |
| `Complete` | C02-F14 | Request logging — log each `/ask-assistant` request with truncated message (80 chars), history length, context; log AI Core turn timing and token counts; log MCP tool dispatch timing | P2 |

---

## 3. Dependencies

| Package | Version | Purpose |
| :------ | :------ | :------ |
| `express` | `^5.0.0` | HTTP server + router |
| `@modelcontextprotocol/sdk` | `^1.29.0` | MCP `Client`, `McpServer`, `StdioClientTransport`, `StdioServerTransport` |
| `zod` | `^4.4.3` | Runtime schema validation (used by MCP server) |
| `zod-from-json-schema` | `^0.5.2` | Convert JSON Schema to Zod for MCP tool registration |
| `dotenv` | `^16.0.0` | Load `.env` variables |

---

## 4. Data Flows

```
POST /ask-assistant
  Input: { message, history[], context{} }
  → [C02-F03] validate → 400 if invalid
  → [C02-F03] set SSE headers, flushHeaders()
  → [C02-F05] getAccessToken() → Bearer token (cached)
  → buildMessages(history, message) → messages[]
  → [C02-F06] callAiCore(token, { messages, stream:false, tools, tool_choice:'auto' }) → turn1
  → if finish_reason === 'tool_calls':
      → [C02-F07] handleToolCalls()
          → [C02-F09] callTool(name, args, context) × N  [parallel Promise.all]
              → MCP stdio IPC → [C02-F10] mcp-server.js dispatch → [C02-F12] execute()
          → emit status SSE events per tool
          → append tool results to messages
          → [C02-F08] callAiCore(token, { messages, stream:true }) → streaming turn 2
          → proxy SSE chunks to browser via send.chunk()
  → else:
      → [C02-F04] send.chunk(content) — direct answer
  → [C02-F04] send.done() → res.end()

GET /headless-assistant.js
  → [C02-F02] stream lib/headless-assistant.js as application/javascript
```

---

## 5. Execution Mode

**Request-driven service.** `server.js` is the entry point; Express serves HTTP. The MCP server (`mcp-server.js`) is spawned as a child process at module import time (`mcp-client.js` is a top-level ESM module with `await` at module scope).

**Lifecycle:**
1. `node server.js` → loads `.env` → imports `mcp-client.js` (spawns `mcp-server.js`, connects, lists tools) → starts Express.
2. Express serves requests until process termination.
3. On SIGINT/SIGTERM, child process exits when its stdio pipe closes.

---

## 6. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Plugin tool registry refactor — separated tool config, schemas, and handlers | 2026-05-16 | SpecGantry |
| CHG-002 | MCP integration — replaced tool-loader with MCP client/server stdio transport | 2026-05-16 | SpecGantry |
| — | Updated by reverse engineering — feature inventory aligned to current code | 2026-06-01 | SpecGantry |
