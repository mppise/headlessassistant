---
name: c01-operational-specs
description: Operational specifications for C01-HeadlessAssistant — resolves all deferred items from B_Architecture.md.
license: Apache-2.0 (see LICENSE in project root)
---

# C01 — HeadlessAssistant: Operational Specifications

> This file resolves all items marked 🔽 **Deferred to Detailed Design** in `B_Architecture.md`. Every section is addressed explicitly — items not applicable to a client-side browser bundle are marked N/A with rationale.

---

## 1. Error Handling

Per `B_Architecture.md §7`: fail fast, user-initiated retry, errors never in history.

| Feature | Error class | User-visible message | Retry? | History modified? | Fallback |
| :------ | :---------- | :------------------- | :----- | :---------------- | :------- |
| C01-F08 Send Message | API Error (4xx/5xx) | "Something went wrong. Please try again." | Y — toast retry button | N | None — user retries |
| C01-F08 Send Message | Network / Timeout (fetch rejects) | "Could not reach the server. Please check your connection." | Y — toast retry button | N | None |
| C01-F10/F11 SSE Stream | Stream Interruption (ReadableStream error) | "Response was interrupted. Partial content shown." | Y — toast retry button | N — partial content displayed in bubble but NOT appended to ha_history | Partial markdown rendered with `⚠ Response interrupted` appended |
| C01-F01 Auto-init | Config fetch failure (404 / network) | "Could not load assistant configuration." rendered inline | N | N | Widget renders error state; halts |
| C01-F22 Config validation | Missing required fields | "Assistant configuration is incomplete. Contact the site administrator." rendered inline | N | N | Widget halts |
| C01-F14 History write | localStorage quota exceeded | Silent — oldest turns pruned until write succeeds; no user-visible error | N | Pruned silently | Remove oldest 20% of turns and retry write |

**Toast behavior:**
- Toast appears inside `.ha-panel`, pinned above the input row.
- Auto-dismisses after 8 seconds if the user takes no action.
- Retry button re-submits the last user message (stored in a `pendingMessage` variable cleared on success).
- Dismiss button (`×`) removes the toast immediately.
- At most one toast is shown at a time — new errors replace the current toast.

---

## 2. UX Detail

Resolves: `B_Architecture.md §4 🔽 Deferred to Detailed Design`

### 2.1 Floating Bubble Mode — Step-by-Step Flows

**Open widget:**
1. User clicks `.ha-bubble`.
2. `.ha-panel` transitions from `display:none` to `display:flex` with a 200ms ease-in-out CSS transition.
3. Bubble hides (`display:none`).
4. Input `<textarea>` receives focus.
5. Message list scrolls to bottom.

**Close widget:**
1. User clicks `.ha-btn-close`.
2. `.ha-panel` transitions to `display:none`.
3. Bubble reappears.

**Send message:**
1. User types in `<textarea>`. Height auto-expands up to 120px, then scrolls.
2. User presses Enter (without Shift) or clicks Send button.
3. Input is cleared and disabled. Send button disabled.
4. User message bubble appended to `.ha-messages`.
5. Assistant "typing" indicator (three animated dots) appended.
6. API request sent (C01-F08).
7. On first SSE chunk: typing indicator replaced by assistant bubble with partial content.
8. On subsequent chunks: assistant bubble content updated in-place (full re-render of accumulated markdown).
9. On stream end / full JSON received: final render, input re-enabled, scroll to bottom.
10. Turn appended to `ha_history`.

**Clear history:**
1. User clicks `.ha-btn-clear` (trash icon).
2. No confirmation dialog — immediate action.
3. `ha_history` and `ha_user_id` removed from localStorage.
4. `.ha-messages` content cleared.
5. A new UUID is generated and stored as `ha_user_id`.

### 2.2 Inline Embed Mode — Differences

- No bubble. Widget panel is visible immediately on mount.
- `.ha-btn-close` sets `display:none` on the entire `.ha-widget` container.
- No open/close animation — instant show/hide.
- All other flows identical to floating mode.

### 2.3 Typing Indicator

```html
<div class="ha-bubble ha-bubble--assistant ha-typing">
  <span></span><span></span><span></span>
</div>
```
Three dots animated via CSS `@keyframes` with staggered opacity pulses (0.4s cycle, 0.15s delay between dots).

### 2.4 Message Bubbles

- **User bubble:** right-aligned, `--ha-bubble-user-bg` background, white text.
- **Assistant bubble:** left-aligned, `--ha-bubble-assistant-bg` background, `--ha-text-color` text.
- Assistant avatar: if `theme.avatar_url` is set, a 28×28px circular image precedes the bubble. Otherwise, a colored circle with "A" initials.
- Rendered markdown HTML is injected as `innerHTML` of the assistant bubble (after sanitization).

### 2.5 Accessibility

