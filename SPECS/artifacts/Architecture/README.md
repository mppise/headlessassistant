---
name: b-architecture-index
description: Architecture documentation index and navigation guide
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Architecture Index

This directory contains the complete system architecture specification, broken into domain-specific files for easier navigation, updates, and stakeholder focus.

## Design Principle

**Split artifacts by coherence and audience segmentation.** Architecture is fragmented across 9 domains (UX ≠ Security ≠ Observability) with distinct audiences; splitting enables selective reading and independent updates. Project (Project.md) remains monolithic because stakeholders read end-to-end once. Decisions (Decisions.md) remains monolithic because it's a live operational register, not a reference doc — fragmentation would break gate checking.

## How to Read This

Architecture decisions are **cross-cutting constraints** that every component must respect. During Detailed Design, component specifications in `./SPECS/components/<component>/` detail what falls into their ownership within these boundaries.

---

## Files

| File | Audience | Content |
|------|----------|---------|
| **[0_Overview.md](./0_Overview.md)** | Everyone | System blueprint, functional components, key architecture decisions |
| **[1_Stack.md](./1_Stack.md)** | Engineers, DevOps | Technical stack, AI technologies, deployment topology |
| **[2_UX.md](./2_UX.md)** | Frontend, Design, Product | Interface surfaces, user flows, mandatory UX lenses |
| **[3_Data.md](./3_Data.md)** | Backend, Data | Data architecture, storage strategy, entity relationships |
| **[4_API.md](./4_API.md)** | Backend, Frontend, Integrators | API patterns, versioning strategy, interface contracts |
| **[5_Security.md](./5_Security.md)** | Security, Legal, Backend | Authentication, authorization, encryption, compliance obligations |
| **[6_Resilience.md](./6_Resilience.md)** | Backend, SRE | Error handling patterns, failure classification, retry strategies |
| **[7_Observability.md](./7_Observability.md)** | SRE, Engineers | Logging, tracing, analytics, SLO targets |
| **[8_Scalability.md](./8_Scalability.md)** | Backend, SRE, Architecture | Load profile, scaling model, bottleneck mitigation |
| **[9_Directory_Structure.md](./9_Directory_Structure.md)** | All Engineers | Source code tree layout, file organization, component ownership, enforcement rules |

---

## Reading Paths by Role

**Product Manager / Business Analyst:**
- Start with [0_Overview.md](./0_Overview.md) (System Blueprint + Component Map)
- Reference [2_UX.md](./2_UX.md) for user-facing capabilities
- Check [5_Security.md](./5_Security.md) for compliance constraints

**Backend Engineer:**
- Start with [0_Overview.md](./0_Overview.md) (System Blueprint)
- Read [1_Stack.md](./1_Stack.md) (Tech Stack) and [9_Directory_Structure.md](./9_Directory_Structure.md) (file organization)
- Deep dive: [3_Data.md](./3_Data.md), [4_API.md](./4_API.md), [6_Resilience.md](./6_Resilience.md)
- Reference [7_Observability.md](./7_Observability.md) for logging/tracing requirements

**Frontend Engineer:**
- Start with [0_Overview.md](./0_Overview.md) (System Blueprint)
- Read [2_UX.md](./2_UX.md) for interface surfaces and flows and [9_Directory_Structure.md](./9_Directory_Structure.md) (file organization)
- Reference [4_API.md](./4_API.md) for backend contracts
- Check [7_Observability.md](./7_Observability.md) for analytics events

**SRE / DevOps:**
- Start with [0_Overview.md](./0_Overview.md) (System Blueprint)
- Read [1_Stack.md](./1_Stack.md) (Deployment Topology)
- Reference [6_Resilience.md](./6_Resilience.md) (Error handling, retry strategies)
- Deep dive: [7_Observability.md](./7_Observability.md), [8_Scalability.md](./8_Scalability.md)

**Security Lead:**
- Read [5_Security.md](./5_Security.md) (Auth, Encryption, Compliance)
- Reference [7_Observability.md](./7_Observability.md) (Audit logging)
- Check [3_Data.md](./3_Data.md) (Data ownership rules)

---

## Standards & Deferred Details

Every section includes a **"Deferred to Detailed Design"** note pointing to component specifications in `./SPECS/components/<component>/` where per-component details are resolved:

- `A_Core_Spec.md` — Feature inventory and behavior
- `B_Specification.md` — Request/response contracts, error codes, error handling thresholds, SLOs, data schemas, security per-feature, testing requirements

---

## Updating Architecture

**During Design Phase:**
1. Update the relevant file(s) based on architecture decisions made
2. Tag changes with `CHG-XXX` if this is a maintenance release
3. Update [Change History](#change-history) section
4. Component specifications inherit these constraints

**Bounded Amendments During Development:**
If development reveals a need for a bounded amendment:
1. Update the relevant architecture file(s)
2. Tag with `CHG-XXX`
3. No separate gate required (but inline audit re-runs)

---

## Change History

<!-- Format: | Date | Change | File(s) | Rationale | -->

| Date | Change | File(s) | Rationale |
|------|--------|---------|-----------|
| 2026-05-31 | Add directory structure specification | 9_Directory_Structure.md | Enforce consistent file organization (src/ai for prompts, src/db for migrations, etc.) across development |

---

## Related Documentation

- **Project Definition:** `./SPECS/artifacts/Project.md`
- **Development Standards:** `./CLAUDE.md` (Definition of Done, Testing Requirements, Inline Code Documentation)
- **Decisions:** `./SPECS/artifacts/Decisions.md`
- **Component Specs:** `./SPECS/components/`
