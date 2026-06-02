---
name: ideate
description: Drives the ideation phase from raw idea to a complete, feasibility-validated Project.md — gating entry into the Design phase.
user-invocable: true
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Ideate Skill

**Phase:** Ideation
**Entry:** Raw project idea or feature request
**Exit:** Project.md finalized + mutually agreed upon
**Deliverables:** `./SPECS/artifacts/Project.md` · `./STATUS.md` updated to Ideation: Complete

---

## Startup Checklist

1. Read `./STATUS.md`:
   - Ideation = ⬜: Create Project.md, start Stage 1
   - Ideation = 🔄: Resume Stage 1, continue completing Project.md
   - Ideation = ✅: **BLOCK** — "Ideation complete. Run `/design` next."
   - Design or Development active: Clarify with user — continue current phase or new project?
2. Read `./SPECS/artifacts/Project.md` if it exists — note gaps.

---

## Stage 1: Interview (8 Sections)

Conduct one section at a time. Per section: 1 primary question + max 2 follow-ups (3 questions total). Document confirmed answers directly into Project.md. After each section, validate consistency with prior sections; surface conflicts within that section's question budget.

| # | Section | Captures |
|---|---------|----------|
| S1 | Project Name & Summary | One-sentence what is being built |
| S2 | Problem Statement | Pain point or opportunity; who experiences it |
| S3 | Target Users | Roles, personas, technical level |
| S4 | Goals & Success Criteria | What "done" looks like; measurable outcomes |
| S5 | Scope | Explicitly in-scope and out-of-scope |
| S6 | Key Features | High-level capabilities; assign REQ-NNNN to each |
| S7 | Constraints & Assumptions | Technical, organizational, resource constraints |
| S8 | Open Questions | Anything unresolved before architecture |

**Process:**
1. Ask primary question for S1. Wait for answer.
2. If answer is specific: document in Project.md, advance to next section.
3. If vague: ask one follow-up. If still vague: ask one final follow-up. After 2 follow-ups, document best available answer with `[TBD]` marker and advance.
4. Assign REQ-NNNN IDs to each requirement confirmed in S6 (per CLAUDE.md Requirement Traceability).
5. After S8: proceed to Stage 2.

**Turn budget:** ~24 turns maximum for Stage 1. If budget reached, mark remaining gaps `[TBD]` and proceed.

---

## Stage 2: Stress-Test & Gate Confirm

Validate across four dimensions. Ask targeted questions until resolved.

| Dimension | Check |
|-----------|-------|
| Completeness | All functional + non-functional needs captured? |
| Feasibility | Buildable within stated constraints? |
| Clarity | Would a new team member understand what is being built? |
| Consistency | Do all sections agree? |

Once resolved:
1. Confirm mutual agreement that Project.md is complete and ready for Design.
2. Update `./STATUS.md` Ideation → ✅ Complete.
3. Output: "Ideation ready to gate. Confirm to proceed to `/design`."

---

## Scope

**Creates/modifies:** `./SPECS/artifacts/Project.md`, `./STATUS.md` (at end)
**Read-only:** nothing
**Standards:** CLAUDE.md (global standards)
