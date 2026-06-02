---
name: c02-agent-server-tools-spec
description: Specification for CHG-001 — plugin-based tool registry refactor of _DEMO/agent-server. Separates tool config, schemas, and handlers into isolated codespaces; eliminates the need to touch core server files when adding new tools.
license: Apache-2.0 (see LICENSE in project root)
---

# C02 — Agent Server: Plugin Tool Registry

> **Change identifier:** CHG-001  
> **Entry phase:** Detailed Design (maintenance refactor — skips Ideation and Planning)  
> **Scope:** `_DEMO/agent-server/` only. No changes to `src/`.

---

## 1. Purpose

The current agent-server embeds tool definitions, status messages, and tool implementations across two files (`lib/agent.js` and `lib/mock-data.js`). Adding a new tool requires editing both files — a violation of the open/closed principle and a friction point for ongoing development.

This change introduces a plugin architecture where:
- Each tool lives in its own directory (`tools/<tool-name>/`) with a `schema.json` and a `handler.js`
- A single config file (`tools/tool-registry.json`) declares all registered tools
- A stable infrastructure module (`lib/tool-loader.js`) reads the registry, dynamically imports each handler, and builds the `TOOLS` array and `executeTool()` function consumed by `lib/agent.js`
- `lib/agent.js`, `routes/assistant.js`, `server.js`, and `lib/ai-core.js` are **not modified**

---

## 2. File Structure After Refactor

```
_DEMO/agent-server/
  tools/
    tool-registry.json                  ← CHG-001: new — central tool config
    get_customer_summary/
      schema.json                       ← CHG-001: new — LLM tool definition
      handler.js                        ← CHG-001: new — implementation (extracted from mock-data.js)
    get_open_items/
      schema.json
      handler.js
    get_customer_details/
      schema.json
      handler.js
    get_paid_bills/
      schema.json
      handler.js
    get_payer_info/
      schema.json
      handler.js
  lib/
    tool-loader.js                      ← CHG-001: new — registry reader + dynamic importer
    agent.js                            ← CHG-001: import changed (tool-loader replaces mock-data + inline TOOLS)
    ai-core.js                          ← unchanged
    mock-data.js                        ← CHG-001: deleted (fixtures moved into handler files)
    headless-assistant.js               ← unchanged
  routes/
    assistant.js                        ← unchanged
    widget.js                           ← unchanged
  server.js                             ← unchanged
  package.json                          ← unchanged
```

---

## 3. Feature Inventory

| Status | ID | Description |
| :----- | :- | :---------- |
| `Ready` | C02-F01 | `tool-registry.json` — declares all registered tools: name, status message, schema path, handler path |
| `Ready` | C02-F02 | `tools/<name>/schema.json` — self-contained LLM tool definition (type, function.name, description, parameters) |
| `Ready` | C02-F03 | `tools/<name>/handler.js` — exports a single `execute(args, context)` async function; owns its own fixtures |
| `Ready` | C02-F04 | `lib/tool-loader.js` — reads `tool-registry.json`, dynamically imports all handlers, builds and exports `TOOLS` (array) and `executeTool(name, args, context)` |
| `Ready` | C02-F05 | `lib/agent.js` — import line updated: replaces `executeTool` from `mock-data.js` and inline `TOOLS` array with imports from `tool-loader.js`; all other logic unchanged |
| `Ready` | C02-F06 | `lib/mock-data.js` — deleted; all fixture data and mock logic migrated into the corresponding `handler.js` files |

---

## 4. Detailed Contracts

### 4.1 `tools/tool-registry.json`

A JSON array. Each entry registers one tool.

```json
[
  {
    "name": "get_customer_summary",
    "statusMessage": "Pulling together your account summary…",
    "schema": "./tools/get_customer_summary/schema.json",
    "handler": "./tools/get_customer_summary/handler.js"
  }
]
```

| Field | Type | Required | Description |
| :---- | :--- | :------: | :---------- |
| `name` | string | yes | Must exactly match the `function.name` in the corresponding `schema.json` and the tool name used in `executeTool()` calls |
| `statusMessage` | string | yes | SSE status message emitted to the browser while the tool is executing |
| `schema` | string | yes | Relative path from the agent-server root to the tool's `schema.json` |
| `handler` | string | yes | Relative path from the agent-server root to the tool's `handler.js` |

**Invariant:** Every entry in `tool-registry.json` must have a corresponding `schema.json` and `handler.js` at the declared paths. `tool-loader.js` throws a startup error if any path resolves to a missing file.

---

### 4.2 `tools/<name>/schema.json`

A JSON object representing one OpenAI-compatible tool definition. This is the exact object that goes into the `tools` array sent to the LLM.

