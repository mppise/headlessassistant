---
name: c02-agent-server-tools-chg002
description: Specification for CHG-002 — replace inline tool-call dispatch with an MCP server (stdio transport). The agent becomes an MCP client; tools are exposed via the MCP protocol. Plugin structure from CHG-001 is preserved.
license: Apache-2.0 (see LICENSE in project root)
---

# C02 — Agent Server: MCP Tool Server (stdio)

> **Change identifier:** CHG-002
> **Entry phase:** Detailed Design (maintenance refactor — skips Ideation and Planning)
> **Scope:** `_DEMO/agent-server/` only. No changes to `src/`.
> **Supersedes:** CHG-001 tool-loader dispatch path (fully replaced, not extended).

---

## 1. Purpose

CHG-001 introduced a plugin registry where tools are declared in `tool-registry.json` and implemented in isolated `handler.js` files. CHG-002 wraps that same plugin structure in an MCP server so the agent communicates with tools over the Model Context Protocol (stdio transport) rather than via direct JS function calls.

**Result:** the agent server gains a clean protocol boundary between the LLM orchestration layer (`agent.js`) and the tool execution layer (MCP server). Adding a new tool still requires only `schema.json` + `handler.js` + one registry entry — nothing else changes.

---

## 2. File Structure After Refactor

```
_DEMO/agent-server/
  tools/
    tool-registry.json              ← unchanged (CHG-001)
    get_customer_summary/
      schema.json                   ← unchanged (CHG-001)
      handler.js                    ← unchanged (CHG-001)
    get_open_items/   …             ← unchanged (CHG-001)
    get_customer_details/  …        ← unchanged (CHG-001)
    get_paid_bills/   …             ← unchanged (CHG-001)
    get_payer_info/   …             ← unchanged (CHG-001)
  lib/
    mcp-server.js                   ← CHG-002: new — MCP server process (stdio)
    mcp-client.js                   ← CHG-002: new — MCP client used by agent.js
    agent.js                        ← CHG-002: replace tool-loader imports with mcp-client
    tool-loader.js                  ← CHG-002: deleted
    ai-core.js                      ← unchanged
    headless-assistant.js           ← unchanged
    system-prompt.txt               ← unchanged
  routes/
    assistant.js                    ← CHG-002: remove TOOLS import (sourced from mcp-client)
    widget.js                       ← unchanged
  server.js                         ← unchanged
  package.json                      ← CHG-002: add @modelcontextprotocol/sdk
```

---

## 3. Feature Inventory

| Status | ID | Description |
| :----- | :- | :---------- |
| `Ready` | C02-F07 | `lib/mcp-server.js` — standalone MCP server over stdio; reads `tool-registry.json`, registers all tools via `server.tool()`, delegates execution to each `handler.js` |
| `Ready` | C02-F08 | `lib/mcp-client.js` — spawns `mcp-server.js` as a child process at agent startup; connects via `StdioClientTransport`; exposes `getTools()` and `callTool(name, args)` to `agent.js` |
| `Ready` | C02-F09 | `lib/agent.js` — replace `tool-loader.js` imports with `mcp-client.js`; `TOOLS` sourced from `mcpClient.getTools()`; `executeTool` replaced with `mcpClient.callTool()` |
| `Ready` | C02-F10 | `routes/assistant.js` — source `TOOLS` from `mcp-client.js` instead of `agent.js` |
| `Ready` | C02-F11 | `lib/tool-loader.js` — deleted (replaced by mcp-client/server pair) |
| `Ready` | C02-F12 | `package.json` — add `@modelcontextprotocol/sdk` dependency |

---

## 4. Detailed Contracts

### 4.1 `lib/mcp-server.js`

A self-contained Node.js script that runs as a child process. It is **never imported** by the agent — it is spawned by `mcp-client.js`.

**Startup sequence:**
1. Read `tools/tool-registry.json` (same as `tool-loader.js` did)
2. For each registry entry: read `schema.json`, dynamically import `handler.js`
3. Register each tool via `server.tool(name, description, zodSchema, handlerFn)`
4. Connect via `StdioServerTransport` and call `server.connect(transport)`

**Tool registration shape:**

The MCP SDK's `server.tool()` accepts a Zod schema for input validation. Since our tool parameters are already defined in `schema.json` as JSON Schema, we convert them to a Zod schema using `zod` + `zod-from-json-schema`, **or** pass a passthrough Zod object (`z.object({}).passthrough()`) for parameter forwarding without strict validation — the LLM already enforces the schema on its side.

**Decision:** convert each tool's `schema.json` parameters to a Zod schema using `zod-from-json-schema` at registration time. This ensures `tools/list` returns a fully populated `inputSchema` so the LLM receives correct parameter definitions from the MCP layer — making the server standards-compliant. The developer never writes Zod; they only write `schema.json`.

**Handler invocation:**

```js
// Inside server.tool() callback
const result = await handler.execute(args, eppDefaults());
return { content: [{ type: 'text', text: JSON.stringify(result) }] };
```

