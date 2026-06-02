---
name: b-architecture-resilience
description: Error handling patterns, resilience strategies, and failure classification for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Resilience & Error Handling

> **Audience:** Backend · SRE
> Define the system-wide resilience pattern. Components implement against this pattern.

---

## 1. Chosen Pattern

**Fail fast with user-initiated recovery.** No automatic retries at any layer. All errors surface immediately as a toast/banner notification with a retry button. Errors never contaminate the conversation history.

The only exception is localStorage quota handling: C01 automatically prunes the oldest 20% of history turns on quota overflow (not a user-visible failure).

---

## 2. Error Classification (System-Wide)

| Class | Definition | Retry allowed? | User-visible? | History contaminated? |
| :---- | :--------- | :------------- | :------------ | :-------------------- |
| API Error | 4xx / 5xx HTTP response from `ai_endpoint` | User-initiated only | Y — toast/banner | N |
| Network / Timeout | No response / connection failure (fetch throws) | User-initiated only | Y — toast/banner | N |
| Stream Interruption | `ReadableStream` error mid-response | User-initiated only | Y — error indicator appended to partial response + toast | N |
| Config Error | Missing `ai_endpoint` or `bearer_token` on init | N | Y — inline error rendered in widget container | N |
| localStorage Quota | `QuotaExceededError` on history write | Automatic (prune + retry) | N | N — pruning is transparent |

---

## 3. User-Facing Error Tone

Friendly, non-technical, actionable. Examples as implemented:
- Network error: *"Could not reach the server. Please check your connection."*
- API error / stream error: *"Something went wrong. Please try again."*
- Stream interrupted (inline indicator): *"⚠ Response interrupted"*

Internal error codes are never shown to the end user.

---

## 4. Toast Lifecycle

1. Toast appears above input row with error message, **"Try again"** button, and **"×"** dismiss button.
2. **"Try again"** — re-populates input with `pendingMessage` and re-fires `handleSend()`.
3. **"×"** dismiss — clears toast, re-enables input, clears `pendingMessage`.
4. Auto-dismiss after 8000ms (TOAST_DURATION_MS) — clears toast and re-enables input.
5. Only one toast is visible at a time (previous toast is dismissed before showing a new one).

---

## 5. C02/C03 Resilience

| Concern | Behavior |
| :------ | :------- |
| AI Core OAuth2 failure | Throws — propagates to request handler → SSE error event sent to browser |
| AI Core API error | Throws — SSE error event sent; stream ends with `[DONE]` |
| Tool call failure | Caught per-tool; returns `{ error: "Tool <name> failed — please try again." }` to LLM |
| Unknown tool name | Caught; same error returned to LLM |
| Unexpected server error | Caught at route level; SSE error event + `[DONE]` sent |

> 🔽 **Deferred to Detailed Design:** Retry counts, backoff durations, circuit breaker thresholds — resolved per component in `B_Specification.md`.
