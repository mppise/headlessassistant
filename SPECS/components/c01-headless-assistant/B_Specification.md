---
name: c01-specification
description: Interface contracts, config schema, DOM structure, input constraints, error handling, and operational requirements for C01-HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# C01 — HeadlessAssistant: Specification

---

## 1. Public JavaScript API

### `HeadlessAssistant.init(config)`

Mounts the widget programmatically. Must be called after the script tag has loaded. If already mounted, logs a warning and returns (no-op).

```
HeadlessAssistant.init(config: WidgetConfig): Promise<void>

WidgetConfig {
  // Required
  ai_endpoint:    string        — full URL of the integrator's API endpoint
  bearer_token:   string        — Bearer token for Authorization header

  // Optional — with defaults
  max_turns:      number        — default: 10; clamp 1–100
  customer_id:    string        — default: auto-generated UUID; user identifier in POST body
  user_name:      string        — default: null; personalizes greeting ("Hi {firstName}!")
  response_field: string        — default: "message"; dot-notation path in full JSON response
  stream_field:   string        — default: same as response_field; field path in each SSE chunk
  container:      string        — default: null; CSS selector for inline embed; null → floating
  stream_mode:    "sse"|"json"  — default: "sse"

  // Theme (all optional)
  theme: {
    primary_color:    string    — default: "#4F46E5"
    background_color: string    — default: "#FFFFFF"
    font_family:      string    — default: "system-ui, sans-serif"
    font_size:        string    — default: "14px"
    header_title:     string    — default: "Assistant"
    placeholder_text: string    — default: "Type a message…"
    avatar_url:       string    — default: null; URL for assistant avatar; null → "A" initials
    border_radius:    string    — default: "12px"
  }
}
```

**Error behavior:** If `ai_endpoint` or `bearer_token` is missing, renders a visible inline error div in the widget container and returns without throwing.

---

### `HeadlessAssistant.destroy()`

Unmounts the widget, removes all injected DOM elements and the `<style>` tag. Clears any pending toast timer. Does NOT clear `localStorage`.

```
HeadlessAssistant.destroy(): void
```

---

### `HeadlessAssistant.clearHistory()`

Programmatically clears `ha_history` and `ha_user_id` from `localStorage`; resets the chat panel to empty; issues a new UUID for the session.

```
HeadlessAssistant.clearHistory(): void
```

---

## 2. Auto-Init Contract (Script Tag)

```html
<script
  src="headless-assistant.js"
  data-config="./headless-assistant.config.json">
</script>
```

- `data-config` must be a URL to a valid JSON file matching `WidgetConfig` schema.
- Bundle fetches config via `fetch()` on `DOMContentLoaded` (or immediately if DOM already loaded).
- If `data-config` absent: auto-init skipped; bundle waits for `HeadlessAssistant.init()`.
- If config fetch fails: renders inline error in `document.body` and halts.

---

## 3. Config File Schema

```json
{
  "ai_endpoint":    "https://your-api.example.com/ask-assistant",
  "bearer_token":   "your-short-lived-scoped-token",
  "max_turns":      10,
  "customer_id":    "optional-static-customer-id",
  "user_name":      "Optional Name",
  "response_field": "message",
  "stream_field":   "message",
  "container":      "#ha-container",
  "stream_mode":    "sse",
  "theme": {
    "primary_color":    "#4F46E5",
    "background_color": "#FFFFFF",
    "font_family":      "system-ui, sans-serif",
    "font_size":        "14px",
    "header_title":     "Assistant",
    "placeholder_text": "Type a message…",
    "avatar_url":       null,
    "border_radius":    "12px"
  }
}
```

**Required:** `ai_endpoint`, `bearer_token`. All other fields: optional; defaults applied.

---

## 4. Outbound API Request Contract

```
POST {config.ai_endpoint}
Authorization: Bearer {config.bearer_token}
Content-Type: application/json

{
  "customer_id": string,                          — UUID or config.customer_id
  "message":     string,                          — current user message (1–4000 chars)
  "history":     Array<{ role: string, content: string }>  — last max_turns turns
}

ConversationTurn: { role: "user" | "assistant", content: string }
```

---

## 5. Inbound Response Contracts

### 5.1 Full JSON Mode (`stream_mode: "json"`)

```
HTTP 200 OK
Content-Type: application/json

{ "message": "## Markdown response text…" }
```

- Field path from `config.response_field` (dot-notation, max depth 5).
- Value must be a string; non-string or missing → treated as empty response.

### 5.2 SSE Streaming Mode (`stream_mode: "sse"`)

```
HTTP 200 OK
Content-Type: text/event-stream

data: {"message": "chunk of markdown text"}

data: [DONE]
```

- Parse `data:` lines from `\n\n`-delimited events.
- Extract `config.stream_field` from each JSON chunk; accumulate.
- `[DONE]` sentinel or connection close triggers finalization.
- Unparseable chunks: silently skipped.

### 5.3 Error Responses

```
HTTP 4xx / 5xx → API error handler; response body not read or displayed
Network failure → Network error handler
```

---

## 6. CSS Custom Properties Interface

All theme values exposed as `--ha-*` on `.ha-widget` root:

| Property | Default | Config field |
| :------- | :------ | :----------- |
| `--ha-primary-color` | `#4F46E5` | `theme.primary_color` |
| `--ha-background-color` | `#FFFFFF` | `theme.background_color` |
| `--ha-font-family` | `system-ui, sans-serif` | `theme.font_family` |
| `--ha-font-size` | `14px` | `theme.font_size` |
| `--ha-border-radius` | `12px` | `theme.border_radius` |
| `--ha-bubble-user-bg` | derived from `--ha-primary-color` | — |
| `--ha-bubble-assistant-bg` | `#F3F4F6` | — |
| `--ha-text-color` | `#111827` | — |
| `--ha-header-bg` | derived from `--ha-primary-color` | — |

---

## 7. DOM Structure

**Floating mode (`ha-floating`):**
```html
<div class="ha-widget ha-floating" id="ha-widget-root">
  <div class="ha-bubble" role="button" aria-label="Open assistant" tabindex="0"><!-- SVG --></div>
  <div class="ha-panel" id="ha-panel" aria-hidden="true" role="dialog" aria-label="{header_title}">
    <div class="ha-header">
      <span class="ha-header-title">{header_title}</span>
      <button class="ha-btn-clear" aria-label="Clear history"><!-- trash icon --></button>
      <button class="ha-btn-close" aria-label="Close assistant"><!-- × --></button>
    </div>
    <div class="ha-messages" id="ha-messages" role="log" aria-live="polite" aria-label="Conversation"></div>
    <div class="ha-input-row">
      <textarea class="ha-input" id="ha-input" rows="1" maxlength="4000"></textarea>
      <button class="ha-btn-send" id="ha-btn-send" aria-label="Send message"><!-- send icon --></button>
    </div>
  </div>
</div>
```

**Inline mode (`ha-inline`):** Same structure without the `.ha-bubble`. Panel `aria-hidden` removed immediately on mount.

**Message row (user):**
```html
<div class="ha-msg-row ha-msg-row--user">
  <div class="ha-bubble-msg">{escaped plain text}</div>
</div>
```

**Message row (assistant):**
```html
<div class="ha-msg-row ha-msg-row--assistant">
  <div class="ha-avatar">{A or <img>}</div>
  <div class="ha-bubble-msg">{sanitized HTML from renderMarkdown()}</div>
</div>
```

**Typing indicator:**
```html
<div class="ha-msg-row ha-msg-row--assistant" id="ha-typing">
  <div class="ha-avatar">…</div>
  <div class="ha-bubble-msg ha-typing"><span></span><span></span><span></span></div>
</div>
```

**Toast:**
```html
<div class="ha-toast" role="alert" aria-live="assertive">
  <span class="ha-toast-message">{error message}</span>
  <button class="ha-btn-retry">Try again</button>
  <button class="ha-btn-dismiss" aria-label="Dismiss">×</button>
</div>
```
Inserted between `ha-messages` and `ha-input-row`. Removed on dismiss, retry, or 8s timeout.

---

## 8. Input Constraints

| Field | Constraint |
| :---- | :--------- |
| User message | Max 4000 characters (`maxlength` attribute). Empty messages rejected. Submit disabled while in-flight. |
| `max_turns` | Integer 1–100. Clamped: `Math.min(100, Math.max(1, Math.round(value)))` |
| `response_field` | Dot-notation string. Max depth 5. Invalid/missing path resolves to empty string. |
| `container` | CSS selector string. If selector matches no element, renders config error and aborts. |

---

## 9. Error Handling

| Scenario | Behavior |
| :------- | :------- |
| `ai_endpoint` or `bearer_token` missing | Inline error div rendered in widget container; mount aborts |
| `container` selector not found | Inline error div in `document.body`; mount aborts |
| Config JSON fetch fails (auto-init) | `console.error` + inline error in `document.body`; mount aborts |
| API 4xx/5xx | Toast: "Something went wrong. Please try again." Input re-enabled on dismiss/retry |
| Network failure (fetch throws) | Toast: "Could not reach the server. Please check your connection." |
| Stream interrupted with partial content | Partial rendered + "⚠ Response interrupted" appended + toast |
| localStorage QuotaExceededError | Oldest 20% of history pruned; write retried (transparent to user) |

---

## 10. Security Requirements

- All markdown content from API response passes through `renderMarkdown()` then `sanitizeHtml()` before DOM insertion.
- `sanitizeHtml()` uses `DOMParser` + allowlist traversal — no `innerHTML` of unsanitized strings directly on user-visible elements.
- `javascript:` and `data:` URI schemes rejected in all link `href` values.
- All `<a>` tags rendered with `target="_blank" rel="noopener noreferrer"`.
- User message text is inserted via `escapeHtml()` — displayed as plain text, not rendered as HTML.
- Bearer token is never logged or included in error messages.

---

## 11. Testing Requirements

Manual validation via demo integration (`_DEMO/`):
- Floating and inline modes
- SSE streaming and full JSON modes
- History resume across page reload
- Clear history
- API error + retry flow
- Stream interruption (server-side kill mid-stream)
- XSS injection attempts in API response

Automated test coverage: not applicable for MVP (per `_SPECS/artifacts/B_Architecture.md` §11.6).

---

## 12. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-15 | SpecGantry |
| — | Updated by reverse engineering — aligned field names (customer_id); added greeting, user_name; updated DOM structure | 2026-06-01 | SpecGantry |
