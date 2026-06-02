---
name: c01-core-spec
description: Core specification for C01-HeadlessAssistant — feature inventory, internal module structure, data flows, and execution model.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C01 — HeadlessAssistant: Core Specification

Architecture refs: `SPECS/artifacts/Architecture/0_Overview.md`, `SPECS/artifacts/Architecture/4_API.md`, `SPECS/artifacts/Architecture/5_Security.md`

> A zero-dependency, single-file vanilla JS/CSS/HTML widget that embeds a conversational AI assistant into any web portal via a single script tag or programmatic init call.

---

## 1. Purpose

C01-HeadlessAssistant is the sole distributable component of the HeadlessAssistant system. It owns every client-side capability: configuration loading, widget DOM rendering, API communication (SSE + full JSON), markdown rendering with XSS sanitization, conversation history management, user identity, theming, and error handling.

**Ownership boundary:** C01 owns all DOM elements within `#ha-widget-root` and all `localStorage` keys prefixed `ha_`. It must not modify the host page outside its container.

---

## 2. Feature Inventory

| Status | ID | Description | Priority | Req Ref |
| :----- | :- | :---------- | :------- | :------ |
| `Complete` | C01-F01 | Auto-init: detect `data-config` attribute on the script tag, fetch and parse the JSON config file via `fetch()`, then call `mount()` | P1 | REQ-0001 |
| `Complete` | C01-F02 | Manual init: expose `HeadlessAssistant.init(config)` as a global JS API for programmatic widget mounting | P1 | REQ-0002 |
| `Complete` | C01-F03 | Config schema: load and validate all supported config options; apply defaults for optional fields; `ai_endpoint` and `bearer_token` are required | P1 | REQ-0003, REQ-0023 |
| `Complete` | C01-F04 | User identity: use `config.customer_id` if supplied; otherwise generate a `crypto.randomUUID()` and persist as `ha_user_id` in `localStorage` | P1 | REQ-0023 |
| `Complete` | C01-F05 | Widget mount — floating bubble mode: render a fixed-position bubble (bottom-right, z-index 9999); clicking it opens the chat panel (z-index 9998) | P1 | REQ-0014 |
| `Complete` | C01-F06 | Widget mount — inline embed mode: render the widget inside the integrator-designated container element (via `config.container` CSS selector) | P1 | REQ-0015 |
| `Complete` | C01-F07 | Session resume: on mount, read `ha_history` from `localStorage` and render all prior turns in the chat panel | P1 | REQ-0012 |
| `Complete` | C01-F08 | Send message: build `{ customer_id, message, history }` (history trimmed to `max_turns`), POST to `config.ai_endpoint` with `Authorization: Bearer` header | P1 | REQ-0004, REQ-0005, REQ-0013 |
| `Complete` | C01-F09 | Full JSON response handling: read markdown content from `config.response_field` (dot-notation, default: `message`), render once, append turn to history | P1 | REQ-0007 |
| `Complete` | C01-F10 | SSE streaming response handling: accumulate chunks via `fetch` + `ReadableStream`; on each chunk re-render full accumulated markdown in the assistant bubble | P1 | REQ-0006, REQ-0011 |
| `Complete` | C01-F11 | Custom chunked streaming: support configurable SSE chunk field mapping via `config.stream_field` (may differ from `response_field`) | P2 | REQ-0008 |
| `Complete` | C01-F12 | Markdown renderer: convert API response markdown to HTML supporting h1–h6, paragraphs, unordered lists, ordered lists, simple tables, bold, italic, and inline links | P1 | REQ-0009, REQ-0010 |
| `Complete` | C01-F13 | XSS sanitization: DOM-parser-based allowlist sanitizer strips disallowed elements, all event attributes, and `javascript:`/`data:` URI schemes; `<a>` tags enforced with `target="_blank" rel="noopener noreferrer"` | P1 | REQ-0009, REQ-0010 |
| `Complete` | C01-F14 | History persistence: append each completed turn `{ role, content }` to `ha_history` in `localStorage` after successful response; guard against quota overflow via recursive 20% prune | P1 | REQ-0012 |
| `Complete` | C01-F15 | Clear history: trash icon in header; on click, remove `ha_history` and `ha_user_id` from `localStorage`, reset chat panel, issue new UUID | P1 | REQ-0012 |
| `Complete` | C01-F16 | Close / minimize widget: close button in header; floating mode sets `aria-hidden="true"` on panel and restores bubble; inline mode sets `display:none` on widget root | P1 | REQ-0014, REQ-0015 |
| `Complete` | C01-F17 | API error handling: on 4xx/5xx, show toast/banner with error message and retry button; do not append anything to history | P1 | REQ-0018, REQ-0020 |
| `Complete` | C01-F18 | Network/timeout error handling: on `fetch` throw (network failure), same toast/banner + retry behavior | P1 | REQ-0018, REQ-0020 |
| `Complete` | C01-F19 | Stream interruption handling: display partial accumulated response in chat bubble with `⚠ Response interrupted` indicator; show toast/banner with retry | P1 | REQ-0019, REQ-0020 |
| `Complete` | C01-F20 | Theming: apply all theme config options (primary color, background, font family, font size, avatar URL, header title, placeholder text, border radius) via CSS custom properties | P1 | REQ-0016, REQ-0017 |
| `Complete` | C01-F21 | CSS custom properties: expose all theme values as `--ha-*` CSS variables on `.ha-widget` root element, allowing integrator override via host-page CSS | P2 | REQ-0017 |
| `Complete` | C01-F22 | Config error handling: if required fields missing on init, render an inline error div in the widget container and return; do not throw uncaught exceptions | P1 | REQ-0003 |
| `Complete` | C01-F23 | Self-contained bundle: all CSS (`buildCSS()`), HTML templates (`buildWidgetHTML()`), and logic embedded as JS strings; no external files required beyond the config JSON | P1 | REQ-0021, REQ-0022 |

