---
name: reverse-engineer
description: Reverse engineers an existing codebase into SpecGantry artifacts and component specifications, bringing a pre-built system into the structured lifecycle framework.
user-invocable: true
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Reverse Engineer Skill

**Phase:** Pre-Ideation (outside normal lifecycle)
**Entry:** Existing codebase needs to be brought into SpecGantry framework
**Exit:** `./SPECS/artifacts/` fully populated with Project.md, Architecture/, component specs, and Decisions.md
**Deliverables:** `./SPECS/artifacts/Project.md` · `./SPECS/artifacts/Architecture/` · `./SPECS/components/<component>/` · `./SPECS/artifacts/Decisions.md` · `./STATUS.md` updated to reverse engineering: Complete

---

## Startup Checklist

1. Scan codebase — identify language(s), frameworks, project layout, existing documentation.
2. Check for existing `./SPECS/` artifacts — enhance and update rather than overwrite accurate content.
3. Runs autonomously — no user input expected during discovery.

---

## Stage 1: Discover & Document

Deep-dive into codebase and available documentation. Populate incrementally:

1. Analyze source code structure, entry points, data flow.
2. Write `Project.md` — problem statement, goals, scope, key features.
3. Map architecture across all layers (data, compute, integration, deployment). Write `Architecture/` incrementally.
4. Record inferred decisions and risks in `Decisions.md`.
5. Validate each artifact section against source code. Flag undocumented behaviors immediately.

---

## Stage 2: Component Specs & Validation

For each functional component (prefer fewer, larger components over many small ones):

1. Create `./SPECS/components/<component-name>/` directory.
2. Create two specs per CLAUDE.md standards:
   - `A_Core_Spec.md` — Header line `Architecture refs: <file1>, <file2>`. Features table with Status (per CLAUDE.md Feature Status Values) and discovered behavior.
   - `B_Specification.md` — Request/response contracts as implemented, operational requirements as discovered (error handling, observability, data, security, testing thresholds).
3. After each spec, validate:

| Dimension | Check |
|-----------|-------|
| Consistency | Component interfaces match Architecture/? |
| Completeness | All source code behaviors documented? |
| Risk | Technical debts, security gaps, fragile dependencies? |
| Traceability | Requirements inferred from code documented as REQ-NNNN? |

4. Surface findings as notes in Decisions.md.

---

## Stage 3: Gate Confirm

1. Present artifacts produced (Project.md, Architecture/, components, Decisions.md).
2. Surface recommendations from inline validation (advisory — DevLead decides which to act on).
3. Confirm mutual agreement that reverse engineering is complete.
4. Update `./STATUS.md` → reverse engineering: Complete.
5. Output: "Reverse engineering complete, ready for Ideation."

---

## Scope

**Creates/modifies:** `./SPECS/artifacts/Project.md` · `./SPECS/artifacts/Architecture/` · `./SPECS/artifacts/Decisions.md` · `./SPECS/components/`
**Read-only:** All source code (no code created or modified)
**Standards:** CLAUDE.md (global standards)
