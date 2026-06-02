---
name: a-architecture-directory-structure
description: Source code directory structure, file organization, and component ownership for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Directory Structure & Conventions

This section defines the canonical source tree layout as it exists in the repository.

---

## Source Code Tree

```
HeadlessAssistant/
│
├── src/
│   └── headless-assistant.js     ← C01: single distributable bundle (JS + injected CSS)
│
├── _DEMO/
│   ├── agent-server/             ← C02: Node.js reference agent server
│   │   ├── server.js             ← Express app entry point, CORS, route mount
│   │   ├── package.json          ← ESM module; express, @modelcontextprotocol/sdk, zod
│   │   ├── .env                  ← not committed; SAP AI Core credentials
│   │   ├── lib/
│   │   │   ├── agent.js          ← buildMessages(), handleToolCalls(), agentic loop
│   │   │   ├── ai-core.js        ← OAuth2 token cache, callAiCore(), streamResponse()
│   │   │   ├── mcp-client.js     ← MCP client; spawns mcp-server.js; exposes tools, callTool()
│   │   │   ├── mcp-server.js     ← MCP server (stdio); reads registry; dispatches to handlers
│   │   │   ├── headless-assistant.js  ← widget bundle copy (served via GET endpoint)
│   │   │   └── logger.js         ← log(), warn(), err() with timestamp format
│   │   ├── routes/
│   │   │   ├── assistant.js      ← POST /ask-assistant SSE handler
│   │   │   └── widget.js         ← GET /headless-assistant.js file serve
│   │   └── tools/
│   │       ├── tool-registry.json           ← plugin registry: name, statusMessage, schema, handler
│   │       ├── get_customer_summary/
│   │       │   ├── schema.json              ← OpenAI-compatible tool definition
│   │       │   └── handler.js               ← execute(args, context) → mock data
│   │       ├── get_customer_details/
│   │       │   ├── schema.json
│   │       │   └── handler.js
│   │       ├── get_open_items/
│   │       │   ├── schema.json
│   │       │   └── handler.js
│   │       ├── get_paid_bills/
│   │       │   ├── schema.json
│   │       │   └── handler.js
│   │       └── get_payer_info/
│   │           ├── schema.json
│   │           └── handler.js
│   │
│   ├── agent-server-py/          ← C03: Python reference agent server
│   │   ├── server.py             ← FastAPI app, uvicorn launch, lifespan startup
│   │   ├── requirements.txt      ← fastapi, uvicorn, sse-starlette, mcp, httpx, python-dotenv
│   │   ├── routes/
│   │   │   ├── assistant.py      ← POST /ask-assistant SSE handler (EventSourceResponse)
│   │   │   └── widget.py         ← GET /headless-assistant.js file serve
│   │   ├── lib/
│   │   │   ├── agent.py          ← build_messages(), handle_tool_calls(), agentic loop
│   │   │   ├── ai_core.py        ← OAuth2 token cache, call_ai_core(), stream_response()
│   │   │   ├── mcp_client.py     ← MCP client; spawns mcp_server.py; exposes tools, call_tool()
│   │   │   ├── mcp_server.py     ← MCP server (stdio); reads registry; dispatches to handlers
│   │   │   └── logger.py         ← log(), warn(), err() with timestamp format
│   │   └── tools/
│   │       ├── get_customer_summary/handler.py
│   │       ├── get_customer_details/handler.py
│   │       ├── get_open_items/handler.py
│   │       ├── get_paid_bills/handler.py
│   │       └── get_payer_info/handler.py
│   │       (tool-registry.json and schema.json read from ../agent-server/tools/)
│   │
│   ├── payment-portal/           ← Demo web portal (integration example)
│   │   ├── index.html
│   │   ├── portal.js
│   │   ├── portal.css
│   │   └── server.js             ← Static file server for the demo portal
│   │
│   └── prompts/
│       └── system-prompt.txt     ← Shared LLM system prompt (C02 + C03 read this)
│
├── SPECS/
│   ├── artifacts/
│   │   ├── Project.md
│   │   ├── Decisions.md
│   │   └── Architecture/
│   │       ├── README.md
│   │       ├── 0_Overview.md
│   │       ├── 1_Stack.md
│   │       ├── 2_UX.md
│   │       ├── 3_Data.md
│   │       ├── 4_API.md
│   │       ├── 5_Security.md
│   │       ├── 6_Resilience.md
│   │       ├── 7_Observability.md
│   │       ├── 8_Scalability.md
│   │       └── 9_Directory_Structure.md
│   └── components/
│       ├── c01-headless-assistant/
│       │   ├── A_Core_Spec.md
│       │   └── B_Specification.md
│       ├── c02-agent-server/
│       │   ├── A_Core_Spec.md
│       │   └── B_Specification.md
│       └── c03-agent-server-py/
│           ├── A_Core_Spec.md
│           └── B_Specification.md
│
├── _SPECS/                       ← Legacy spec archive (prior format; read-only reference)
├── STATUS.md
├── CLAUDE.md
└── .claude/
    ├── CONTRACT.md
    ├── hooks/
    └── skills/
```

---

## Component Ownership & Directory Allocation

| Component | Owned Directory | Scope |
|-----------|-----------------|-------|
| C01 HeadlessAssistant | `src/` | Single bundle file — all widget capabilities |
| C02 Agent Server (Node.js) | `_DEMO/agent-server/` | Reference demo server — do not modify `src/` |
| C03 Agent Server (Python) | `_DEMO/agent-server-py/` | Reference demo server — do not modify `src/` |
| Shared prompts | `_DEMO/prompts/` | System prompt shared by C02 and C03 (read-only from tool code) |
| Tool registry + schemas | `_DEMO/agent-server/tools/` | Shared by C02 and C03 (Python reads schemas via relative path) |

---

## Naming Conventions

### Files
- **JavaScript:** `kebab-case.js`
- **Python:** `snake_case.py`
- **JSON:** `kebab-case.json` or `snake_case.json` (per existing file)
- **Markdown:** `SCREAMING_CASE.md` for top-level project docs; `A_`, `B_` prefix for spec files

### Feature Traceability
Every feature in `A_Core_Spec.md` must have a corresponding entry point in code with a Feature ID comment:
```javascript
// [C01-F01] Auto-init: detect data-config attribute on script tag
async function autoInit() { ... }
```
```python
# [C03-F09] Agent logic — message building and agentic tool-call loop.
```

---

## Enforcement Rules

### Rule 1: C01 is a single file
`src/headless-assistant.js` is the only source file for C01. No additional files in `src/`.

### Rule 2: Demo servers do not modify `src/`
`_DEMO/agent-server/` and `_DEMO/agent-server-py/` are self-contained. They serve a copy of `headless-assistant.js` from their own `lib/` directory, not from `src/`.

### Rule 3: Tool handlers are standalone
Each tool handler exports only `execute(args, context)`. No shared state between handlers. No imports from other handlers.

### Rule 4: Shared files are read-only from Python
`_DEMO/agent-server-py/` reads `tool-registry.json` and `schema.json` files from `../agent-server/tools/` via relative path. These files are not duplicated.

---

## Change History

| Date | Change | File(s) | Rationale |
|------|--------|---------|-----------|
| 2026-05-31 | Add directory structure specification | 9_Directory_Structure.md | Enforce consistent file organization |
| 2026-06-01 | Updated by reverse engineering — aligned to actual code layout | 9_Directory_Structure.md | Source of truth is now the code, not the template |