- Chat message list uses `role="log"` and `aria-live="polite"` — new messages announced to screen readers.
- Toast uses `role="alert"` and `aria-live="assertive"`.
- All icon buttons have `aria-label`.
- Input `<textarea>` has `aria-label="Chat message"`.
- Focus is trapped inside the panel when open in floating mode (Tab cycles through: input → send → clear → close → input).

### 2.6 Performance Budget

| Metric | Target |
| :----- | :----- |
| Bundle size (source, unminified) | < 50KB |
| Time to first widget render | < 100ms after DOMContentLoaded (excluding config fetch) |
| Config fetch (via network) | Non-blocking; widget renders loading state during fetch |
| SSE chunk-to-render latency | < 16ms per chunk (one animation frame) |
| localStorage read on mount | < 5ms for histories up to 200 turns |

---

## 3. Data Specifics

Resolves: `B_Architecture.md §5 🔽 Deferred to Detailed Design`

### 3.1 localStorage Schema

| Key | Type | Content | Written by | Read by |
| :-- | :--- | :------ | :--------- | :------ |
| `ha_history` | JSON string | `Array<{ role: "user"\|"assistant", content: string }>` | C01-F14, C01-F15 | C01-F07, C01-F08 |
| `ha_user_id` | string | UUID v4 string | C01-F04, C01-F15 | C01-F04, C01-F08 |

### 3.2 Field-Level Schema: ConversationTurn

| Field | Type | Nullable | Validation | PII? | Retention |
| :---- | :--- | :------- | :--------- | :--- | :-------- |
| `role` | `"user"\|"assistant"` | N | Must be one of two values | N | Until user clears history |
| `content` | string | N | Non-empty; max 4000 chars for user turns; no limit for assistant turns | Potentially — depends on conversation content | Until user clears history |

### 3.3 Field-Level Schema: WidgetConfig (runtime object)

| Field | Type | Nullable | Default | Validation |
| :---- | :--- | :------- | :------ | :--------- |
| `api_endpoint` | string | N | — | Required; must start with `https://` (or `http://` in dev) |
| `bearer_token` | string | N | — | Required; non-empty |
| `max_turns` | number | N | 10 | Integer 1–100; clamped |
| `user` | string | Y | null → UUID | If null, UUID auto-generated |
| `response_field` | string | N | `"message"` | Dot-notation path; max 5 levels |
| `stream_field` | string | N | same as `response_field` | Same rules |
| `container` | string | Y | null | Valid CSS selector; element must exist in DOM |
| `stream_mode` | `"sse"\|"json"` | N | `"sse"` | Must be one of two values |
| `theme.*` | various | Y (all) | see §2 of B_Interfaces | Applied after config merge |

### 3.4 localStorage Quota Guard

- Before every `localStorage.setItem('ha_history', ...)` call, catch `QuotaExceededError`.
- On quota error: remove the oldest 20% of turns (round up), retry the write once.
- If retry also fails: log a console warning and skip the write for this turn. Widget continues operating.
- No user-visible error for quota events.

### 3.5 localStorage Versioning

- This is v1. No migration logic required at initial release.
- If the schema changes in a future release, a `ha_version` key will be introduced and migration code added to ConfigLoader. Existing `ha_history` data with no version key is treated as v1.

---

## 4. Security Detail

Resolves: `B_Architecture.md §8 🔽 Deferred to Detailed Design`

### 4.1 XSS Sanitization Rules (C01-F13)

The XSSSanitizer applies an **allowlist** approach. Only the following elements and attributes pass through. Everything else is stripped (elements removed, leaving text content; attributes removed from otherwise-allowed elements).

**Allowed elements:**
`p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `strong`, `em`, `br`

**Allowed attributes per element:**

| Element | Allowed attributes |
| :------ | :----------------- |
| `a` | `href` (value must NOT start with `javascript:` or `data:`; otherwise href removed) |
| `th`, `td` | `colspan`, `rowspan` |
| All others | none |

**Always enforced on `<a>` tags:**
- `target="_blank"` added
- `rel="noopener noreferrer"` added

**Sanitization implementation:**
- Use `DOMParser.parseFromString(html, 'text/html')` to parse rendered HTML into a document.
- Walk all elements. For each: if tag not in allowlist → replace with a `<span>` containing only text content. If tag in allowlist → strip all attributes not in the per-element allowlist. Apply `<a>` enforcement.
- Serialize back to HTML string via `element.innerHTML`.
- Do NOT use `innerHTML` assignment for the parse step — use DOMParser to avoid triggering script execution in older browsers.

### 4.2 Input Validation

| Input | Validation | Action if invalid |
| :---- | :--------- | :---------------- |
| User message text | Max 4000 chars, non-empty | Send button disabled; no API call |
| Config `api_endpoint` | Must be string, starts with `https://` (or `http://` for localhost) | Config validation error; widget halts |
| Config `bearer_token` | Must be non-empty string | Config validation error; widget halts |
| Config `container` selector | Must match exactly one DOM element | Config validation error; widget halts |
| SSE chunk JSON | Must be parseable JSON | Skip chunk silently; stream continues |
| Full JSON response | Must be parseable JSON; `response_field` path must resolve to string | Treated as empty response; no error shown |

