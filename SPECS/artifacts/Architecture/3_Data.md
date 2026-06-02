---
name: b-architecture-data
description: Data architecture, storage strategy, and entity relationships for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Data Architecture

> **Audience:** Backend · Data

---

## 1. Core Entities & Relationships

```
WidgetConfig ──── owns ──── ConversationHistory (Array<ConversationTurn>)
                                    │
                            ConversationTurn {
                              role: "user" | "assistant"
                              content: string
                            }

UserIdentity (UUID string) ──── associated with ──── ConversationHistory
```

| Entity | Description | Owner |
| :----- | :---------- | :---- |
| `ConversationTurn` | `{ role: 'user' \| 'assistant', content: string }` — one message in the conversation | C01 |
| `UserIdentity` | Anonymous UUID string; generated once per browser via `crypto.randomUUID()` | C01 |
| `WidgetConfig` | Runtime config object (merged from JSON file or `init()` options) | C01 |
| `ToolRegistry` | JSON array of tool definitions: name, statusMessage, schema path, handler path | C02/C03 |
| `OAuth2TokenCache` | `{ access_token, expires_at }` — in-memory, refreshed 60s before expiry | C02/C03 |

---

## 2. Storage Strategy

| Store type | Technology | Used for | Key(s) / Owning component |
| :--------- | :--------- | :------- | :------------------------ |
| Client persistence | Browser `localStorage` | Conversation history, user UUID | `ha_history`, `ha_user_id` — C01 |
| Runtime memory (browser) | JS in-memory state object | Active config, `inFlight` flag, pending message | — C01 |
| Runtime memory (server) | Node.js / Python process memory | OAuth2 token cache, tool registry map | — C02/C03 |
| File system (server startup) | `tool-registry.json`, `schema.json` files | Tool definitions (read-only at startup) | `_DEMO/agent-server/tools/` — C02/C03 |
| File system (server startup) | `system-prompt.txt` | LLM system prompt (read-only at startup) | `_DEMO/prompts/` — C02/C03 |

---

## 3. Data Ownership Rules

- **C01 exclusively owns** `ha_history` and `ha_user_id` in `localStorage`. No other script should write these keys.
- **Full conversation history is stored** (not trimmed at write time). Trimming to `max_turns` occurs only at API call time — the full history is preserved locally.
- **History is domain-wide** — shared across all pages of the portal that embed the widget (same `localStorage` domain).
- **No data is sent to any server** other than the integrator's configured `ai_endpoint`.
- **localStorage quota guard:** If serialized history exceeds 2MB, or a `QuotaExceededError` is thrown, the oldest 20% of turns are pruned and the write is retried recursively.
- **C02/C03 do not persist any user data** — all state is in-memory per-request or per-process; tool handlers use mock data only.

> 🔽 **Deferred to Detailed Design:** Full config schema, localStorage migration/versioning strategy, server-side request/response schemas — resolved per component in `B_Specification.md`.
