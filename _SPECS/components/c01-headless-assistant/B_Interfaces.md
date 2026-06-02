---
name: c01-interfaces
description: Interface contracts for C01-HeadlessAssistant — public JS API, config schema, outbound API contract, and DOM events.
license: Apache-2.0 (see LICENSE in project root)
---

# C01 — HeadlessAssistant: Interfaces

---

## 1. Public JavaScript API

### `HeadlessAssistant.init(config)`

Mounts the widget programmatically. Must be called after the script tag has loaded. Idempotent — calling `init()` while a widget is already mounted is a no-op (logs a warning to console).

```
HeadlessAssistant.init(config: WidgetConfig): void

WidgetConfig {
  // Required
  api_endpoint:   string       — full URL of the integrator's API endpoint
  bearer_token:   string       — Bearer token for Authorization header

  // Optional — with defaults
  max_turns:      number       — default: 10; max history turns sent to API
  user:           string       — default: auto-generated UUID; user identifier sent in POST body
  response_field: string       — default: "message"; dot-notation path to markdown field in API response
  stream_field:   string       — default: same as response_field; field path in each SSE chunk payload
  container:      string       — default: null; CSS selector for inline embed target; if null → floating bubble
  stream_mode:    "sse"|"json" — default: "sse"; whether to expect streaming or full JSON response

  // Theme (all optional — defaults produce a clean neutral widget)
  theme: {
    primary_color:    string   — default: "#4F46E5"; main accent color (buttons, user bubbles)
    background_color: string   — default: "#FFFFFF"; chat panel background
    font_family:      string   — default: "system-ui, sans-serif"
    font_size:        string   — default: "14px"
    header_title:     string   — default: "Assistant"
    placeholder_text: string   — default: "Type a message…"
    avatar_url:       string   — default: null; URL for assistant avatar image; if null → initials fallback
    border_radius:    string   — default: "12px"; applied to panel and bubbles
  }
}
```

**Errors:** If `api_endpoint` or `bearer_token` is missing, renders a visible inline error in the widget container and returns without throwing.

---

### `HeadlessAssistant.destroy()`

Unmounts the widget, removes all DOM elements injected by the bundle, and removes all event listeners. Does NOT clear `localStorage` — use `HeadlessAssistant.clearHistory()` for that.

```
HeadlessAssistant.destroy(): void
```

---

### `HeadlessAssistant.clearHistory()`

Programmatically clears `ha_history` and `ha_user_id` from `localStorage` and resets the chat panel. Equivalent to the user clicking the trash icon.

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

- `data-config` must be a URL (absolute or relative) to a valid JSON file matching the `WidgetConfig` schema above.
- The bundle fetches the config file via `fetch()` on `DOMContentLoaded`.
- If `data-config` is absent, auto-init is skipped; the bundle waits for `HeadlessAssistant.init()`.
- If the config fetch fails (network error, 404), renders an inline error in `document.body` and halts.

---

## 3. Config File Schema

File: `config/headless-assistant.config.json`

```json
{
  "api_endpoint": "https://your-api.example.com/chat",
  "bearer_token": "your-short-lived-scoped-token",
  "max_turns": 10,
  "user": "optional-static-user-id",
  "response_field": "message",
  "stream_field": "message",
  "container": "#ha-container",
  "stream_mode": "sse",
  "theme": {
    "primary_color": "#4F46E5",
    "background_color": "#FFFFFF",
    "font_family": "system-ui, sans-serif",
    "font_size": "14px",
    "header_title": "Assistant",
    "placeholder_text": "Type a message…",
    "avatar_url": null,
    "border_radius": "12px"
  }
}
```

**Required fields:** `api_endpoint`, `bearer_token`
**All other fields:** optional; defaults applied by ConfigLoader if absent.

---

## 4. Outbound API Request Contract