---

## 3. Internal Module Structure

The single JS file (`src/headless-assistant.js`) is organized into 12 logical sections:

```
1. CONSTANTS          — LS_HISTORY_KEY, LS_USER_KEY, LS_QUOTA_THRESHOLD (2MB),
                        MAX_MESSAGE_LENGTH (4000), TOAST_DURATION_MS (8000),
                        STREAM_DONE_SENTINEL ('[DONE]'), DEFAULTS, ALLOWED_TAGS, ALLOWED_ATTRS

2. ConfigLoader       — fetchConfig(url), mergeDefaults(cfg), validateConfig(cfg)

3. IdentityManager    — getOrCreateUserId(configUser)

4. HistoryManager     — readHistory(), appendHistory(turn), writeHistory(history),
                        trimHistory(history, maxTurns), clearHistory()

5. MarkdownRenderer   — renderMarkdown(text), parseTableRow(row), renderInline(text),
                        sanitizeHref(url), escapeHtml(str)

6. XSSSanitizer       — sanitizeHtml(html), sanitizeNode(node)
                        (called by renderMarkdown output before DOM insertion)

7. APIClient          — resolveField(obj, path), fetchFullResponse(config, body),
                        fetchStreamResponse(config, body, onChunk, onDone, onError)

8. UIBuilder          — buildCSS(theme), buildWidgetHTML(config),
                        buildMessageRow(role, htmlContent, avatarHTML),
                        buildTypingIndicator(avatarHTML)

9. ThemeEngine        — applyTheme(root, theme)

10. EventController   — bindEvents(widget, config, state), openPanel(...)

11. WidgetController  — handleSend(widget, config, state), appendMessageBubble(...),
                        removeTypingIndicator(...), resetInput(...), scrollToBottom(...),
                        showToast(widget, message, state), dismissToast(widget),
                        resumeSession(widget, state)

12. Bootstrap         — renderConfigError(container, message), mount(rawConfig, containerEl),
                        autoInit(), HeadlessAssistant public API object,
                        DOMContentLoaded listener
```

Sections communicate via explicit function calls — no shared mutable globals except the `_mountedWidget` singleton reference.

---

## 4. Data Flows

**F01/F02 — Init & Mount:**
`Script tag / init() call` → `autoInit()/init()` → `fetchConfig()` (if URL) → `mount(rawConfig)` → `mergeDefaults()` → `validateConfig()` → `getOrCreateUserId()` → inject CSS → build DOM → `applyTheme()` → `resumeSession()` → greeting (if empty history) → `bindEvents()` → widget visible

**F08 — Send Message:**
`User submits` → `handleSend()` → disable input + send → user bubble appended → typing indicator shown → `readHistory()` → `trimHistory(max_turns)` → `POST { customer_id, message, history }`:
- **JSON mode:** `fetchFullResponse()` → `resolveField()` → `renderMarkdown()` → `sanitizeHtml()` → append bubble → `appendHistory()` × 2 → `resetInput()`
- **SSE mode:** `fetchStreamResponse()` → per chunk: `renderMarkdown(accumulated)` → `sanitizeHtml()` → update bubble innerHTML → on done: `appendHistory()` × 2 → `resetInput()`

**F17/F18 — API/Network Error:**
`fetchFullResponse() throws` or `fetchStreamResponse() onError` → `removeTypingIndicator()` → `showToast(errMsg, state)` → input stays disabled; retry restores `pendingMessage` and re-fires `handleSend()`

**F19 — Stream Interruption:**
`onError({type:'stream', accumulated})` → partial content rendered + `⚠ Response interrupted` appended → `showToast()` → history NOT written

**F15 — Clear History:**
`Trash icon click` → `clearHistory()` (removes `ha_history` + `ha_user_id`) → new UUID → `messagesEl.innerHTML = ''`

**F07 — Session Resume:**
`mount()` → `resumeSession()` → `readHistory()` → for each turn: `renderMarkdown()` → `sanitizeHtml()` → `appendMessageBubble()` → `scrollToBottom()`

---

## 5. Execution Mode

**Type:** Browser-native, event-driven client-side script.

**Trigger:** Either:
1. `DOMContentLoaded` fires → `autoInit()` detects `data-config` on script tag → fetches config → `mount()`
2. Integrator calls `HeadlessAssistant.init(config)` explicitly after script loads

**Lifecycle:**
- No background timers except the toast auto-dismiss timeout (8s, cleared on `destroy()`).
- All activity is user-triggered or page-lifecycle-triggered.
- SSE `ReadableStream` is active only during an in-flight request; closed on stream end or error.
- Widget remains mounted until page unload or `HeadlessAssistant.destroy()`.
- Only one widget instance allowed — `_mountedWidget` singleton; re-mounting logs a warning.

---

## 6. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-15 | SpecGantry |
| — | Updated by reverse engineering — aligned to actual code; added greeting feature; customer_id field | 2026-06-01 | SpecGantry |