### 4.3 Threat Surface

| Threat | Vector | Mitigation |
| :----- | :----- | :--------- |
| XSS via API response | Malicious markdown in assistant reply | Allowlist sanitizer (C01-F13) |
| Token theft via JS | `bearer_token` readable by host page JS | Documented integrator responsibility; widget cannot mitigate beyond HTTPS |
| Token theft via config file | `config.json` publicly accessible | Documented integrator responsibility: use short-lived scoped tokens |
| History tampering | Host page JS writes to `ha_history` | Not mitigable client-side; integrator must trust their own page JS |
| CSRF | Widget POSTs to integrator API | Integrator's API must validate the Bearer token; CSRF is the API's concern |
| Prototype pollution via config JSON | Malicious config file with `__proto__` keys | Config loading uses `JSON.parse()` — safe; do not use `Object.assign()` with config; use explicit field extraction |

---

## 5. Compliance Obligations

Resolves: `B_Architecture.md §9 🔽`

**N/A at the bundle level.** HeadlessAssistant has no server, no database, no telemetry. The bundle stores only:
- `ha_history`: conversation text (potentially sensitive — depends on what users say)
- `ha_user_id`: anonymous UUID (not PII)

The integrator's backend receives all conversation content and is solely responsible for GDPR/CCPA compliance.

**Client-side erasure mechanism:** C01-F15 (Clear History) removes both `ha_history` and `ha_user_id` from `localStorage`, providing the only erasure mechanism the widget can offer.

---

## 6. Observability

**N/A for MVP.** HeadlessAssistant is a client-side bundle with no server-side logging, tracing, or analytics infrastructure.

**Developer-facing console output (non-production behavior):**
- `console.warn` on localStorage quota exceeded.
- `console.warn` if `HeadlessAssistant.init()` is called while already mounted.
- `console.error` on config fetch failure.
- No `console.log` calls in the distributable bundle.

---

## 7. Infrastructure

**N/A.** HeadlessAssistant is a static file bundle — no server infrastructure, health checks, environment variables, or secrets injection systems apply.

Distribution: integrator copies `headless-assistant.js` and `headless-assistant.config.json` to their own hosting environment.

---

## 8. AI Behavior

**N/A.** HeadlessAssistant performs no AI processing. It routes user messages to the integrator's AI API and renders the response. All AI behavior is the integrator's API's responsibility.

---

## 9. Testing

Per `D_Decisions.md D-TECH-HA000004`: no automated testing for MVP. Manual validation only.

### 9.1 Manual Validation Checklist (via `demo/index.html`)

| Test case | Expected outcome |
| :-------- | :--------------- |
| Auto-init with valid `data-config` | Widget mounts; history loaded from localStorage |
| Manual `HeadlessAssistant.init()` | Widget mounts with supplied config |
| Missing `api_endpoint` in config | Inline error rendered; widget halts |
| Send message → full JSON response | User bubble + assistant bubble appear; turn in localStorage |
| Send message → SSE stream | Streaming text appears chunk by chunk; final turn in localStorage |
| Stream interruption (server closes mid-stream) | Partial response shown with `⚠ Response interrupted`; retry toast shown |
| API 500 error | Toast with "Something went wrong"; history unchanged |
| Network error (server unreachable) | Toast with connection error; history unchanged |
| Retry button | Re-sends last message; toast dismissed |
| Clear history | Messages cleared; localStorage emptied; new UUID generated |
| Close button (floating) | Panel hides; bubble reappears |
| Close button (inline) | Widget hidden (`display:none`) |
| Session resume | Navigate away and back; previous conversation restored |
| Theme config | All theme options applied correctly via CSS variables |
| Inline embed mode | Widget mounts inside designated container |
| Markdown rendering | h1–h6, paragraphs, UL, OL, tables, bold, italic, links all render correctly |
| XSS attempt via response | `<script>alert(1)</script>` in API response → stripped; no alert |
| `javascript:` link in response | `href="javascript:void(0)"` → href removed |
| Bundle size | `wc -c src/headless-assistant.js` < 51200 bytes |
| ESLint + Prettier | Zero errors |

---

## 10. Notifications

**N/A.** HeadlessAssistant has no notification system — no email, push, or SMS capabilities.

---

## 11. Scalability

**N/A.** HeadlessAssistant is a client-side bundle. There is no server to scale.

**Client-side performance constraints** (addressed in §2.6):
- Bundle size < 50KB.
- SSE chunk rendering < 16ms per chunk.
- localStorage operations < 5ms for typical history sizes.

---

## 12. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial specification | 2026-05-15 | SpecGantry |
