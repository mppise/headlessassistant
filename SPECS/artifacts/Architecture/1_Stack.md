---
name: b-architecture-stack
description: Technical stack, AI technologies, and deployment topology for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Technical Stack & AI Technologies

---

## 1. Technical Stack

> All C01 layers are contained within the single bundle file. C02/C03 are demo-only servers.

| Layer | Technology | Rationale | Source Path |
| :---- | :--------- | :-------- | :---------- |
| **C01 Language** | Vanilla JavaScript (ES2020+) | Zero-dependency constraint; modern browser support | `./src/headless-assistant.js` |
| **C01 Styling** | CSS injected at runtime via `<style>` tag | No external stylesheet required | `./src/headless-assistant.js` |
| **C01 Markup** | HTML templates as JS strings, injected into DOM | Self-contained bundle | `./src/headless-assistant.js` |
| **C01 Configuration** | JSON file (`headless-assistant.config.json`) or `init()` object | Human-readable; natively parsed by JS | `./config/` (integrator-supplied) |
| **C01 Persistence** | Browser `localStorage` API | Built-in, domain-scoped, survives navigation | Browser native |
| **C01 Streaming** | `fetch` + `ReadableStream` | Native SSE via fetch; avoids EventSource limitations | Browser native |
| **C01 UUID** | `crypto.randomUUID()` | Built-in ES2020+ API; no library needed | Browser native |
| **C02 Runtime** | Node.js (ESM) | JavaScript-native demo server | `_DEMO/agent-server/` |
| **C02 HTTP** | Express 5 | Lightweight HTTP server + router | `_DEMO/agent-server/` |
| **C02 MCP** | @modelcontextprotocol/sdk 1.29+ | MCP client + server via stdio transport | `_DEMO/agent-server/lib/` |
| **C02 Schema** | zod + zod-from-json-schema | Convert tool JSON schemas to Zod for MCP server | `_DEMO/agent-server/lib/` |
| **C03 Runtime** | Python 3.12+ | Python-native demo server | `_DEMO/agent-server-py/` |
| **C03 HTTP** | FastAPI + uvicorn | Async HTTP server + ASGI | `_DEMO/agent-server-py/` |
| **C03 MCP** | mcp (Python SDK) 1.0+ | Python MCP client + server via stdio | `_DEMO/agent-server-py/lib/` |
| **C03 HTTP client** | httpx | Async HTTP for SAP AI Core OAuth2 + completions | `_DEMO/agent-server-py/lib/` |
| **Demo** | Static HTML + portal.js | Reference integration for integrators | `_DEMO/payment-portal/` |

> 🔽 **Deferred to Detailed Design:** Version pinning rationale, per-component library additions.

---

## 2. AI Technologies

> **Audience:** Engineers · AI/ML

| Concern | Choice | Notes |
| :------ | :----- | :---- |
| **LLM** | SAP AI Core (OpenAI-compatible API, default model `gpt-4o`) | Configured via `.env` in demo servers |
| **Text-embedding model** | N/A | Not used |
| **Vector database** | N/A | Not used |
| **Prompt storage** | Plain text file `_DEMO/prompts/system-prompt.txt` | Shared by both C02 and C03; read at startup |
| **MCP servers deployed** | Y — one stdio MCP server per demo server (mcp-server.js / mcp_server.py) | Dispatches to tool handlers |
| **MCP servers consumed** | Y — MCP client in each demo server connects to its own MCP server | |
| **Tool count** | 5 tools: `get_customer_details`, `get_customer_summary`, `get_open_items`, `get_paid_bills`, `get_payer_info` | All return mock data |

> 🔽 **Deferred to Detailed Design:** Prompt design, model parameters, streaming behavior, AI failure fallbacks.

---

## 3. Deployment Topology

> **Audience:** DevOps · SRE

### 3.1 Environment Matrix

| Environment | Purpose | Notes |
| :---------- | :------ | :---- |
| Local development | Build and test C01 bundle; run demo servers | Served via static file server; validated using `_DEMO/` |
| Integrator production | Portal embeds C01 bundle | Integrator's responsibility — no deployment tooling provided |

### 3.2 Component Deployment Map

| Component | Platform | Region | Scaling model |
| :-------- | :------- | :----- | :------------ |
| C01 HeadlessAssistant | Static file on any CDN / web server | Integrator choice | N/A — static file |
| C02 Agent Server | Local Node.js process | Developer machine | Single process (demo) |
| C03 Agent Server | Local Python process | Developer machine | Single process (demo) |

### 3.3 Containerization Standard

Not defined — C01 is a static file; demo servers are not containerized. Docker is identified in the stack template as future infrastructure but not implemented.

### 3.4 Deploy Mechanism

| Concern | Detail |
| :------ | :----- |
| Trigger | Manual file copy (C01) or `node server.js` / `python server.py` (demo) |
| Deploy tool | None — static distribution |
| Rollback strategy | Revert to previous bundle file |

> 🔽 **Deferred to Detailed Design:** Health check implementation, runtime env var names, secrets injection specifics.
