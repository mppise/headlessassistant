---
name: c01-core-spec
description: Core specification for C01-HeadlessAssistant — feature inventory, data flows, and execution model.
license: Apache-2.0 (see LICENSE in project root)
---

# C01 — HeadlessAssistant: Core Specification

> A zero-dependency, single-file vanilla JS/CSS/HTML widget that embeds a conversational AI assistant into any web portal via a single script tag or programmatic init call.

---

## 1. Purpose

C01-HeadlessAssistant is the sole component of the HeadlessAssistant system. It owns every capability: configuration loading, widget DOM rendering, API communication (SSE + full JSON), markdown rendering with XSS sanitization, conversation history management, user identity, theming, and error handling.

**Ownership boundary:** C01 owns all DOM elements within its widget container and all `localStorage` keys prefixed `ha_`. It must not modify the host page outside its container.

---

## 2. Feature Inventory

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C01-F01 | Auto-init: detect `data-config` attribute on script tag, fetch and parse the JSON config file, then mount the widget | P1 | REQ-0001 | `Component` |
| `Complete` | C01-F02 | Manual init: expose `HeadlessAssistant.init(config)` as a global JS API for programmatic widget mounting | P1 | REQ-0002 | `Component` |
| `Complete` | C01-F03 | Config schema: load and validate all supported config options; apply defaults for optional fields | P1 | REQ-0003, REQ-0023 | `-` |
| `Complete` | C01-F04 | User identity: use `config.user` if supplied; otherwise generate a `crypto.randomUUID()` and persist it in `localStorage` as `ha_user_id` | P1 | REQ-0023 | `-` |
| `Complete` | C01-F05 | Widget mount — floating bubble mode: render a fixed-position bubble (bottom-right); clicking it opens the chat panel | P1 | REQ-0014 | `Component` |
| `Complete` | C01-F06 | Widget mount — inline embed mode: render the widget inside the integrator-designated container element (specified via `config.container` selector) | P1 | REQ-0015 | `Component` |
| `Complete` | C01-F07 | Session resume: on mount, read `ha_history` from `localStorage` and render all prior turns in the chat panel | P1 | REQ-0012 | `-` |
| `Complete` | C01-F08 | Send message: on user submit, build the API request body `{ user, message, history }` (history trimmed to `max_turns`), POST to `config.api_endpoint` with Bearer token | P1 | REQ-0004, REQ-0005, REQ-0013 | `-` |
| `Complete` | C01-F09 | Full JSON response handling: read markdown content from `config.response_field` (default: `message`), render once, append turn to history | P1 | REQ-0007 | `-` |
| `Complete` | C01-F10 | SSE streaming response handling: accumulate chunks via `fetch` + `ReadableStream`; on each chunk read field from `config.response_field`, re-render full accumulated markdown | P1 | REQ-0006, REQ-0011 | `-` |
| `Complete` | C01-F11 | Custom chunked streaming: support configurable SSE event field mapping via `config.stream_field` for non-standard SSE payloads | P2 | REQ-0008 | `-` |
| `Complete` | C01-F12 | Markdown renderer: convert API response markdown to sanitized HTML supporting headings (h1–h6), paragraphs, unordered lists, ordered lists, simple tables, bold, italic, and inline links | P1 | REQ-0009, REQ-0010 | `-` |
| `Complete` | C01-F13 | XSS sanitization: strip `<script>` tags, all event-handler attributes, and `javascript:` URI schemes from rendered HTML before DOM insertion; links use `target="_blank" rel="noopener noreferrer"` | P1 | REQ-0009, REQ-0010 | `-` |
| `Complete` | C01-F14 | History persistence: append each completed turn `{ role, content }` to `ha_history` in `localStorage` after a successful response; guard against quota overflow | P1 | REQ-0012 | `-` |
| `Complete` | C01-F15 | Clear history: trash icon in widget header; on click, remove `ha_history` and `ha_user_id` from `localStorage` and reset the chat panel to empty | P1 | REQ-0012 | `Component` |
| `Complete` | C01-F16 | Close / minimize widget: close button in widget header; floating mode collapses panel back to bubble; inline mode sets `display:none` on the widget container | P1 | REQ-0014, REQ-0015 | `Component` |
| `Complete` | C01-F17 | API error handling: on 4xx/5xx response, show toast/banner with message and retry button; do not append anything to history | P1 | REQ-0018, REQ-0020 | `Component` |
| `Complete` | C01-F18 | Network/timeout error handling: same toast/banner + retry behavior as API errors | P1 | REQ-0018, REQ-0020 | `Component` |
| `Complete` | C01-F19 | Stream interruption handling: display partial accumulated response in chat bubble with an error indicator appended; show retry button via toast/banner | P1 | REQ-0019, REQ-0020 | `Component` |
| `Complete` | C01-F20 | Theming: apply all theme config options (primary color, background, font family, font size, avatar URL, header title, placeholder text) via CSS custom properties injected at mount | P1 | REQ-0016, REQ-0017 | `Concept` |
| `Complete` | C01-F21 | CSS custom properties: expose all theme values as `--ha-*` CSS variables on the widget root element, allowing integrator override via host-page CSS | P2 | REQ-0017 | `-` |
| `Complete` | C01-F22 | Config error handling: if required fields are missing on init, render an inline error message in the widget container and halt; do not throw uncaught exceptions | P1 | REQ-0003 | `Component` |
| `Complete` | C01-F23 | Self-contained bundle: all CSS and HTML templates are embedded as JS strings; no external files required beyond the config JSON | P1 | REQ-0021, REQ-0022 | `-` |

