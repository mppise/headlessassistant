---
name: decisions
description: Living register of actionable, deferred, and actioned decisions for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Decisions & Assumptions

Latest gate: Reverse Engineering · 2026-06-01

## Actionable (Blocking Progression)

Items that **MUST** be resolved before next phase gate. If any rows exist, gate is **BLOCKED**.

| ID | Category | Item | Owner | Target resolve | Notes |
|----|----------|------|-------|-----------------|-------|

## Parking Lot (Deferred, Does NOT Block Gate)

| ID | Category | Item | Reason for deferral | Mitigation | Owner | Target resolve |
|----|----------|------|-------|-----------|-------|-----------------|
| D-P-001 | Testing | No automated test suite for C01 | MVP scope decision from original architecture | Manual validation via `_DEMO/` | — | Future release |
| D-P-002 | Security | Bearer token is client-side visible in config file | Accepted risk; integrator responsibility | Documented in demo config + architecture | — | Integrator concern |
| D-P-003 | Scalability | C02/C03 demo servers not designed for production scale | Demo only; single process | Documented in architecture | — | Not applicable (demo) |
| D-P-004 | Data | No localStorage migration/versioning strategy | Not needed for current version | Acceptable for MVP | — | Future release |

## Actioned (Resolved, Ready to Reference)

| ID | Category | Item | Resolved at | Resolution | Rationale |
|----|----------|------|---------|------------|-----------|
| D-A-001 | Architecture | Single monolithic component vs multi-component decomposition | Design · 2026-05-15 | Single component (C01) — all capabilities in one file | No inter-component wiring benefit in a single-file browser bundle |
| D-A-002 | Architecture | Zero external runtime dependencies | Design · 2026-05-15 | Vanilla JS only; custom markdown parser | No bundler requirement for integrator; works as plain `<script>` tag |
| D-A-003 | Data | localStorage vs sessionStorage vs cookies for persistence | Design · 2026-05-15 | `localStorage` with `ha_` prefix | sessionStorage clears on tab close; cookies add server visibility |
| D-A-004 | Resilience | Automatic retry vs user-initiated retry on API errors | Design · 2026-05-15 | User-initiated only (toast with Retry button) | Automatic retry risks duplicate messages; integrator API must be idempotent |
| D-A-005 | Architecture | Plugin tool registry — CHG-001 (inline tools vs directory-per-tool) | Detailed Design · 2026-05-16 | Directory-per-tool with central `tool-registry.json` | Open/closed principle; adding a tool requires no changes to core server files |
| D-A-006 | Architecture | MCP stdio transport — CHG-002 (direct tool import vs MCP protocol) | Detailed Design · 2026-05-16 | MCP client/server via stdio | Protocol isolation; tool dispatch works identically from Node.js and Python |
| D-A-007 | Architecture | Python server shares tool schemas from Node.js tree (no duplication) | Development · 2026-05-XX | Python server reads `../agent-server/tools/` via relative path | Single source of truth for tool schemas; no sync burden |
| D-A-008 | API | Field name `user` → `customer_id` in POST body | Development · 2026-05-XX | Field is `customer_id` in current code | More descriptive for the domain |

## Archive

Historical decisions from prior releases: see [_Decisions.md](./_Decisions.md)