```json
{
  "type": "function",
  "function": {
    "name": "get_customer_summary",
    "description": "Returns a combined summary of the patient's account…",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}
```

**Constraint:** `function.name` must match the `name` field of the corresponding `tool-registry.json` entry.

---

### 4.3 `tools/<name>/handler.js`

Exports a single named async function: `execute`.

```js
// Signature
export async function execute(args, context) { ... }
```

| Parameter | Type | Description |
| :-------- | :--- | :---------- |
| `args` | object | Tool call arguments parsed from the LLM response (`fn.arguments`) |
| `context` | object | Runtime context injected by `tool-loader.js` — contains `{ CompCode, CustNum }` from `eppDefaults()` in `agent.js` |

**Return value:** Any JSON-serializable value. `tool-loader.js` will `JSON.stringify()` the return value before passing it back to the LLM as the tool result.

**Error handling:** If `execute` throws, `tool-loader.js` catches it, logs it, and returns `{ error: "Tool <name> failed — please try again." }` — matching the current behavior in `agent.js`.

**Fixtures:** Each `handler.js` owns its own mock fixture data as module-level constants. No shared fixture file.

---

### 4.4 `lib/tool-loader.js`

Reads `tool-registry.json` at module load time and dynamically imports each handler. Exports two items consumed by `lib/agent.js`:

```js
export const TOOLS        // array — ready to pass to callAiCore as `tools:`
export async function executeTool(name, args, context)
```

**Startup behavior:**
1. Read `tools/tool-registry.json` (synchronous `fs.readFileSync` — acceptable at module load time, same pattern as `system-prompt.txt` in `agent.js`)
2. For each registry entry, dynamically `import()` the handler module
3. Build `TOOLS` by reading each `schema.json` (synchronous `fs.readFileSync + JSON.parse`)
4. Build an internal `Map<name, { execute, statusMessage }>` for O(1) dispatch

**`executeTool(name, args, context)` behavior:**
- Looks up the handler in the internal Map
- If not found: throws `Error('Unknown tool: <name>')`
- If found: calls `handler.execute(args, context)` and returns the result

**Status message access:** `tool-loader.js` also exports:

```js
export function getStatusMessage(name)  // returns the statusMessage string, or a fallback
```

This replaces the `STATUS_MESSAGES` map in `agent.js`.

---

### 4.5 `lib/agent.js` — change summary [CHG-001]

Only the import block and one reference change. All logic, `buildMessages`, `handleToolCalls`, `runToolCall`, and `eppDefaults` are preserved as-is.

**Before:**
```js
import { executeTool } from './mock-data.js';
// ...
export const TOOLS = [ /* inline array */ ];
const STATUS_MESSAGES = { /* inline map */ };
// ...
send.status(STATUS_MESSAGES[fn.name] ?? 'Fetching your information…');
```

**After [CHG-001]:**
```js
import { TOOLS, executeTool, getStatusMessage } from './tool-loader.js';
// ...
send.status(getStatusMessage(fn.name));
```

The `TOOLS` export and `STATUS_MESSAGES` constant are removed from `agent.js`. The `eppDefaults()` function stays in `agent.js` and is passed as `context` to `executeTool`.

---

## 5. Extension Protocol

To add a new tool after this refactor:

1. Create `tools/<new-tool-name>/schema.json` — define the LLM schema
2. Create `tools/<new-tool-name>/handler.js` — implement `execute(args, context)`
3. Add one entry to `tools/tool-registry.json`
4. Restart the server

**No other files are modified.**

---

## 6. What Is Not Changing

| File | Status |
| :--- | :----- |
| `server.js` | Unchanged |
| `routes/assistant.js` | Unchanged |
| `routes/widget.js` | Unchanged |
| `lib/ai-core.js` | Unchanged |
| `lib/headless-assistant.js` | Unchanged |
| `prompts/system-prompt.txt` | Moved from `lib/` to shared `_DEMO/prompts/` |
| `package.json` | Unchanged |
| `src/` | Not in scope |

---

## 7. Assumptions [CHG-001]

| ID | Assumption | Impact if Wrong |
| :- | :--------- | :-------------- |
| A-C02-001 | Dynamic `import()` at module load time is acceptable in this Node.js ESM environment | If wrong, a synchronous loader strategy using `createRequire` must be used instead |
| A-C02-002 | All current tools in `mock-data.js` will continue to use mock fixtures; no real HTTP calls are introduced in this change | If wrong, handler contracts must be extended to support async fetch with env-based endpoint config |
| A-C02-003 | The `eppDefaults()` context (`CompCode`, `CustNum`) is sufficient for all current and near-term tools | If wrong, the `context` object shape must be versioned |

---

## 8. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial spec — plugin tool registry for agent-server | 2026-05-16 | SpecGantry |
