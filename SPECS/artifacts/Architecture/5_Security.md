---
name: b-architecture-security
description: Security model, authentication, XSS protection, and compliance for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Security Model & Compliance

---

## 1. Security Model

> **Audience:** Security · Backend
> 🔒 Every section must be explicitly addressed. If a concern does not apply, state why.

### 1.1 Authentication

| Concern | Detail |
| :------ | :----- |
| Mechanism | Bearer token in `Authorization` header on every API request from C01 |
| Provider | Integrator-supplied — the widget does not issue or validate tokens |
| Token exposure | Token is client-side visible (in config JSON or `init()` call). Integrator must use short-lived, scoped tokens. Documented clearly in demo config. |
| Token expiry & refresh | Not managed by C01 — integrator responsibility |
| Revocation mechanism | Integrator responsibility |
| Intentionally public surfaces | Widget UI is fully public — no auth required to view the chat interface |

### 1.2 Authorization

Not applicable — C01 has no authorization model. All access control is enforced by the integrator's API.

C02/C03: Authorization not implemented — demo servers accept all requests. CORS `*` is intentional for local demo use.

### 1.3 XSS Protection

All markdown rendered to HTML by C01 passes through a two-stage pipeline before DOM insertion:

**Stage 1 — Markdown rendering:** Convert markdown string to HTML using regex-based renderer. `sanitizeHref()` is applied to all link URLs: rejects `javascript:` and `data:` URI schemes.

**Stage 2 — DOM-based allowlist sanitizer:** Parse HTML via `DOMParser`; walk all nodes; strip any element not in the allowlist; strip any attribute not in the per-tag allowlist; enforce `target="_blank" rel="noopener noreferrer"` on all `<a>` tags.

| Allowlist | Detail |
| :-------- | :----- |
| Allowed elements | `p, h1–h6, ul, ol, li, table, thead, tbody, tr, th, td, a, strong, em, br` |
| Allowed attributes | `a: [href]`, `th/td: [colspan, rowspan]`; all others stripped |
| Blocked URI schemes | `javascript:`, `data:` |
| Script injection | `<script>` stripped (not in allowlist — replaced with text content) |
| Event handlers | Stripped (no event attributes in allowlist) |

### 1.4 Encryption Standards

| Concern | Standard |
| :------ | :------- |
| In transit | HTTPS required for `ai_endpoint` in production; HTTP accepted in local dev |
| At rest | localStorage is browser-managed; no additional encryption applied |

### 1.5 Secrets Management

| Concern | Detail |
| :------ | :----- |
| Bearer token in config | Integrator responsibility — must use scoped, short-lived tokens |
| No secrets in bundle source | Confirmed — bundle ships with no hardcoded tokens or keys |
| C02/C03 secrets | Stored in `.env` file (not committed); loaded via dotenv |

> 🔽 **Deferred to Detailed Design:** Input length limits, full threat surface assessment — resolved per component in `B_Specification.md`.

---

## 2. Compliance & Privacy

> **Audience:** Legal · Compliance
> ⚖️ Identify binding obligations here.

### 2.1 Applicable Regulations

No regulations directly bind the C01 bundle. HeadlessAssistant:
- Has no server, database, or telemetry
- Stores only an anonymous UUID and conversation text in the end user's own `localStorage`
- Does not transmit data to any party other than the integrator's configured API endpoint

The integrator's backend is solely responsible for GDPR, CCPA, and any other data protection obligations on data received from the widget.

### 2.2 Client-Side Erasure

The **Clear History** feature provides end users a mechanism to erase all client-side conversation data (`ha_history` and `ha_user_id` from `localStorage`). The widget makes no guarantees about data already transmitted to the integrator's API.

### 2.3 Cross-Border Transfer Rules

Not applicable — the widget does not control where data is sent or stored.

> 🔽 **Deferred to Detailed Design:** PII inventory, consent implementation, data subject rights — resolved per component in `B_Specification.md`.
