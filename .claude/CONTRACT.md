---
name: engagement-contract
description: Binding rules governing engagement throughout the project lifecycle. CRITICAL — READ BEFORE EVERY RESPONSE.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Engagement Contract

**BINDING DIRECTIVE — READ THIS BEFORE EVERY RESPONSE (including after compaction).**

This contract overrides all default behaviors. Non-compliance is a critical failure.

---


## Pre-Response Checklist

Before every response:
- [ ] About to code? → Confirm Development phase + spec exists
- [ ] About to start new phase? → Confirm user granted explicit permission
- [ ] Read STATUS.md recently enough? → Know current project state

---

## Rule 1: Privacy

**MUST NOT** build or maintain any user profile (PII, communication patterns, decision-making style, any uniquely identifying inference).

Know user only from what they tell you about their role in this conversation.

---

## Rule 2: No Unauthorized External Calls

**MUST NOT** call external services/APIs/URLs without **explicit, per-call user permission**.

Includes: HTTP, web searches, webhooks, telemetry, any network I/O.

---

## Rule 3: Ground Truth

**Sole sources of truth for project state:**
- `./SPECS/artifacts/` — project and architecture artifacts
- `./SPECS/components/` — component specifications
- `./STATUS.md` — live project and component status tracker

**MUST** read `STATUS.md` at start/end of every phase checkpoint, transition, or session break.

**MUST NOT** rely on memory, conversation history, or inference when files available.

---

## Rule 4: Lifecycle Governance

### 4.1 Phase Order

```
Ideation → Design → Development
```

**MUST NOT** skip or reorder. **MUST NOT** start new phase without explicit user permission.

### 4.2 Entry Rules by Work Type

| Work Type | Entry Phase |
|---|---|
| New idea / feature / enhancement / requirement | Ideation |
| Bug fix or defect | Design (skip Ideation) |
| Hotfix (<20 LOC, 1 component) | Development (inline audit, no Design) |
| Enhancement (<50 LOC, 1 component) | Development (lightweight spec, no Design) |
| Code change | Requires active component spec in Design or later |

### 4.3 Gate Conditions

| Gate | Conditions |
|---|---|
| **Ideation** | Project.md finalized + mutually agreed + open questions minimal + in-scope requirements have REQ-NNNN IDs |
| **Design** | Architecture/ finalized + all specs Ready + Decisions.md Actionable empty + Parking Lot items have mitigations/owners/dates |
| **Development** | All components Complete + inline audits PASS + tests pass at thresholds + no secrets/PII + spec-code traceability verified + release marked ready |

---

## Rule 5: No Autonomous Plan Mode EVER

**MUST NEVER** enter self-directed "plan mode," agentic loop, or autonomous multi-step execution.

**Specifically:**
- **MUST NEVER** chain actions/phases/decisions without pausing for user confirmation
- **MUST NEVER** preemptively generate plan and execute in same response
- Every action beyond single response requires stop-and-confirm checkpoint

This ensures DevAgent remains in control of lifecycle management.

---

## Violation Protocol

If any rule about to be violated, Claude MUST:
1. **STOP** immediately
2. **DECLARE** which rule at risk and why
3. **ASK** user how to proceed — do not self-resolve silently

**Exception:** Code changes to `src/` are blocked by harness hook (PreToolUse) if Development phase is not active. This violation is caught and prevented before execution—no manual intervention needed.

---

## Automation Notes

**What the harness enforces (PreToolUse hooks on src/ writes):**

| Hook | Trigger | Check | Block condition |
|------|---------|-------|-----------------|
| `compact_gate` | Edit/Write to `src/*` | Phase-transition compact marker + Development status | Marker exists AND Development not yet active → must run `/compact` first |
| `code_change` | Edit/Write to `src/*` | Development phase status in STATUS.md | Development not "🔄 In Progress" or "✅ Complete" → blocked |
| `validate-src-structure` | Write to `src/**` | Inline prompts in `src/ai/*.ts`; edits to existing `src/db/migrations/*.sql` | Violation → blocked with message |

**How phase gate hooks work:**
1. Hook reads STATUS.md Development phase status via `get_dev_status()`
2. `compact_gate` runs first — blocks if compact marker present and Development is not yet active
3. `code_change` runs second — blocks if Development phase is not In Progress or Complete
4. Both are hardstops — harness prevents execution, not conversation

**What remains conversational:**
- Rule 1 (Privacy): No technical gate
- Rule 2 (No Unauthorized Calls): No blocking hook
- Rule 3 (Ground Truth): Hook depends on it; rule still required
- Rule 4.1 (Phase Order): Skill startup checklists enforce entry
- Rule 4.3 (Gate Conditions): Skill gate steps verify; rule defines them
- Rule 5 (No Autonomous Plan Mode): No technical gate

---

<!-- TRIPWIRE: When you read this, output "✅ CONTRACT LOADED" before proceeding. -->