---

## 3. Internal Module Structure

The single JS file (`src/headless-assistant.js`) is organized into the following logical sections in order:

```
1. CONSTANTS          — key names, default values, CSS variable names
2. ConfigLoader       — fetch + parse JSON config; merge with init() options; validate required fields
3. IdentityManager    — read/write ha_user_id; generate UUID if absent
4. HistoryManager     — read/write ha_history; trim to max_turns; guard localStorage quota
5. MarkdownRenderer   — convert markdown string → sanitized HTML string
6. XSSSanitizer       — allowlist-based HTML sanitizer (called by MarkdownRenderer)
7. APIClient          — POST request; full JSON response handler; SSE streaming handler
8. UIBuilder          — generate widget DOM (bubble + panel) as HTML strings; inject CSS <style> tag
9. ThemeEngine        — map config theme options to --ha-* CSS custom properties
10. EventController   — wire all DOM event listeners (submit, clear, close, retry, bubble click)
11. WidgetController  — orchestrate mount (floating vs inline), session resume, and lifecycle
12. Bootstrap         — DOMContentLoaded listener for auto-init; expose HeadlessAssistant global
```

Each section must not exceed 40 lines per function. Sections communicate via explicit function calls — no shared mutable globals except the single runtime `config` object and the `widget` DOM reference.

---

## 4. Data Flows

**F01/F02 — Init & Mount:**
`Script tag / init() call` → `ConfigLoader.load()` → `IdentityManager.getOrCreate()` → `HistoryManager.read()` → `UIBuilder.render()` → `ThemeEngine.apply()` → `EventController.bind()` → `WidgetController.mount()` → Widget visible in DOM

**F08 — Send Message:**
`User submits input` → `EventController` → `HistoryManager.trim(max_turns)` → `APIClient.post({ user, message, history })` → Response router:
- Full JSON: `APIClient.parseFullResponse()` → `MarkdownRenderer.render()` → `UIBuilder.appendAssistantBubble()` → `HistoryManager.append()`
- SSE: `APIClient.streamResponse()` → per-chunk: `MarkdownRenderer.render(accumulated)` → `UIBuilder.updateStreamingBubble()` → on done: `HistoryManager.append()`

**F17/F18 — API/Network Error:**
`APIClient error` → `UIBuilder.showToast(message)` + `UIBuilder.showRetryButton()` → history unchanged → retry click triggers F08 again

**F19 — Stream Interruption:**
`ReadableStream error` → `UIBuilder.appendErrorIndicator()` → `UIBuilder.showToast(message)` + `UIBuilder.showRetryButton()` → partial content stays in chat bubble; history NOT appended

**F15 — Clear History:**
`Trash icon click` → `HistoryManager.clear()` (removes `ha_history` + `ha_user_id`) → `UIBuilder.resetPanel()`

**F07 — Session Resume:**
`Mount` → `HistoryManager.read()` → for each turn: `MarkdownRenderer.render(content)` → `UIBuilder.appendBubble(role, html)` → scroll to bottom

---

## 5. Execution Mode

**Type:** Browser-native, event-driven client-side script.

**Trigger:** Either:
1. `DOMContentLoaded` event fires → Bootstrap detects `data-config` on the script tag → auto-init, or
2. Integrator calls `HeadlessAssistant.init(config)` explicitly at any point after the script loads.

**Lifecycle:**
- No background processes or timers.
- All activity is user-triggered (message send, clear, close, retry) or page-lifecycle-triggered (mount on load).
- SSE streaming is active only during an in-flight API request; connection closes on stream end or error.
- The widget remains mounted until the page unloads or the integrator calls `HeadlessAssistant.destroy()` (see B_Interfaces.md).

---

## 6. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-15 | SpecGantry |
