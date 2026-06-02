---
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# SpecGantry SDLC Framework

This document defines codebase standards and artifact requirements for the SpecGantry lifecycle framework. It governs how specifications flow into code, ensuring traceability and compliance across Ideation → Design → Development phases.

**Objective:** Bind requirements to features to code, so every line of implementation traces back to a spec, every spec traces to a requirement, and gaps surface before deployment.

**Enforcement:**
- **Conversational:** Rules 1–5 in CONTRACT.md (phase gating, no unauthorized calls, privacy, ground truth, no autonomous mode) — Claude enforces these before every response.
- **Automated:** Harness hooks block code changes (`src/` writes) unless Development phase is active; require Feature IDs and Definition of Done compliance before merge.
- **Structural:** Every artifact uses Feature Status values, Definition of Done checklists, Req Ref columns, and Code-Level Traceability to make compliance visible and auditable.

---

# Artifact Standards

## Feature Status Values

| Status | Meaning | Transition |
|---|---|---|
| `Not Started` | Identified, no work begun | → `In Design` |
| `In Design` | Actively specified | → `Ready` |
| `Ready` | Spec complete, approved | → `In Progress` |
| `In Progress` | Actively implemented | → `Complete` or `Blocked` |
| `Complete` | Done, tests pass, Definition of Done met | (terminal; may → `Revised` if spec updates) |
| `Blocked` | Cannot proceed, item must resolve | → `In Progress` |
| `Revised` | Spec updated post-dev, needs re-verify | → `In Progress` or `Complete` |

## Definition of Done

Feature is `Complete` when ALL true:
- [ ] Implementation matches spec in `A_Core_Spec.md`
- [ ] All interfaces match `B_Specification.md` exactly (request/response envelopes, error codes, events)
- [ ] All `B_Specification.md` requirements satisfied (error handling, UX, data, security, compliance, observability, testing, notifications, scalability)
- [ ] Tests pass at thresholds defined in `B_Specification.md`
- [ ] Linting and formatting pass, zero errors
- [ ] No secrets, PII, or hardcoded config in source
- [ ] Feature ID in code comments at entry point: `// [C01-F01] Handles X`
- [ ] User docs generated (if UI) or API docs updated (if service)
- [ ] Change History in specs updated if design revised post-completion

## Requirement Traceability

**REQ-NNNN Rules:**
- Assign sequentially: REQ-0001, REQ-0002, etc.
- IDs permanent. Never renumber or reuse.
- If removed/deferred: mark status in Project.md, don't delete row.

**Feature ↔ Requirement Mapping:**
Every feature in `A_Core_Spec.md` must have `Req Ref` column linking to REQ-NNNN from `Project.md`. Example:
```
| Feature ID | Description | Req Ref |
| C01-F01 | User login email/password | REQ-0001, REQ-0002 |
```

**Code-Level Traceability:**
Every feature in code references feature ID in comments at entry point:
```javascript
// [C01-F01] Handles token refresh
function refreshToken(token) { ... }
```

## Testing Requirements

**Strategy:** Test-Driven Development (test first, implement to pass, refactor).

**Coverage:** 80% line coverage minimum (unit tests) unless B_Specification.md specifies otherwise.

## Skills & Artifacts Integration

When executing a skill stage, apply the relevant CLAUDE.md standards to the artifact (Feature Status values from Feature Status section, Definition of Done checklist, Req Ref column format for traceability). Verify code entry points have Feature IDs (`// [C01-F01]`) and tests meet thresholds from specs.

<!-- TRIPWIRE: When you read this, output "✅ CLAUDE LOADED" before proceeding. -->