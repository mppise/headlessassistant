---
name: architecture
description: Technical architecture specification for this project.
license: Apache-2.0 (see LICENSE in project root)
---

# ARCHITECTURE

> A zero-dependency, single-file vanilla JS/CSS/HTML client-side bundle that embeds a fully conversational AI chat widget into any web portal via a single script tag.

---

## Table of Contents

| # | Section | Primary Audience |
| :-: | :------ | :--------------- |
| 1 | [System Blueprint](#1-system-blueprint) | All |
| 2 | [Functional Components](#2-functional-components) | All |
| 3 | [Technical Stack](#3-technical-stack) | Engineers |
| 4 | [User Experience](#4-user-experience) | Frontend · Design · Product |
| 5 | [Data Architecture](#5-data-architecture) | Engineers |
| 6 | [API Design](#6-api-design) | Engineers · Integrators |
| 7 | [Error Handling Pattern](#7-error-handling-pattern) | Engineers |
| 8 | [Security Model](#8-security-model) | Engineers · Security |
| 9 | [Compliance & Privacy](#9-compliance--privacy) | Legal · Compliance |
| 10 | [Deployment Topology](#10-deployment-topology) | Engineers · Integrators |
| 11 | [Development Standards](#11-development-standards) | Engineers |
| 12 | [Change History](#12-change-history) | All |

---

> ### How to read this document
> This document captures **cross-cutting architectural decisions** — constraints that every component must respect.
> Sections marked 🔽 **Deferred to Detailed Design** are intentionally left open here.
> The single component specification is responsible for resolving deferred items within the boundaries set here.

---

## 1. System Blueprint

> **Audience:** Everyone. Start here.

### 1.1 High-Level Data Flow

```
Integrator Page
  └── <script src="headless-assistant.js" data-config="config.json">
        │
        ▼
  [C01 - HeadlessAssistant]
        │
        ├── Load config (JSON file or init() options)
        ├── Restore history from localStorage (ha_history)
        ├── Inject CSS + render widget DOM into host page
        │
        ▼
  User types message
        │
        ├── Trim history to last max_turns
        ├── POST { user, message, history } → Integrator API Endpoint
        │     Authorization: Bearer {token}
        │
        ▼
  API Response
        ├── SSE stream → accumulate chunks → re-render markdown on each chunk
        └── Full JSON  → read response_field → render markdown once
        │
        ▼
  Rendered HTML in chat panel (XSS-sanitized)
        │
        └── Append turn to ha_history in localStorage
```

### 1.2 Component Interaction Map

HeadlessAssistant is a single-component system. There are no inter-component interactions. All capabilities are self-contained within the one bundle.

| From | To | Protocol | Sync / Async |
| :--- | :- | :------- | :----------- |
| C01 HeadlessAssistant | Integrator API | HTTPS POST / SSE | Async |
| C01 HeadlessAssistant | localStorage | Browser API | Sync |

### 1.3 Key Architectural Decisions

**Decision 1 — Single monolithic component**
- **Context:** The system is a self-contained browser widget with no server side.
- **Choice:** One component (`C01-HeadlessAssistant`) owns all capabilities — config, API communication, history, rendering, and UI.
- **Alternatives rejected:** Multi-component decomposition adds inter-component wiring with no runtime benefit in a single-file bundle.
- **Consequences:** All logic lives in one file; requires disciplined internal module organization.

**Decision 2 — Zero external runtime dependencies**
- **Context:** Must work as a plain `<script>` tag on any page without a bundler or package manager.
- **Choice:** All markdown parsing, DOM rendering, SSE handling, and UUID generation implemented natively in ES2020+ vanilla JS.
- **Alternatives rejected:** marked.js, DOMPurify, and similar libraries would require the integrator to manage additional files or a CDN.
- **Consequences:** Custom markdown parser must be built and maintained; limited to headings, paragraphs, tables, lists, and links per REQ-0009.

**Decision 3 — localStorage for persistence**
- **Context:** History and user identity must survive page navigation across the domain.
- **Choice:** `localStorage` with fixed key prefix `ha_` (`ha_history`, `ha_user_id`).
- **Alternatives rejected:** `sessionStorage` clears on tab close; cookies add complexity and server visibility.
- **Consequences:** History is device-bound and visible to any JS on the page; integrator assumes this is acceptable per A-UB-HA000002.

**Decision 4 — User-initiated retry only**
- **Context:** API errors and stream interruptions must be communicated clearly without polluting chat history.
- **Choice:** Fail fast on all errors; surface toast/banner with retry button; no automatic retries.
- **Alternatives rejected:** Automatic retry on transient errors risks duplicate messages being sent to the API and confuses the user.
- **Consequences:** User must explicitly retry; integrator's API must be idempotent if the user retries.

---

## 2. Functional Components

### [C01] HeadlessAssistant

| Field | Detail |
| :---- | :----- |
| **Purpose** | Complete embeddable chat widget — config loading, widget rendering, API communication, SSE/JSON response handling, markdown rendering, conversation history management, error handling |
| **Ownership boundary** | Owns all client-side state and DOM within the widget container; must not modify the host page outside its own container |
| **Dependencies** | None — zero external runtime dependencies |
| **Key data elements** | Conversation history (array of `{role, content}` turns), anonymous user UUID, runtime config |
| **Services exposed** | `HeadlessAssistant.init(config)` — public JS API for manual initialization |
| **Events consumed** | User input submit, clear history, close/minimize widget, retry |
| **Events produced** | None (no external event bus) |
| **External services consumed** | Integrator-supplied API endpoint (HTTPS POST / SSE) |
| **Background process** | N |
| **AI capabilities** | N — routes messages to integrator's AI API; performs no AI processing itself |
| **Critical NFRs** | Bundle size < 50KB minified; works in Chrome, Firefox, Safari, Edge (last 2 versions); XSS-safe markdown rendering |
| **Component spec path** | `./SPECS/components/c01-headless-assistant/` |

> 🔽 **Deferred to Detailed Design:** Feature inventory, internal module structure, full interface signatures, per-feature behavior, config schema, theme option list, SSE field mapping spec, and XSS sanitization rules — resolved in `./SPECS/components/c01-headless-assistant/`.

---

## 3. Technical Stack

> All layers are contained within the single bundle file. No per-component deviations exist.

| Layer | Technology | Rationale | Source Path |
| :---- | :--------- | :-------- | :---------- |
| **Language** | Vanilla JavaScript (ES2020+) | Zero-dependency constraint; modern browser support confirmed | `./src/headless-assistant.js` |
| **Styling** | CSS injected at runtime via `<style>` tag | No external stylesheet required from integrator | `./src/headless-assistant.js` |
| **Markup** | HTML templates as JS strings, injected into DOM | Self-contained bundle; no separate HTML file | `./src/headless-assistant.js` |
| **Configuration** | JSON (`headless-assistant.config.json`) | Human-readable, easy to author, natively parsed by JS | `./config/headless-assistant.config.json` |
| **Persistence** | Browser `localStorage` API | Built-in, domain-scoped, survives navigation | Browser native |
| **Streaming** | Browser `EventSource` API (SSE) + `fetch` with `ReadableStream` | Native SSE support; fetch for full JSON responses | Browser native |
| **UUID generation** | `crypto.randomUUID()` | Built-in ES2020+ API; no library needed | Browser native |
| **Demo** | Static HTML | Reference integration for integrators | `./demo/index.html` |

> 🔽 **Deferred to Detailed Design:** Internal module organization within the single JS file.

---

## 4. User Experience

> **Audience:** Frontend · Design · Product

### 4.1 Interface Surfaces

- [x] Conversational / chat interface (primary)
- [x] Floating widget (bubble + panel — default mode)
- [x] Inline embed (mounts in integrator-designated container)

### 4.2 Key User Flows

| Flow | Entry point | Success exit | Owner component |
| :--- | :---------- | :----------- | :-------------- |
| Send Message | User types in input and submits | Response rendered in chat panel; turn appended to history | C01 |
| Session Resume | Page load with widget | Previous conversation restored from localStorage and displayed | C01 |
| Clear History | User clicks trash icon in header | localStorage history cleared; chat panel resets to empty | C01 |
| Close / Minimize | User clicks close button | Floating bubble: panel collapses to bubble. Inline embed: widget fully hidden (`display:none`) | C01 |
| Error & Retry | API error or stream interruption | Toast/banner shown with retry button; history not modified | C01 |

### 4.3 Mandatory Lenses

| Lens | Applicable? | Rationale / constraint |
| :--- | :---------- | :--------------------- |
| Mobile-first | N | Primary integration target is desktop portals; mobile is not in scope for MVP |
| Cloud-first | N | Client-side bundle; no server components |
| AI-first | N | Widget is AI-agnostic; routes to integrator's AI API |

> 🔽 **Deferred to Detailed Design:** Full widget DOM structure, CSS design tokens, theme config option list, responsive behavior, and per-flow step-by-step UX — resolved in `./SPECS/components/c01-headless-assistant/`.

---

## 5. Data Architecture

> **Audience:** Engineers

### 5.1 Core Entities

| Entity | Description | Owner |
| :----- | :---------- | :---- |
| `ConversationTurn` | `{ role: 'user' | 'assistant', content: string }` | C01 |
| `UserIdentity` | Anonymous UUID string, generated once per browser | C01 |
| `WidgetConfig` | Runtime config object loaded from JSON file or `init()` options | C01 |

### 5.2 Storage Strategy

| Store type | Technology | Used for | Key(s) |
| :--------- | :--------- | :------- | :----- |
| Client persistence | `localStorage` | Conversation history, user UUID | `ha_history`, `ha_user_id` |
| Runtime memory | JS in-memory object | Active config, current session state | — |

### 5.3 Data Ownership Rules

- C01 exclusively owns `ha_history` and `ha_user_id` in `localStorage`.
- Full conversation history is stored (not trimmed at write time). Trimming to `max_turns` occurs at read/send time only.
- History is domain-wide — shared across all pages of the portal that embed the widget.
- No data is sent to any server other than the integrator's configured API endpoint.

> 🔽 **Deferred to Detailed Design:** Full config schema, history serialization format, localStorage migration/versioning strategy.

---

## 6. API Design

> **Audience:** Engineers · Integrators

### 6.1 API Pattern

| Boundary | Pattern | Rationale |
| :------- | :------ | :-------- |
| Widget → Integrator API | HTTPS POST (JSON body) | Simple, universally supported |
| Widget → Integrator API (streaming) | SSE (`text/event-stream`) via `EventSource` or `fetch` + `ReadableStream` | Standard browser streaming protocol |

### 6.2 Outbound Request Contract

```
POST {config.api_endpoint}
Authorization: Bearer {config.bearer_token}
Content-Type: application/json

{
  "user": "{user_id}",
  "message": "{current user message}",
  "history": [ ...last max_turns ConversationTurns... ]
}
```

### 6.3 Inbound Response Contract

**Full JSON mode:**
- Response body is a JSON object.
- The markdown content is read from the field specified by `config.response_field` (default: `message`).
- Supports dot-notation path (e.g., `data.message`).

**SSE streaming mode:**
- Content-Type: `text/event-stream`
- Each SSE event contains a JSON payload; the markdown chunk is read from `config.response_field` (default: `message`).
- Each chunk triggers a full markdown re-render of the accumulated response.
- Stream end: detected via SSE `[DONE]` event or connection close.

### 6.4 Versioning Strategy
Not applicable — the widget consumes the integrator's API; versioning is the integrator's responsibility.

> 🔽 **Deferred to Detailed Design:** Full SSE field mapping config spec, error response parsing, timeout handling values.

---

## 7. Error Handling Pattern

> **Audience:** Engineers

### 7.1 Chosen Pattern

Fail fast with user-initiated recovery. No automatic retries. All errors surface as a toast/banner notification with a retry button. Errors never contaminate the conversation history.

### 7.2 Error Classification

| Class | Definition | Retry allowed? | User-visible? | History contaminated? |
| :---- | :--------- | :------------- | :------------ | :-------------------- |
| API Error | 4xx / 5xx HTTP response | User-initiated only | Y — toast/banner | N |
| Network / Timeout | No response / connection failure | User-initiated only | Y — toast/banner | N |
| Stream Interruption | SSE connection dropped mid-response | User-initiated only | Y — error indicator appended to partial response | N |
| Config Error | Missing required config fields | N | Y — inline error on load | N |

### 7.3 User-Facing Error Tone
Friendly, non-technical, actionable. Example: *"Something went wrong. Please try again."* Internal error codes are never shown to the end user.

> 🔽 **Deferred to Detailed Design:** Exact error message strings, toast display duration, stream interruption indicator design.

---

## 8. Security Model

> **Audience:** Engineers · Security

### 8.1 Authentication

| Concern | Detail |
| :------ | :----- |
| Mechanism | Bearer token in `Authorization` header on every API request |
| Provider | Integrator-supplied — the widget does not issue or validate tokens |
| Token exposure | Token is client-side visible (in config file or `init()` call); integrator is responsible for using short-lived, scoped tokens. Documented clearly in the demo. |
| Intentionally public surfaces | Widget UI is fully public — no auth required to view the chat interface |

### 8.2 Authorization
Not applicable — the widget has no authorization model. All access control is enforced by the integrator's API.

### 8.3 XSS Protection

All markdown rendered to HTML by the widget must be sanitized before DOM insertion:
- Strip all `<script>` tags and their content
- Strip all event handler attributes (`onclick`, `onerror`, `onload`, etc.)
- Strip `javascript:` URI schemes from `href` and `src` attributes
- Links rendered with `target="_blank"` and `rel="noopener noreferrer"`

### 8.4 Secrets Management

| Concern | Detail |
| :------ | :----- |
| Bearer token in config | Integrator responsibility — must use scoped, short-lived tokens |
| No secrets in source | Confirmed — the bundle ships with no hardcoded tokens or keys |

> 🔽 **Deferred to Detailed Design:** Full XSS sanitization rule implementation, input length limits.

---

## 9. Compliance & Privacy

> **Audience:** Legal · Compliance

### 9.1 Applicable Regulations

No regulations directly bind this bundle. HeadlessAssistant:
- Has no server, database, or telemetry
- Stores only an anonymous UUID and conversation text in the end user's own `localStorage`
- Does not transmit data to any party other than the integrator's configured API endpoint

The integrator's backend is solely responsible for GDPR, CCPA, and any other data protection obligations on data received from the widget.

### 9.2 Client-Side Erasure

The **Clear History** feature (Flow 3) provides end users with a mechanism to erase all client-side conversation data (`ha_history` and `ha_user_id` in `localStorage`). The widget makes no guarantees about data already transmitted to the integrator's API.

### 9.3 Cross-Border Transfer Rules
Not applicable — the widget does not control where data is sent or stored.

---

## 10. Deployment Topology

> **Audience:** Engineers · Integrators

### 10.1 Distribution Model

| Concern | Detail |
| :------ | :----- |
| Bundle file | Single JS file (`headless-assistant.js`) — integrator hosts on their own infrastructure or CDN |
| Config file | `headless-assistant.config.json` — integrator hosts alongside or inline via `init()` |
| Demo | `demo/index.html` — reference integration shipped with the bundle |
| No server required | The widget is entirely client-side; no backend deployment needed |

### 10.2 Environment Matrix

| Environment | Purpose | Notes |
| :---------- | :------ | :---- |
| Local development | Build and test the bundle | Served via any static file server; validated using `demo/index.html` |
| Integrator production | Live portal embedding | Integrator's responsibility |

### 10.3 Deploy Mechanism
The bundle is a static file. No CI/CD pipeline is defined for HeadlessAssistant itself. Distribution is via file copy — integrator downloads and hosts the bundle.

---

## 11. Development Standards

> **Audience:** Engineers
> These standards apply to every development session. All code must comply before a component is marked `Complete`.

### 11.1 Code Conventions

| Concern | Standard |
| :------ | :------- |
| Variables / functions | `camelCase` |
| Classes | `PascalCase` |
| Constants | `SCREAMING_SNAKE_CASE` |
| File naming | `kebab-case` |
| Language version | ES2020+ (vanilla JS, no transpilation required) |
| Max function length | 40 lines — extract if longer |
| Comments | Inline only for non-obvious logic; no block docstrings |

### 11.2 Folder Structure

```
src/
  headless-assistant.js       ← single distributable bundle (JS + injected CSS)
config/
  headless-assistant.config.json  ← reference config with all supported options
demo/
  index.html                  ← working reference integration for integrators
SPECS/
  artifacts/                  ← A_Project, B_Architecture, C/D/E registers
  components/
    c01-headless-assistant/   ← component specification package
```

### 11.3 Branching Strategy

| Concern | Standard |
| :------ | :------- |
| Main branch | `main` — always releasable |
| Feature branches | `feat/c01-<short-description>` |
| Fix branches | `fix/c01-<short-description>` |
| Branch lifetime | Deleted after merge |
| Merge strategy | Squash merge to `main` |

### 11.4 Commit Message Format

Conventional Commits: `<type>(c01): <description>`
- Types: `feat` · `fix` · `refactor` · `docs` · `chore`
- Example: `feat(c01): add SSE streaming with markdown re-render`

### 11.5 Linting & Formatting

| Tool | Config file | Run when |
| :--- | :---------- | :------- |
| ESLint | `.eslintrc.json` | Pre-commit |
| Prettier | `.prettierrc` | Pre-commit |

### 11.6 Testing Requirements

No automated testing for MVP. Validation is performed manually using `demo/index.html` against a real or mock API endpoint.

### 11.7 Definition of Done

A feature is `Complete` when **all** of the following are true:
- [ ] Implementation matches the component spec in `./SPECS/components/c01-headless-assistant/`
- [ ] Manual validation passes via `demo/index.html`
- [ ] No `<script>` injection or XSS vectors in rendered markdown
- [ ] ESLint and Prettier pass with zero errors
- [ ] No hardcoded tokens, endpoints, or config values in the bundle source
- [ ] Bundle size remains under 50KB (unminified source; verified by file size check)

---

## 12. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial architecture drafted from Planning interview | 2026-05-15 | SpecGantry |