```
POST {config.api_endpoint}
Authorization: Bearer {config.bearer_token}
Content-Type: application/json

Request body:
{
  "user":    string,                          — user ID (config.user or ha_user_id UUID)
  "message": string,                          — current user message (non-empty, max 4000 chars)
  "history": Array<{ role: string, content: string }> — last max_turns turns from ha_history
}

ConversationTurn:
{
  role:    "user" | "assistant"
  content: string                             — raw text content of the turn
}
```

---

## 5. Inbound Response Contracts

### 5.1 Full JSON Mode (`stream_mode: "json"`)

```
HTTP 200 OK
Content-Type: application/json

Response body (example with default response_field "message"):
{
  "message": "## Hello\n\nThis is the assistant response in **markdown**."
}

Dot-notation path resolution example (response_field: "data.reply"):
{
  "data": {
    "reply": "## Hello\n\nMarkdown content here."
  }
}
```

- The widget reads the value at `config.response_field` (dot-notation).
- The value must be a string. If missing or not a string, treated as an empty response.

### 5.2 SSE Streaming Mode (`stream_mode: "sse"`)

```
HTTP 200 OK
Content-Type: text/event-stream

Stream format (each event):
data: {"message": "chunk of markdown text"}

Stream termination — either of:
data: [DONE]
— or — connection closed by server
```

- The widget uses `fetch` + `ReadableStream` to consume the stream.
- Each chunk: decode UTF-8 → split on `\n\n` → parse `data:` lines → extract `config.stream_field` value → accumulate → re-render full accumulated markdown.
- `[DONE]` sentinel or connection close triggers finalization: append completed turn to history.
- Chunks that cannot be parsed as JSON are skipped silently (the stream continues).

### 5.3 Error Responses

```
HTTP 4xx / 5xx
— Any non-200 status code triggers the API error handler.
— Response body is not read or displayed to the user.
— User sees: toast/banner with "Something went wrong. Please try again." + Retry button.
```

---

## 6. CSS Custom Properties Interface

All theme values are exposed as `--ha-*` custom properties on the widget root element (`.ha-widget`). Integrators can override these in their own stylesheet.

| Property | Default | Maps to config |
| :------- | :------ | :------------- |
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

The widget injects the following top-level elements into the host page:

**Floating mode:**
```html
<div class="ha-widget ha-floating" id="ha-widget-root">
  <div class="ha-bubble" id="ha-bubble"><!-- SVG chat icon --></div>
  <div class="ha-panel" id="ha-panel" aria-hidden="true">
    <div class="ha-header">
      <span class="ha-header-title">{theme.header_title}</span>
      <button class="ha-btn-clear" aria-label="Clear history"><!-- trash icon --></button>
      <button class="ha-btn-close" aria-label="Close"><!-- × --></button>
    </div>
    <div class="ha-messages" id="ha-messages" role="log" aria-live="polite"></div>
    <div class="ha-input-row">
      <textarea class="ha-input" placeholder="{theme.placeholder_text}" rows="1"></textarea>
      <button class="ha-btn-send" aria-label="Send"><!-- send icon --></button>
    </div>
  </div>
</div>
```

**Inline mode:**
Same `ha-panel` structure without the bubble; mounted directly inside the integrator's container element. The `ha-btn-close` hides the panel (`display:none`) on click.

**Toast:**
```html
<div class="ha-toast" role="alert" aria-live="assertive">
  <span class="ha-toast-message">{error message}</span>
  <button class="ha-btn-retry">Try again</button>
  <button class="ha-btn-dismiss" aria-label="Dismiss"><!-- × --></button>
</div>
```
Toast is appended inside `.ha-panel` and removed after dismissal or successful retry.

---

## 8. Input Constraints

| Field | Constraint |
| :---- | :--------- |
| User message | Max 4000 characters. Submit is disabled while a request is in-flight. Empty messages are rejected (no API call). |
| Config: `max_turns` | Integer 1–100. Values outside range are clamped. |
| Config: `api_endpoint` | Must be a valid absolute URL starting with `https://`. HTTP is accepted in local development only. |
| Config: `response_field` | String, dot-notation path. Max depth: 5 levels. Invalid paths resolve to empty string. |

---

## 9. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-15 | SpecGantry |
