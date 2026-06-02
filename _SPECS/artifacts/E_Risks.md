---
name: risks
description: Living register of all risks identified during specification. Review and mark each as accepted [X], mitigated [M], rejected [-], deferred [>], or pending [ ].
license: Apache-2.0 (see LICENSE in project root)
---

# Risks

> An unreviewed risk is an unmanaged risk. This register must be reviewed before dependent work begins.
> High-severity risks with no mitigation or owner must be escalated before implementation proceeds.
>
> **Status codes:** `[ ]` Pending · `[X]` Accepted · `[M]` Mitigated · `[-]` Dismissed · `[>]` Deferred
>
> **Likelihood:** `H` High · `M` Medium · `L` Low
>
> **Severity:** `H` High · `M` Medium · `L` Low
>
> **Risk score** = Likelihood × Severity → `HH` = critical · `HM` / `MH` = significant · `MM` = moderate · anything with `L` = low

---

## Summary

| Total | Pending `[ ]` | Accepted `[X]` | Mitigated `[M]` | Dismissed `[-]` | Deferred `[>]` | Critical `HH` |
| :---: | :-----------: | :------------: | :-------------: | :-------------: | :------------: | :-----------: |
| 5 | 0 | 5 | 0 | 0 | 0 | 0 |

---

## Critical & High Priority

> Risks scored `HH`, `HM`, or `MH`. Must be resolved or have an active mitigation plan before work begins.

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-TC-HA000001 | Custom markdown parser (no library) fails to correctly render edge cases in tables or nested lists, producing broken HTML | M | H | MH | Constrain supported markdown subset strictly to headings, paragraphs, simple tables, unordered/ordered lists, and inline links — no nested structures. Write explicit test cases in the demo. | Fall back to rendering raw text if parser fails | DevAgent | Before Detailed Design |
| `[X]` | R-SC-HA000001 | XSS sanitization gaps in custom markdown renderer allow script injection from a malicious API response into the host page | L | H | LH | Implement explicit allowlist-based sanitization: strip all tags except known-safe ones (`p`, `h1`–`h6`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `strong`, `em`). Review sanitization logic as part of Definition of Done. | Disable markdown rendering and fall back to plain text output | DevAgent | Before Development |

---

## Technical

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-TC-HA000002 | `localStorage` quota exceeded on portals with very long conversation histories, causing silent write failures | L | M | LM | Trim `ha_history` at write time if total serialized size exceeds a safe threshold (e.g., 2MB). Surface a warning to the user if trimming occurs. | Clear oldest turns automatically | DevAgent | Detailed Design |
| `[X]` | R-TC-HA000003 | SSE streaming behaves differently across browsers (EventSource vs fetch+ReadableStream) leading to inconsistent behavior | M | M | MM | Test both SSE modes explicitly in Chrome, Firefox, Safari, and Edge during development. Use `fetch` + `ReadableStream` as primary implementation for broader control. | Fall back to full JSON mode if SSE fails | DevAgent | Development |

---

## Business & Product

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-BP-HA000001 | Bearer token exposed in client-side config file is harvested and used to abuse the integrator's API | M | M | MM | Document clearly in demo and README that integrators must use short-lived, scoped tokens generated server-side. The widget cannot mitigate this beyond HTTPS. | Not applicable — integrator responsibility | DevAgent | Before Release |

---

## External Dependencies & Integrations

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |

## People & Process

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |

## Security & Compliance

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |

---

## Dismissed Risks Log

| ID | Risk | Dismissed by | Date | Rationale |
| :- | :--- | :----------- | :--: | :-------- |

---

## Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| — | Initial risks seeded from Planning phase | 2026-05-15 | SpecGantry |
