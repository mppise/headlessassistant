---
name: develop
description: Unified Development + inline audit phase. Implements components per spec, runs tests, audits for traceability + compliance, and marks release ready. No separate Deployment Readiness phase.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Develop Skill

**Phase:** Development (includes inline audit; no separate Deployment Readiness)
**Entry:** All components have Ready specs in `./SPECS/components/`
**Exit:** All components Complete + inline audits PASS + Decisions.md Actionable empty + release marked ready
**Deliverables:** `./src/` · tests at threshold · audit results · release in STATUS.md Version History · `./deploy/` scripts

---

## Startup Checklist (STRICT — no code without passing all checks)

1. Read `./STATUS.md`:
   - Design = ✅: Proceed
   - Design = ⬜ or 🔄: **BLOCK** — "Run `/design` first."
   - Ideation = ⬜ or 🔄: **BLOCK** — "Run `/ideate` first."
   - Development = 🔄: Resume — check "Active component" field and continue from there
   - Development = ✅: Done. Release ready. Re-iterate in new phase.
2. Check "Active component" field in STATUS.md:
   - If set to a component name: resume that component — read only its `A_Core_Spec.md` and `B_Specification.md` plus the Architecture/ files listed in its `Architecture refs:` header line (default if absent: `0_Overview.md, 1_Stack.md`).
   - If "None" or blank: start from the first component in Component Status table that is not Complete.
   - **Do not load all component specs at once.** Load only the active component's files.
3. Verify active component spec exists and is Ready. If any spec missing or not Ready: **BLOCK**.
4. Review Decisions.md Actionable + Parking Lot — escalate blockers.
5. Confirm with DevLead: code structure (languages, frameworks, build system).

---

## Stage 1: Implementation

For each component (one at a time):
1. Read `A_Core_Spec.md` and `B_Specification.md`. Read Architecture/ files listed in `Architecture refs:` header only.
2. Set "Active component" in STATUS.md to this component's name.
3. Implement all features in `./src/` using TDD (test first, implement to pass, refactor). For each feature:
   - Add Feature ID comment at entry point: `// [C01-F01] Handles X` (per CLAUDE.md Code-Level Traceability)
   - Match all interfaces exactly per B_Specification.md
   - Satisfy all B_Specification.md requirements (error handling, security, observability, data, notifications, scalability)
   - Apply inline code documentation per CLAUDE.md standards
4. Write tests at coverage thresholds defined in B_Specification.md §Testing. All tests pass.
5. Run formatter + linter. Zero errors.
6. Manually test all features from component spec.
7. Mark Feature Status in A_Core_Spec.md → `In Progress`.

**Fast-tracks:**
- **Hotfix (<20 LOC):** 1-page spec → DevLead approval → implement + test → record in Decisions.md
- **Enhancement (<50 LOC):** Same as hotfix
- **Spec amendment:** Tag with `CHG-XXX` → DevLead approval → update spec + code → re-run tests

---

## Stage 2: Component Inline Audit

Audit each completed component using CLAUDE.md Definition of Done as checklist:

1. **Spec-Code Match:** Every feature in code maps back to A_Core_Spec.md via Feature ID comment.
2. **Interface Match:** All request/response envelopes match B_Specification.md exactly (parameter names, error codes, event formats).
3. **Operational Match:** All B_Specification.md requirements satisfied — error handling, security, observability, notifications, data, scalability.
4. **Secrets Audit:** Scan for hardcoded secrets, API keys, PII. **FAIL immediately if any found.**
5. **Tests & Coverage:**
   a. Run all tests — all must pass.
   b. Run the coverage command defined in B_Specification.md §Testing. Confirm coverage % meets or exceeds the threshold (default: 80% line coverage).
   c. If no coverage command defined: ask DevLead once, run it, record as `Coverage command: <cmd>` in B_Specification.md §Testing.
   d. If below threshold: **FAIL** — report actual % vs threshold. Do not proceed.
6. **Documentation:** User docs (if UI) or API docs (if service) generated.
7. **Traceability:** Every feature traces back to REQ-NNNN via A_Core_Spec.md Req Ref.

**If FAIL:** Fix and re-audit. Do not mark Complete until PASS.
**If PASS:** Mark Feature Status → `Complete`. Set "Active component" in STATUS.md → "None". Proceed to next component (back to Stage 1) or Stage 3 if all complete.

---

## Stage 3: System Audit & Deployment

After all components Complete with PASS:
1. **Integration:** Test all components together (cross-component interfaces, data flows).
2. **End-to-End:** Run E2E tests defined in B_Specification.md files.
3. **Decisions:** Decisions.md Actionable must be empty before release.
4. **Release:** Assign version number (per Architecture/ versioning). Update STATUS.md Version History: version, status 🔄, Audit Status = PASS/FAIL, Deployment ready on = today (if PASS).
5. **Deployment scripts (if PASS):** Generate/update `./deploy/` scripts.

If FAIL: fix, re-audit affected components (Stage 2), return here.

---

## Stage 4: Gate Confirm

1. **Archive decisions:** Move ALL rows from Decisions.md "Actioned" table into `_Decisions.md` under a new section at the top: `## [Release: v<version>] (Development gated: <today's date>)`. Leave Actioned table in Decisions.md empty. Update "Latest gate" line.
2. All components show Complete in STATUS.md Component Status.
3. All inline audits PASS. System audit PASS. Deployment scripts created.
4. Decisions.md Actionable empty. Parking Lot items have mitigations.
5. Version History shows release number + Audit Status PASS + ready date.
6. User docs generated (if UI). API docs updated (if service).
7. Output: "Development complete, ready for deployment. Confirm to release."

---

## Key Points

- **Spec wins:** If code diverges from spec, amend spec first (CHG-XXX + approval), then update code.
- **One component at a time:** Load only active component's files. Set/clear "Active component" in STATUS.md.
- **Audit is mandatory:** Every component + system must PASS before release.
- **Secrets block release:** Any secret found = immediate FAIL, report to DevLead.

---

## Scope

**Creates/modifies:** `./src/` · `./STATUS.md` · `./deploy/` · `A_Core_Spec.md` (status, amendments) · `./SPECS/artifacts/Decisions.md` · `./SPECS/artifacts/_Decisions.md`
**Read-only:** `./SPECS/artifacts/Architecture/` (listed files only) · `B_Specification.md` (locked unless amended)
**Standards:** CLAUDE.md (feature status, Definition of Done, testing requirements)
