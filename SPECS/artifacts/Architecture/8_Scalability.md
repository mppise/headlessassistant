---
name: b-architecture-scalability
description: Scalability strategy and load profile for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Scalability

> **Audience:** Backend · SRE · Architecture
> C01 is a static file — no server scalability concerns. C02/C03 are demo-only single processes.

---

## 1. Load Profile

| Metric | C01 (browser bundle) | C02/C03 (demo server) |
| :----- | :------------------- | :-------------------- |
| RPS / throughput | N/A — static file serving | 1 concurrent user (demo) |
| Concurrent users | Limited by integrator CDN | Not designed for scale |
| Data volume | localStorage ≤ 2MB per domain | In-memory only, per-process |

---

## 2. Scaling Model

**C01:** Not applicable — static file. Integrator CDN scales delivery.

**C02/C03 demo servers:** Single-process; not designed for horizontal scaling. Both are reference implementations only.

**Stateful components:** C01 state is entirely browser-local (localStorage + JS heap). C02/C03 carry in-memory OAuth2 token cache and MCP client connection — not compatible with horizontal scaling without shared state.

---

## 3. Known Bottlenecks

| Bottleneck | Component | Mitigation |
| :--------- | :-------- | :--------- |
| localStorage 2MB quota | C01 | Automatic 20% prune on overflow |
| 4000-char message limit | C01 | Enforced via textarea `maxlength` attribute |
| Single MCP server subprocess | C02/C03 | Acceptable for demo; production would need connection pooling |
| OAuth2 token cache is process-local | C02/C03 | Acceptable for demo; production would need shared cache |

> 🔽 **Deferred to Detailed Design:** Per-component bottleneck analysis, production scaling strategies — not applicable to current demo scope.
