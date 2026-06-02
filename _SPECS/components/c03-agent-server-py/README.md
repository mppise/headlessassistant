# C03-AgentServerPy — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first; note this component is demo infrastructure outside core product scope per D-ARCH-HA000003)
2. `A_Core_Spec.md` — what to build and why, feature inventory, file structure, data flows
3. `B_Interfaces.md` — exact HTTP, SSE, MCP, and AI Core contracts to implement
4. `C_Operational_Specs.md` — error handling, infrastructure, environment variables, AI behavior

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.
- The Node.js implementation in `_DEMO/agent-server/` is the **behavioral reference**. If a spec detail is ambiguous, match what the Node.js server does.

## Key Implementation Notes
- The Python server reads `headless-assistant.js`, `system-prompt.txt`, `tool-registry.json`, and all `schema.json` files from the **Node.js server tree** (`../agent-server/...`) — do not copy or duplicate these files.
- Tool mock data is re-implemented in Python handlers (`handler.py`) — identical data, Python syntax.
- The MCP server (`mcp_server.py`) is spawned as a subprocess by `mcp_client.py` at startup, not imported.
- All async I/O uses `asyncio` + `httpx.AsyncClient`; FastAPI routes are `async def`.
- The `.env` file is **not committed** — it is the same credentials file shared with the Node.js server.

## Spec Version
Last updated: 2026-05-27 | Status: Ready
