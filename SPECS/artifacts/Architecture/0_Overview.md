---
name: b-architecture-overview
description: Architecture overview — system blueprint, component map, and key architectural decisions for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Architecture Overview

> **High-level system design.** This section provides the system blueprint and functional component boundaries. Per-component details are in `./SPECS/components/<component>/`.

---

## 1. System Blueprint

> **Audience:** Everyone. Start here.

### 1.1 High-Level Data Flow

```
Integrator Page
  └── <script src="headless-assistant.js" data-config="config.json">
        │
        ▼
  [C01 - HeadlessAssistant]  (browser, zero-dependency JS bundle)
        │
        ├── Load config (JSON file or init() options)
        ├── Restore history from localStorage (ha_history)
        ├── Inject CSS + render widget DOM into host page
        │
        ▼
  User types message
        │
        ├── Trim history to last max_turns
        ├── POST { customer_id, message, history } → Integrator API Endpoint
        │     Authorization: Bearer {token}
        │
        ▼
  API Response
        ├── SSE stream  → accumulate chunks → re-render markdown on each chunk
        └── Full JSON   → read response_field → render markdown once
        │
        ▼
  Rendered HTML in chat panel (XSS-sanitized)
        │
        └── Append turn to ha_history in localStorage


Demo stack (reference only — not production):
  _DEMO/payment-portal  ──POST /ask-assistant──►  [C02 / C03 — Agent Server]
                                                          │
                                            ├── SAP AI Core (OAuth2 + LLM)
                                            └── MCP Server (tool dispatch)
                                                     └── Tool handlers (mock data)
```

### 1.2 Component Interaction Map

| From | To | Protocol | Sync / Async |
| :--- | :- | :------- | :----------- |
| C01 HeadlessAssistant | Integrator API (C02/C03 in demo) | HTTPS POST / SSE | Async |
| C01 HeadlessAssistant | Browser localStorage | Browser API | Sync |
| C02/C03 Agent Server | SAP AI Core | HTTPS (OAuth2 + chat completions) | Async |
| C02/C03 Agent Server | MCP Server subprocess | stdio JSON-RPC | Async |
| MCP Server | Tool handlers | in-process function call | Sync (mock) |

### 1.3 Key Architectural Decisions

**Decision 1 — Single monolithic client component**
- **Context:** The system is a self-contained browser widget with no server side.
- **Choice:** One component (`C01-HeadlessAssistant`) owns all capabilities.
- **Alternatives rejected:** Multi-component decomposition adds inter-component wiring with no runtime benefit in a single-file bundle.
- **Consequences:** All logic lives in one file; requires disciplined internal module organization (12-section internal structure).

**Decision 2 — Zero external runtime dependencies**
- **Context:** Must work as a plain `<script>` tag on any page without a bundler or package manager.
- **Choice:** All markdown parsing, DOM rendering, SSE handling, and UUID generation implemented natively in ES2020+ vanilla JS.
- **Alternatives rejected:** marked.js, DOMPurify, and similar libraries require the integrator to manage additional files or a CDN.
- **Consequences:** Custom markdown parser built and maintained; limited to headings, paragraphs, tables, lists, links per REQ-0009.

**Decision 3 — localStorage for persistence**
- **Context:** History and user identity must survive page navigation across the domain.
- **Choice:** `localStorage` with fixed key prefix `ha_` (`ha_history`, `ha_user_id`).
- **Alternatives rejected:** `sessionStorage` clears on tab close; cookies add complexity and server visibility.
- **Consequences:** History is device-bound and visible to any JS on the page; integrator accepts this risk.

**Decision 4 — User-initiated retry only, no automatic retries**
- **Context:** API errors and stream interruptions must be communicated clearly without polluting chat history.
- **Choice:** Fail fast on all errors; surface toast/banner with retry button; no automatic retries.
- **Alternatives rejected:** Automatic retry risks duplicate messages and user confusion.
- **Consequences:** User must explicitly retry; integrator's API must be idempotent if the user retries.

