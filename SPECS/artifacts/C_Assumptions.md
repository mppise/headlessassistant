---
name: assumptions
description: Living register of all assumptions made during specification. Review and mark each as approved [X], rejected [-], deferred [>], or pending [ ].
license: Apache-2.0 (see LICENSE in project root)
---

# Assumptions

> An assumption left unreviewed is a hidden risk. This register must be reviewed before any dependent work begins.
>
> **Status codes:** `[ ]` Pending · `[X]` Approved · `[-]` Rejected · `[>]` Deferred

---

## Summary

| Total | Pending `[ ]` | Approved `[X]` | Rejected `[-]` | Deferred `[>]` |
| :---: | :-----------: | :------------: | :------------: | :------------: |
| 7 | 0 | 7 | 0 | 0 |

---

## Business & Product

| Status | ID | Assumption | Impact if Wrong | Owner | Notes |
| :----: | :- | :--------- | :-------------- | :---- | :---- |
| `[X]` | A-BP-HA000001 | The integrator is responsible for hosting the bundle file (JS) on their own infrastructure or CDN | If wrong, a hosted CDN distribution strategy must be added to scope | DevAgent | |
| `[X]` | A-BP-HA000002 | A demo HTML page is sufficient as integration documentation; no separate written docs are required for MVP | If wrong, documentation effort must be scoped and scheduled | DevAgent | |

## Users & Behavior

| Status | ID | Assumption | Impact if Wrong | Owner | Notes |
| :----: | :- | :--------- | :-------------- | :---- | :---- |
| `[X]` | A-UB-HA000001 | End users of the portal (the people chatting) are not a primary design concern for this project — the integrator experience is the primary concern | If wrong, end-user onboarding, accessibility (WCAG), and UX research must be added to scope | DevAgent | |
| `[X]` | A-UB-HA000002 | Conversation history shared domain-wide (via localStorage) is acceptable to all end users on the portal — no per-user isolation is needed at the widget level | If wrong, a user identity / session isolation mechanism must be designed | DevAgent | |

## Technical

| Status | ID | Assumption | Impact if Wrong | Owner | Notes |
| :----: | :- | :--------- | :-------------- | :---- | :---- |
| `[X]` | A-TC-HA000001 | The integrator's API endpoint is CORS-configured to accept requests from the portal's domain; HeadlessAssistant does not need to handle CORS proxy logic | If wrong, a proxy or server-side relay pattern must be documented or built | DevAgent | |
| `[X]` | A-TC-HA000002 | The `user` field in the POST body `{ user, message, history }` is either a static string/identifier supplied via config/init(), or an anonymous UUID auto-generated and persisted in `localStorage` by the widget if not supplied | If wrong, an auth/identity integration pattern must be specified | DevAgent | Resolved: REQ-0023 added to cover both cases |

## External Dependencies & Integrations

| Status | ID | Assumption | Impact if Wrong | Owner | Notes |
| :----: | :- | :--------- | :-------------- | :---- | :---- |
| `[X]` | A-EX-HA000001 | The integrator's API is responsible for enforcing rate limiting, authentication validation, and abuse prevention; the widget sends requests in good faith | If wrong, client-side throttling or abuse prevention logic must be added to scope | DevAgent | |

## Compliance & Security

| Status | ID | Assumption | Impact if Wrong | Owner | Notes |
| :----: | :- | :--------- | :-------------- | :---- | :---- |

---

## Rejected Assumptions Log

| ID | Assumption | Rejected by | Date | Resolution |
| :- | :--------- | :---------- | :--: | :--------- |

---

## Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial assumptions seeded from Ideation interview | 2026-05-15 | SpecGantry |
