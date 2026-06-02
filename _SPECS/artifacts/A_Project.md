---
name: project
description: Describe the project idea.
license: Apache-2.0 (see LICENSE in project root)
---

# HeadlessAssistant

> A zero-dependency, embeddable chat widget that any portal owner can drop into their website via a single script tag to deliver a fully conversational AI assistant experience — powered by their own API endpoint.

---

## Table of Contents

| # | Section | Primary Audience |
| :-: | :------ | :--------------- |
| 1 | [Problem & Solution](#1-problem--solution) | All |
| 2 | [Users](#2-users) | Product · Design · All |
| 3 | [Scope](#3-scope) | Product · Engineering · Stakeholders |
| 4 | [Constraints & Trade-offs](#4-constraints--trade-offs) | Product · Engineering · Leadership |
| 5 | [Success](#5-success) | Product · Leadership · Stakeholders |
| 6 | [Open Questions](#6-open-questions) | Product · Engineering |
| 7 | [Change History](#7-change-history) | All |

---

## 1. Problem & Solution

> **Audience:** Everyone. Start here.

### 1.1 Problem
Portal owners who want to add AI-assisted chat to their website today must build the entire UI, streaming logic, conversation history management, and markdown rendering from scratch — or adopt a heavyweight SDK that locks them into a specific vendor or framework. There is no interoperable, reusable, drop-in solution that works with any backend API regardless of the portal's tech stack.

### 1.2 Solution
HeadlessAssistant is a single-file, zero-dependency vanilla JS/CSS/HTML bundle that an integrator embeds via one script tag. It connects to any integrator-supplied API endpoint (via configurable Bearer token auth), handles both SSE streaming and full JSON responses, renders markdown output as HTML on the fly, maintains a shared domain-wide conversation history, and presents a polished, fully themeable chat widget — all without touching the host page's code or dependencies.

---

## 2. Users

> **Audience:** Product · Design · All

### 2.1 Target Audience
The primary user is **the integrator** — a frontend or full-stack developer (or technically capable portal owner) who needs to embed a conversational AI assistant into an existing web portal quickly and without framework lock-in.

### 2.2 Personas & Journeys

| Persona | Goal | Journey | Outcome |
| :------ | :--- | :------ | :------ |
| Frontend Developer | Embed a chat widget in under 5 minutes with minimal config | Copies script tag → sets config (endpoint, token) → loads page → widget appears | Fully functional chat widget live on the portal |
| Full-Stack Developer | Wire the widget to a custom API with auth, custom theme, and history control | Uses `HeadlessAssistant.init({...})` → passes endpoint, Bearer token, max_turns, theme → adjusts CSS variables | Fully configured, branded assistant integrated with their backend |

---

## 3. Scope

> **Audience:** Product · Engineering · Stakeholders

### 3.1 In Scope (MVP)

> ⚠️ **ID rules:**
> - Assign IDs sequentially: `REQ-0001`, `REQ-0002`, etc.
> - IDs are permanent. Once assigned, never renumber or reuse an ID — even if the requirement is later removed or deferred.
> - If a requirement is removed, mark it `Deferred` or `Removed` in the Status column and leave the row in place. Component specs referencing it remain valid historical records.

| ID | Requirement | Priority | Status |
| :- | :---------- | :------- | :----- |
| REQ-0001 | Embeddable via a single `<script>` tag with auto-init when `data-config` attribute is present | P1 | Active |
| REQ-0002 | Manual init via `HeadlessAssistant.init({ ...config })` for programmatic control | P1 | Active |
| REQ-0003 | Config file (`headless-assistant.config.json`) supporting: `api_endpoint`, `bearer_token`, `max_turns`, `user` (optional static override), and full theme options | P1 | Active |
| REQ-0023 | If `user` is not supplied in config or `init()`, generate and persist an anonymous UUID in `localStorage` as the default user identifier | P1 | Active |
| REQ-0004 | Send user messages to the API as `POST { user, message, history }` JSON | P1 | Active |
| REQ-0005 | Authenticate API requests using a Bearer token passed via config | P1 | Active |
| REQ-0006 | Support standard SSE (`text/event-stream`) streaming responses | P1 | Active |
| REQ-0007 | Support full (non-streaming) JSON responses | P1 | Active |
| REQ-0008 | Support custom chunked streaming format (configurable event/data field mapping) | P2 | Active |
| REQ-0009 | Render API markdown responses (headings, paragraphs, tables, lists, links) as HTML on the fly | P1 | Active |
| REQ-0010 | Links in rendered markdown open in a new tab | P1 | Active |
| REQ-0011 | Chunk-by-chunk streaming display: each SSE chunk triggers a full markdown re-render of the accumulated response | P1 | Active |
| REQ-0012 | Domain-wide conversation history persisted in `localStorage` | P1 | Active |
| REQ-0013 | History sent to API is capped at last N turns, where N = `max_turns` (configurable) | P1 | Active |
| REQ-0014 | Floating chat bubble (fixed bottom-right) as default widget mode | P1 | Active |
| REQ-0015 | Inline embed mode: mounts inside a designated container `<div>` when specified by the integrator | P1 | Active |
| REQ-0016 | Full theme config via config file or `init()` options: colors, fonts, avatar, header title, placeholder text | P1 | Active |
| REQ-0017 | CSS custom properties (e.g., `--ha-primary-color`) exposed for integrator overrides | P2 | Active |
| REQ-0018 | API error (4xx/5xx): display toast/banner — do not write error into chat history | P1 | Active |
| REQ-0019 | Stream interruption: display partial response received so far with an error indicator appended | P1 | Active |
| REQ-0020 | Retry button presented to user on any API error or stream interruption | P1 | Active |
| REQ-0021 | Zero external runtime dependencies — single self-contained JS/CSS/HTML bundle | P1 | Active |
| REQ-0022 | Modern browser support: Chrome, Firefox, Safari, Edge (last 2 major versions) | P1 | Active |

### 3.2 Out of Scope
- Code block rendering and syntax highlighting
- User authentication / identity management (assumed to be handled server-side by the integrator's API)
- Multi-language / i18n support
- Mobile native SDKs (iOS / Android)
- Analytics or usage telemetry built into the widget
- Admin dashboard or configuration UI
- Push notifications

### 3.3 Traceability Index

> This section is **maintained by SpecGantry** during Detailed Design — do not edit manually.
> It maps every requirement to the component features implementing it, enabling impact analysis when requirements change.
> Updated at the Gate Check of each component's Detailed Design session.

| Req ID | Requirement (summary) | Implementing features | Status |
| :----- | :-------------------- | :-------------------- | :----- |
| REQ-0001 | Auto-init via script tag + data-config | C01-F01 | Fully covered |
| REQ-0002 | Manual init via HeadlessAssistant.init() | C01-F02 | Fully covered |
| REQ-0003 | Config file with endpoint, token, max_turns, theme | C01-F03, C01-F22 | Fully covered |
| REQ-0004 | POST { user, message, history } to API | C01-F08 | Fully covered |
| REQ-0005 | Bearer token auth | C01-F08 | Fully covered |
| REQ-0006 | SSE streaming support | C01-F10 | Fully covered |
| REQ-0007 | Full JSON response support | C01-F09 | Fully covered |
| REQ-0008 | Custom chunked streaming support | C01-F11 | Fully covered |
| REQ-0009 | Markdown → HTML rendering (headings, paragraphs, tables, lists, links) | C01-F12, C01-F13 | Fully covered |
| REQ-0010 | Links open in new tab | C01-F13 | Fully covered |
| REQ-0011 | Chunk-by-chunk SSE re-render | C01-F10 | Fully covered |
| REQ-0012 | Domain-wide localStorage history | C01-F07, C01-F14, C01-F15 | Fully covered |
| REQ-0013 | Configurable max_turns history cap | C01-F08 | Fully covered |
| REQ-0014 | Floating chat bubble widget | C01-F05, C01-F16 | Fully covered |
| REQ-0015 | Inline embed mode | C01-F06, C01-F16 | Fully covered |
| REQ-0016 | Full theme config | C01-F20 | Fully covered |
| REQ-0017 | CSS custom properties | C01-F21 | Fully covered |
| REQ-0018 | Toast/banner on API error (no history contamination) | C01-F17, C01-F18 | Fully covered |
| REQ-0019 | Partial response + error indicator on stream interruption | C01-F19 | Fully covered |
| REQ-0020 | Retry button on error | C01-F17, C01-F18, C01-F19 | Fully covered |
| REQ-0021 | Zero-dependency self-contained bundle | C01-F23 | Fully covered |
| REQ-0022 | Modern browser support | C01-F23 | Fully covered |
| REQ-0023 | Anonymous UUID as default user identifier, persisted in localStorage; overridable via config or init() | C01-F04 | Fully covered |

---

## 4. Constraints & Trade-offs

> **Audience:** Product · Engineering · Leadership

- **Zero external runtime dependencies** → No markdown library (e.g., marked.js), no UI framework — all markdown parsing and DOM rendering must be implemented natively within the bundle.
- **Single-file bundle** → All CSS, JS, and HTML templates must be self-contained; no separate stylesheet or asset files to host.
- **Vanilla JS only** → No build toolchain required by the integrator; the bundle must work as a plain `<script>` tag with no module bundler on the host page.
- **Open-ended timeline** → No delivery pressure; correctness and interoperability take priority over speed.

---

## 5. Success

> **Audience:** Product · Leadership · Stakeholders

### 5.1 North Star Metric
An integrator can drop a single script tag into any HTML page, point it at their API, and have a fully functional chat widget running in under 5 minutes.

### 5.2 Launch Criteria
- All P1 requirements (REQ-0001 through REQ-0022, excluding REQ-0008 and REQ-0017) are implemented and error-free.
- The widget renders correctly in Chrome, Firefox, Safari, and Edge (last 2 versions).
- Floating bubble and inline embed modes both work.
- SSE streaming and full JSON response modes both work.
- Conversation history persists across page navigations within the same domain.
- Errors display as toast/banner and never appear in chat history.
- A working demo HTML page is included in the repository.

### 5.3 Supporting Metrics
- Time-to-embed: integrator can go from zero to a running widget in under 5 minutes using the demo and config file.
- Bundle size: the self-contained JS bundle should be under 50KB minified.

---

## 6. Open Questions

> **Audience:** Product · Engineering

- None at this time.

---

## 7. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial draft from Ideation interview | 2026-05-15 | SpecGantry |