`eppDefaults()` is defined in `mcp-server.js` (same env vars as before: `EPP_COMP_CODE`, `EPP_CUST_NUM`).

**Error handling:** if `handler.execute` throws, catch and return:
```js
return { content: [{ type: 'text', text: JSON.stringify({ error: `Tool ${name} failed — please try again.` }) }], isError: true };
```

**Exports:** none — this file is an entry point, not a module.

---

### 4.2 `lib/mcp-client.js`

Imported by `agent.js` and `routes/assistant.js`. Manages the lifecycle of the MCP server child process and exposes two functions.

**Startup (module-level, top-level await):**
1. Spawn `mcp-server.js` via `StdioClientTransport` (`{ command: 'node', args: ['lib/mcp-server.js'] }`)
2. Create an `MCP Client` instance and call `client.connect(transport)`
3. Call `client.listTools()` to fetch the tool list
4. Cache the result as `_tools` (OpenAI-compatible array — see shape below)
5. Cache the `statusMessage` map from `tool-registry.json` for `getStatusMessage()`

**`getTools()` → `Array`**

Returns the cached OpenAI-compatible `TOOLS` array built from `client.listTools()` response. MCP returns tools in its own schema shape; this function maps them back to the OpenAI `{ type: 'function', function: { name, description, parameters } }` shape expected by `callAiCore`.

Mapping:
```
MCP tool { name, description, inputSchema } 
  → { type: 'function', function: { name, description, parameters: inputSchema } }
```

**`callTool(name, args)` → `Promise<string>`**

Calls `client.callTool({ name, arguments: args })` and returns the text content string from the first content block. The caller (`agent.js`) will `JSON.stringify` this as the tool result message — same as before.

**`getStatusMessage(name)` → `string`**

Reads from the cached registry map. Returns `entry.statusMessage` or `'Fetching your information…'` fallback.

**Exports:**
```js
export const tools              // OpenAI-compatible array (replaces TOOLS)
export async function callTool(name, args)
export function getStatusMessage(name)
```

---

### 4.3 `lib/agent.js` — change summary [CHG-002]

**Before [CHG-001]:**
```js
import { TOOLS, executeTool, getStatusMessage } from './tool-loader.js';
// ...
const result = await executeTool(fn.name, args, eppDefaults());
```

**After [CHG-002]:**
```js
import { tools as TOOLS, callTool, getStatusMessage } from './mcp-client.js';
// ...
const result = await callTool(fn.name, args);
```

`eppDefaults()` is removed from `agent.js` — context is now injected inside `mcp-server.js`. The `runToolCall` function simplifies accordingly.

---

### 4.4 `routes/assistant.js` — change summary [CHG-002]

**Before [CHG-002]:**
```js
import { TOOLS } from '../lib/tool-loader.js';
```

**After [CHG-002]:**
```js
import { tools as TOOLS } from '../lib/mcp-client.js';
```

---

### 4.5 `package.json` — addition [CHG-002]

Add to `dependencies`:
```json
"@modelcontextprotocol/sdk": "^1.29.0",
"zod-from-json-schema": "^0.3.0",
"zod": "^3.24.0"
```

---

## 5. What Is Not Changing

| File | Status |
| :--- | :----- |
| `tools/tool-registry.json` | Unchanged |
| `tools/*/schema.json` | Unchanged |
| `tools/*/handler.js` | Unchanged |
| `server.js` | Unchanged |
| `routes/widget.js` | Unchanged |
| `lib/ai-core.js` | Unchanged |
| `lib/headless-assistant.js` | Unchanged |
| `lib/system-prompt.txt` | Unchanged |

---

## 6. Extension Protocol (unchanged from CHG-001)

To add a new tool:
1. Create `tools/<name>/schema.json`
2. Create `tools/<name>/handler.js`
3. Add one entry to `tools/tool-registry.json`
4. Restart the server

No other files change.

---

## 7. Assumptions [CHG-002]

| ID | Assumption | Impact if Wrong |
| :- | :--------- | :-------------- |
| A-C02-004 | `@modelcontextprotocol/sdk` v1.29.0 supports `StdioClientTransport` and `StdioServerTransport` in Node ESM without additional polyfills | If wrong, transport instantiation must be adjusted per SDK docs |
| A-C02-005 | `zod-from-json-schema` correctly converts all JSON Schema parameter shapes used in current tool `schema.json` files (object with optional properties, enums, arrays, integers) to equivalent Zod schemas | If wrong, a manual per-tool Zod schema mapping must be authored |
| A-C02-006 | The MCP server child process starts fast enough that `mcp-client.js` top-level await completes before the first HTTP request arrives | If wrong, a lazy-init guard must be added to `callTool()` |

---

## 8. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Plugin tool registry — schema.json + handler.js + tool-registry.json | 2026-05-16 | SpecGantry |
| CHG-002 | MCP server (stdio) replaces inline tool-loader dispatch | 2026-05-16 | SpecGantry |
