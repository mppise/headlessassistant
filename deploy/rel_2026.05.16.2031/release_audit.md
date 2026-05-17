---
release: 2026.05.16.2031
components: C01-HeadlessAssistant (carried forward), C02-AgentServerTools (new)
verdict: PASS
date: 2026-05-16
---

# Release Audit — v2026.05.16.2031

## ✅ PASS

> All SEV-1 and SEV-2 checks passed. This release is cleared for deployment.

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C01-HeadlessAssistant (`src/headless-assistant.js`) | Carried forward | No changes from v2026.05.15.2146. All 23 features remain complete and verified. |
| C02-AgentServerTools (`_DEMO/agent-server/`) | Updated | CHG-001: Plugin tool registry — each tool isolated in `tools/<name>/schema.json` + `handler.js`; central `tool-registry.json` config; zero changes to server core when adding tools. CHG-002: MCP stdio server — `lib/mcp-server.js` exposes all tools via Model Context Protocol (stdio transport); `lib/mcp-client.js` spawns MCP server as child process; `routes/assistant.js` and `lib/agent.js` unchanged structurally. Additional: request context (`CompCode`, `CustNum`) threaded from request body through MCP to handlers; structured request logging (`lib/logger.js`) with timestamps, tool call visibility, and AI Core turn timing. |
| Demo: start script (`_DEMO/start.sh`) | Updated | Portal starts before agent-server; agent-server logs written to `agent-server.log` via `stdbuf -oL -eL`; `tail -f` replaces `wait` for live log visibility. |

---

## B. Technical Audit

### B.1 Security

* [X] **[Security/C01 — carried forward]** All C01 security findings from v2026.05.15.2146 remain resolved: XSS sanitizer, href sanitization, bearer token handling, CORS, input validation, OAuth2 token caching, localStorage namespacing, avatar URL escaping.
* [X] **[Security/MCP stdio isolation]** MCP server runs as a child process over stdio. It has no network exposure — it cannot receive arbitrary connections. Attack surface is limited to the parent process.
* [X] **[Security/Context injection]** `_context` is destructured out of MCP tool arguments in `mcp-server.js` before passing clean `args` to `handler.execute()`. Handlers cannot receive the context object as an LLM-generated argument — prevents prompt-injection-driven context manipulation.
* [X] **[Security/Credentials not logged]** `lib/logger.js` logs `context` (CompCode, CustNum) at request level. These are account identifiers, not credentials. OAuth2 client secret and bearer token are never passed to the logger.
* [X] **[Security/CORS]** Wildcard `Access-Control-Allow-Origin: *` retained — appropriate for a public widget API. No change.
* [ ] **[Security/context validation]** `context` from `req.body` is passed directly to tool handlers without schema validation. A malformed or unexpected `context` object (e.g. injected fields) propagates to all handlers unchecked. Non-blocking for demo use, but should be validated at the route boundary before production. **SEV-3.**

### B.2 Architecture

* [X] **[Architecture/MCP protocol correctness]** `mcp-server.js` uses `convertJsonSchemaToZod` to convert each `schema.json` parameters block to a Zod schema at registration time. `tools/list` response carries fully populated `inputSchema` — standards-compliant MCP server.
* [X] **[Architecture/Plugin extensibility]** Adding a new tool requires only: `tools/<name>/schema.json`, `tools/<name>/handler.js`, one entry in `tool-registry.json`. `server.js`, `agent.js`, `assistant.js`, and `ai-core.js` are not touched.
* [X] **[Architecture/MCP client startup]** `mcp-client.js` uses top-level `await` for MCP connection and `listTools()` at module load time. The Express server only finishes starting after `mcp-client.js` is fully resolved — tool list is guaranteed ready before first request.
* [X] **[Architecture/stdio protocol hygiene]** `mcp-server.js` uses only `stderr` (via `warn`/`err` from `logger.js`) for logging — `console.log` (stdout) would corrupt the MCP stdio protocol. `console.log` is used only in the parent process.
* [X] **[Architecture/Two-turn agentic loop]** Unchanged from v2026.05.15.2146 and verified correct: Turn 1 non-streaming (tool detection), Turn 2 streaming (final answer).
* [X] **[Architecture/Parallel tool execution]** Multiple tool calls from a single LLM turn are dispatched in parallel via `Promise.all` — no artificial serialization.
* [X] **[Architecture/eppDefaults removed]** `eppDefaults()` is removed from `agent.js` entirely. Context is caller-supplied, not environment-defaulted. Clean separation of concerns.

### B.3 Syntax

* [X] **[Syntax/ESM consistency]** All new files (`lib/mcp-server.js`, `lib/mcp-client.js`, `lib/logger.js`, `lib/agent.js`) use ES module syntax. `"type": "module"` in `package.json`. No CJS/ESM conflicts.
* [X] **[Syntax/tool-registry.json]** Valid JSON array. All 5 entries have required fields: `name`, `statusMessage`, `schema`, `handler`.
* [X] **[Syntax/schema.json files]** All 5 `schema.json` files are valid JSON and conform to the OpenAI tool definition shape (`type`, `function.name`, `function.description`, `function.parameters`).
* [X] **[Syntax/handler.js files]** All 5 `handler.js` files export a named async `execute` function. `get_customer_summary/handler.js` correctly delegates to `get_open_items` and `get_customer_details` handlers to avoid fixture duplication.
* [X] **[Syntax/start.sh]** Valid Bash. `stdbuf` usage is correct. Log file truncated with `: >` before server start. `tail -f` correctly blocks as the foreground process.