**Decision 5 — MCP plugin tool registry for demo servers**
- **Context:** The original demo server embedded tool definitions and implementations across two files, creating friction when adding tools.
- **Choice:** Each tool lives in `tools/<name>/` (schema.json + handler); a central `tool-registry.json` declares all tools; `mcp-server.js` / `mcp_server.py` dispatches via stdio transport.
- **Alternatives rejected:** Inline tool arrays in agent.js violated open/closed principle.
- **Consequences:** Adding a tool requires only three files + one registry entry; core server files untouched.

---

## 2. Functional Components

### [C01] HeadlessAssistant

| Field | Detail |
| :---- | :----- |
| **Purpose** | Complete embeddable chat widget — config loading, widget rendering, API communication, SSE/JSON response handling, markdown rendering, XSS sanitization, conversation history, user identity, theming, error handling |
| **Ownership boundary** | Owns all DOM elements within `#ha-widget-root` and all `localStorage` keys prefixed `ha_`; must not modify the host page outside its container |
| **Dependencies** | None — zero external runtime dependencies |
| **Key data elements** | Conversation history (`Array<{role, content}>`), anonymous user UUID (`ha_user_id`), runtime config object |
| **Services exposed** | `HeadlessAssistant.init(config)`, `HeadlessAssistant.destroy()`, `HeadlessAssistant.clearHistory()` |
| **Events consumed** | User input submit, clear history, close/minimize, retry, bubble click |
| **Events produced** | None (no external event bus) |
| **External services consumed** | Integrator-supplied API endpoint (HTTPS POST / SSE) |
| **Background process** | N |
| **AI capabilities** | N — routes messages to integrator's AI API; performs no AI processing |
| **Critical NFRs** | Bundle < 50KB unminified; Chrome, Firefox, Safari, Edge (last 2); XSS-safe markdown rendering |
| **Component spec path** | `./SPECS/components/c01-headless-assistant/` |

### [C02] Agent Server (Node.js)

| Field | Detail |
| :---- | :----- |
| **Purpose** | Reference demo backend — Express HTTP server that bridges C01 to SAP AI Core with MCP-based plugin tool dispatch |
| **Ownership boundary** | `_DEMO/agent-server/` — demo only, not production |
| **Dependencies** | Express, @modelcontextprotocol/sdk, zod, zod-from-json-schema, dotenv |
| **Key data elements** | Conversation messages, OAuth2 token cache, tool registry |
| **Services exposed** | `GET /headless-assistant.js`, `POST /ask-assistant` (SSE) |
| **Events consumed** | HTTP POST from browser |
| **Events produced** | SSE stream of `{status}`, `{message}`, `[DONE]` events |
| **External services consumed** | SAP AI Core (OAuth2 + chat completions), MCP server subprocess (stdio) |
| **Background process** | Y — MCP server child process |
| **AI capabilities** | Y — two-turn agentic loop (tool_calls → tool results → streaming turn 2) |
| **Critical NFRs** | CORS all origins (demo only); SSE keep-alive |
| **Component spec path** | `./SPECS/components/c02-agent-server/` |

### [C03] Agent Server (Python)

| Field | Detail |
| :---- | :----- |
| **Purpose** | Drop-in Python port of C02 — FastAPI + Python MCP SDK, identical API surface to C02 |
| **Ownership boundary** | `_DEMO/agent-server-py/` — demo only, not production |
| **Dependencies** | fastapi, uvicorn, sse-starlette, mcp, httpx, python-dotenv |
| **Key data elements** | Same as C02; reads shared tool schemas from `_DEMO/agent-server/tools/` |
| **Services exposed** | `GET /headless-assistant.js`, `POST /ask-assistant` (SSE) |
| **Events consumed** | HTTP POST from browser |
| **Events produced** | SSE stream of `{status}`, `{message}`, `[DONE]` events |
| **External services consumed** | SAP AI Core (OAuth2 + chat completions), MCP server subprocess (Python stdio) |
| **Background process** | Y — mcp_server.py child process |
| **AI capabilities** | Y — identical two-turn agentic loop to C02 |
| **Critical NFRs** | Drop-in compatible with C02; same .env schema |
| **Component spec path** | `./SPECS/components/c03-agent-server-py/` |

> 🔽 **Deferred to Detailed Design:** Feature inventory, internal data flows, full API signatures, and per-feature NFR thresholds — resolved per component in `A_Core_Spec.md` and `B_Specification.md`.
