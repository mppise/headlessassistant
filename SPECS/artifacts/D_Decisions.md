---
name: decisions
description: Living register of all decisions made during specification. Review and mark each as approved [X], rejected [-], deferred [>], or pending [ ].
license: Apache-2.0 (see LICENSE in project root)
---

# Decisions

> A decision left unreviewed blocks dependent work or, worse, lets it proceed on a rejected choice.
> This register must be reviewed and all blocking decisions resolved before dependent implementation begins.
>
> **Status codes:** `[ ]` Pending · `[X]` Approved · `[-]` Rejected · `[>]` Deferred
>
> **Decision types:** `ARCH` Architecture · `TECH` Technology / Library · `PRODUCT` Product / UX · `DATA` Data & Storage · `SEC` Security · `OPS` Operations · `COMPLIANCE` Compliance & Legal

---

## Summary

| Total | Pending `[ ]` | Approved `[X]` | Rejected `[-]` | Deferred `[>]` |
| :---: | :-----------: | :------------: | :------------: | :------------: |
| 10 | 0 | 10 | 0 | 0 |

---

## Architecture

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-ARCH-HA000001 | Single monolithic component (`C01-HeadlessAssistant`) owns all capabilities | No inter-component wiring needed for a single-file client bundle | Multi-component decomposition (C01-Widget + C02-APIClient + C03-HistoryManager) | All logic in one file; requires disciplined internal module organization | DevAgent | Confirmed in Planning |
| `[X]` | D-ARCH-HA000002 | Fail fast on all errors; user-initiated retry only; no automatic retries | Automatic retry risks duplicate messages sent to API and confuses users | Auto-retry with exponential backoff | User must explicitly retry; integrator API should be idempotent | DevAgent | Confirmed in Planning |

## Technology & Libraries

> 📦 Approved entries here constitute the permitted library list for development.
> No library may be used in code unless it appears in this section with status `[X]`.

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-TECH-HA000001 | Vanilla JavaScript ES2020+ — no runtime dependencies | Drop-in script tag constraint; no bundler required on integrator side | React, Vue, marked.js, DOMPurify | Custom markdown parser must be built and maintained | DevAgent | Confirmed in Planning |
| `[X]` | D-TECH-HA000002 | `crypto.randomUUID()` for anonymous user UUID generation | Built-in ES2020+ API; no library needed | uuid npm package | Requires modern browser (already a stated constraint) | DevAgent | Confirmed in Planning |
| `[X]` | D-TECH-HA000003 | Browser `EventSource` API + `fetch` with `ReadableStream` for SSE streaming | Native browser APIs; zero dependencies | Custom XHR streaming, third-party SSE libraries | Must handle both standard SSE and custom chunked formats | DevAgent | Confirmed in Planning |
| `[X]` | D-TECH-HA000004 | No automated testing for MVP; manual validation via `demo/index.html` | Simplicity; no build toolchain required | Jest, Vitest | Regression risk is higher; manual discipline required | DevAgent | Confirmed in Planning — DevAgent changed mind from Option B (unit tests) |
| `[X]` | D-TECH-HA000005 | ESLint + Prettier as dev-time linting/formatting tools | Industry standard; enforces consistency without runtime cost | No tooling | Dev dependencies only; not bundled into the distributable | DevAgent | Confirmed in Planning |

## Product & UX

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-PRODUCT-HA000001 | Floating bubble (default) + inline embed (when container specified) — both modes in one bundle | Maximum integrator flexibility per REQ-0014 / REQ-0015 | Floating only; inline only | Rendering logic must handle both mount strategies | DevAgent | Confirmed in Planning |
| `[X]` | D-PRODUCT-HA000002 | Clear History button (trash icon) visible in widget header | Provides end-user erasure mechanism; also serves as GDPR client-side right-to-erasure | Config/programmatic API only | Must be present in all widget modes | DevAgent | Confirmed in Planning |

## Data & Storage

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-DATA-HA000001 | `localStorage` with `ha_` key prefix for history (`ha_history`) and user UUID (`ha_user_id`) | Survives page navigation; domain-scoped; no server needed | `sessionStorage` (clears on tab close); cookies (server visibility) | History is device-bound; visible to host page JS | DevAgent | Confirmed in Planning |
| `[X]` | D-DATA-HA000002 | Full conversation history stored in `localStorage`; trimmed to `max_turns` at read/send time only | Preserves full history locally; allows future config changes to expose more history without data loss | Trim at write time | localStorage usage grows unbounded if user never clears history | DevAgent | Confirmed in Planning |

## Security

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-SEC-HA000001 | XSS sanitization built into markdown renderer: strip `<script>`, event handlers, `javascript:` URIs; links use `target="_blank" rel="noopener noreferrer"` | API response content is untrusted; must not allow script injection into host page | Relying on DOMPurify (would add a dependency) | Custom sanitization logic required; must be thorough | DevAgent | Confirmed in Planning |

## Operations & Deployment

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

## Compliance & Legal

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

---

## Rejected Decisions Log

| ID | Decision | Rejected by | Date | Reason | Superseded by |
| :- | :------- | :---------- | :--: | :----- | :------------ |

---

## Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial decisions seeded from Planning interview | 2026-05-15 | SpecGantry |
