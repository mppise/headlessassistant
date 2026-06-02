---
name: design
description: Unified Design phase (Planning + Detailed Design merged, no intermediate gate). Drives architecture, component specs, and decision management with continuous conversational flow.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Design Skill

**Phase:** Design (Planning + Detailed Design merged)
**Entry:** Project.md finalized OR bug fix (skip Ideation)
**Exit:** Architecture/ finalized + all component specs Ready + Decisions.md Actionable empty + Parking Lot items have mitigations/owners/dates
**Deliverables:** `./SPECS/artifacts/Architecture/` · `./SPECS/components/<component>/` · `./SPECS/artifacts/Decisions.md` · `./STATUS.md` updated to Ready

---

## Startup Checklist

1. Read `./STATUS.md`:
   - Ideation = ✅: Proceed
   - Ideation = ⬜ or 🔄: **BLOCK** — "Run `/ideate` first."
   - Design = 🔄: Resume — continue incomplete specs
   - Design = ✅: **BLOCK** — "Design done. Run `/develop`."
   - Development = 🔄 or ✅: **BLOCK** — "Development already started. Re-spec requires `/design` with explicit confirmation."
2. Verify `./SPECS/artifacts/Project.md` exists and is complete. If missing or incomplete: **BLOCK**.
3. Review Decisions.md Actionable + Parking Lot — escalate any blockers.
4. Confirm with DevLead: which components are in-scope.

---

## Stage 1: Architecture

Interview DevLead across all layers (data, compute, UI, services, integration, AI/LLM). For each decision:
1. Present options + trade-offs.
2. Get DevLead approval.
3. Record in Decisions.md Actionable; move to Actioned after approval.
4. Document incrementally in `./SPECS/artifacts/Architecture/`.
5. Validate consistency with Project.md + prior layers; surface conflicts immediately.

---

## Stage 2: Component Specifications

For each in-scope component:
1. Create `./SPECS/components/<component>/` directory.
2. Create two specs per CLAUDE.md standards:
   - `A_Core_Spec.md` — Include header line `Architecture refs: <file1>, <file2>` listing Architecture/ files relevant to this component. Then features table [Feature ID | Description | Status | Req Ref], behavior, scope, acceptance criteria.
   - `B_Specification.md` — Request/response contracts, error codes, error handling, UX, data, security, compliance, observability, testing thresholds (per CLAUDE.md Testing Requirements), notifications, scalability.
3. Every feature in A_Core_Spec.md must have Feature ID, Status (per CLAUDE.md Feature Status Values), and Req Ref → REQ-NNNN.
4. Record component decisions in Decisions.md (same flow as Stage 1).
5. After each spec, validate:
   - Every REQ-NNNN in Project.md appears in at least one Req Ref
   - All features from Project.md specified
   - Interfaces match Architecture/ and each other
   - Spec structure supports CLAUDE.md Definition of Done
6. Update STATUS.md Component Status → Ready.

---

## Stage 3: Gate Confirm

1. **Archive decisions:** Move ALL rows from Decisions.md "Actioned" table into `_Decisions.md` under a new section at the top: `## [Release: Design Gate] (Design gated: <today's date>)`. Leave Actioned table in Decisions.md empty. Update "Latest gate" line.
2. All in-scope components show Ready in STATUS.md.
3. Decisions.md Actionable table is empty; Parking Lot items have mitigation, owner, and target date.
4. Every REQ-NNNN in Project.md §3.1 appears in at least one component spec Req Ref.
5. Architecture/ mutually agreed — no unresolved architectural questions.
6. Output: "Design ready to gate. Confirm to proceed to `/develop`."

---

## Key Points

- **Decisions.md:** Maintain conversationally. Surface all Actionable + Parking Lot at Stage 1 start. Never ask DevLead to manually edit.
- **Incremental specs:** Drive components one at a time — tight feedback loop between architecture and spec = clearer design faster.
- **Fast-track (bug fix):** Follow same flow for 1 component only; gate is simplified.

---

## Scope

**Creates/modifies:** `./SPECS/artifacts/Architecture/` · `./SPECS/components/<component>/` · `./SPECS/artifacts/Decisions.md` · `./SPECS/artifacts/_Decisions.md` · `./STATUS.md`
**Read-only:** `./SPECS/artifacts/Project.md` · `./src/` (untouched)
**Standards:** CLAUDE.md (feature status, Definition of Done)