### B.4 Maintainability

* [X] **[Maintainability/logger.js]** Single shared logger with consistent `YYYY-MM-DD HH:MM:SS [label] message` format across all modules. One place to change log format.
* [X] **[Maintainability/CHG tags]** All changed lines carry `// [CHG-001]` or `// [CHG-002]` inline tags, matching the spec change history.
* [X] **[Maintainability/tool-loader deleted]** `lib/tool-loader.js` removed cleanly. No dangling imports — verified by grep.
* [X] **[Maintainability/mock-data deleted]** `lib/mock-data.js` removed cleanly. Fixture data co-located with each handler. `get_customer_summary` delegates to sibling handlers rather than duplicating fixtures.
* [ ] **[Maintainability/Status events — client]** Carried forward from v2026.05.15.2146. Agent-server emits `data: {"status":"..."}` SSE events during tool execution; the widget client still does not render them. **SEV-3.**
* [ ] **[Maintainability/context validation]** Noted under Security above — also a maintainability concern: no documented shape for `context` object means handlers must defensively access fields. **SEV-3 (same finding).**

### B.5 Test Coverage

* [ ] **[TestCoverage/Unit tests]** Carried forward from v2026.05.15.2146. No automated tests. **SEV-3.**
* [ ] **[TestCoverage/MCP server]** No tests for tool registration, schema conversion, or handler dispatch in the MCP layer. Manual verification only. **SEV-3.**

### B.6 Dependencies

* [X] **[Dependencies/@modelcontextprotocol/sdk ^1.29.0]** Official MCP SDK from Anthropic. Active maintenance, stable API. ESM-compatible. Verified working with Node v25.
* [X] **[Dependencies/zod ^4.4.3]** Required by `@modelcontextprotocol/sdk`. Well-maintained, zero sub-dependencies.
* [X] **[Dependencies/zod-from-json-schema ^0.5.2]** Used for JSON Schema → Zod conversion at MCP server startup (one-time, not per-request). Verified: correctly converts all parameter shapes used across the 5 tools (enums, integers, arrays, optional properties).
* [X] **[Dependencies/nodemon]** Dev-only launcher. Not included in production artifact. `go.sh` invokes `node` directly.

---

### Finding Summary

| Severity | Count | Blocks release? |
| :------- | :---: | :-------------- |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 5 | No |

**SEV-3 items (non-blocking):**
1. Status events emitted by agent-server are not rendered client-side in the widget (carried from v2026.05.15.2146).
2. No automated test suite — all verification is manual (carried from v2026.05.15.2146).
3. No MCP layer tests — tool registration, schema conversion, and handler dispatch are manually verified only.
4. `context` object from `req.body` is not validated at the route boundary — passes unchecked to handlers.
5. No documented shape/contract for the `context` object in API documentation.

---

## C. Risk & Recovery

### C.1 Smoke Test Plan

| # | Flow | Health check |
| - | ---- | ------------ |
| 1 | Start demo via `_DEMO/start.sh`; confirm `agent-server.log` shows startup lines and MCP server connected | Log shows `[server] Agent server → http://localhost:3000` within 5s |
| 2 | Load `http://localhost:8080`; confirm portal renders and widget bubble appears | No JS console errors; bubble visible bottom-right |
| 3 | Send a message requiring a tool call: *"What is my current balance?"* | Log shows `[agent] tool_calls: get_customer_summary`, `[mcp] →`, `[mcp] ←`, `[ai-core] turn-2`; streaming response appears in widget |
| 4 | Send a message not requiring a tool: *"Hello"* | Log shows `[agent] direct answer`; single-turn response in widget |
| 5 | Verify context threading: confirm `[request]` log line shows correct `CompCode` and `CustNum` from the payment portal config | Log shows `context={"CompCode":"1000","CustNum":"0000123456"}` |

### C.2 Rollback Plan

| Trigger | Action |
| :------ | :----- |
| MCP server fails to start (stdio connection error) | Restart agent-server; check Node.js version ≥18 (top-level await required); check `tools/tool-registry.json` for malformed entries |
| Tool calls return errors for all tools | Check `agent-server.log` for `[mcp-server]` ERROR lines; verify `tools/*/handler.js` files are present; restart server |
| Widget regression (C01 breakage) | Redeploy prior `headless-assistant.js` from `rel_2026.05.15.2146`; agent-server changes are independent |
| Full rollback | Revert `_DEMO/agent-server/` to prior release; stateless service — no data loss; estimated recovery < 5 minutes |

**Database reversibility:** Not applicable — no database used.
**Estimated recovery time:** < 5 minutes.
