---
release: 2026.05.15.2146
component: C01-HeadlessAssistant
audience: internal
date: 2026-05-15
---

# Release Announcement — HeadlessAssistant v1.0

**Release date:** May 15, 2026
**Version:** 2026.05.15.2146
**Type:** Initial release

---

## What's New

HeadlessAssistant v1.0 is the first production-ready release of the embeddable chat widget. This release delivers the complete C01-HeadlessAssistant component — a zero-dependency, single-file JavaScript widget that integrators embed in any web portal with one script tag.

### Key capabilities

- **Two embed modes.** Floating bubble (bottom-right, fixed position) for portals that want an always-available chat button. Inline embed for portals with a dedicated support panel or sidebar.
- **Streaming and non-streaming.** SSE streaming mode renders the assistant's response word-by-word as it arrives. Full JSON mode renders the complete response in one shot. Both modes are configurable.
- **Markdown rendering.** The widget renders headings, paragraphs, lists, tables, bold, italic, and inline links from assistant responses. All HTML is sanitized with an allowlist-based XSS sanitizer — no external library required.
- **Conversation history.** Turns are persisted in `localStorage` and restored on page reload. History is automatically trimmed to `max_turns` before each API request.
- **User identity.** Integrators supply the authenticated user's account ID via `customer_id`; anonymous users receive an auto-generated UUID.
- **Personalised greeting.** When `user_name` is supplied, the widget greets the user by first name on a fresh session (*"Hi Sarah! How can I help you today?"*). Falls back to a generic greeting when `user_name` is omitted.
- **Error handling.** API errors, network failures, and mid-stream interruptions each surface a toast notification with a *Try again* button. No failed attempt is written to conversation history.
- **Theming.** All visual properties (primary color, background, fonts, border radius, header title, placeholder, avatar) are configurable via the `theme` object and exposed as `--ha-*` CSS custom properties for host-page override.

---

## Breaking Changes

None — this is the initial release.

---

## Required Actions

### For integrators embedding the widget

1. Host `headless-assistant.js` on a server your portal can reach (CDN, same origin, or the agent-server at `/headless-assistant.js`).
2. Call `HeadlessAssistant.init({ ai_endpoint, bearer_token, ... })` after the script loads. Supply `customer_id` with the authenticated user's account ID to avoid localStorage UUID generation.
3. Use a **short-lived, scoped bearer token** — the token is visible in browser network traffic. Never use a long-lived API master key.
4. Ensure your API endpoint returns either a full JSON response (`{ "message": "..." }`) or an SSE stream (`data: {"message":"..."}\n\ndata: [DONE]`). See the integration guide for the full API contract.

### For operators running the agent-server (demo)

1. Populate `_DEMO/agent-server/.env` with valid SAP AI Core credentials before starting. The `.env` file is excluded from version control — it must never be committed.
2. Run `_DEMO/start.sh` to start both servers. The script installs dependencies, starts `agent-server` on port 3000 and `payment-portal` on port 8080, and cleans up on exit.

---

## Known Limitations

- **Status events not surfaced in UI.** The agent-server emits `data: {"status":"..."}` SSE events during tool execution (e.g., *"Pulling together your account summary…"*). The widget currently does not render these events — they are silently dropped. A future release will display status messages in the chat panel.
- **No automated tests.** Test coverage is currently manual. A test suite will be added in the next release cycle.
- **Demo uses mocked backend data.** The `agent-server` mock layer returns static fixtures for all EPP Swiftpay API calls. Replace `lib/mock-data.js` with live HTTP calls before connecting to a production SAP environment.

---

## Documentation

- [Integration Guide](../payment-portal/../../../docs/component-integration-guide.html) — embed options, config reference, user identity, lifecycle methods
- [Error Handling](../../../docs/component-error-handling.html) — API contract, error types, toast/retry behavior
- [Theming Guide](../../../docs/concept-theming.html) — theme config options and CSS custom property overrides
