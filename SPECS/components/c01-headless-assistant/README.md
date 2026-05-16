# C01-HeadlessAssistant — Spec Reading Guide

## Reading Order

1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why; feature inventory and data flows
3. `B_Interfaces.md` — exact contracts to implement (public API, config schema, DOM structure, CSS properties)
4. `C_Operational_Specs.md` — all operational requirements (error handling, UX detail, security, data schemas)

## Authority Rules

- If `A_Core_Spec.md` and `B_Interfaces.md` conflict: `B_Interfaces.md` wins for signatures and contracts; `A_Core_Spec.md` wins for behavior and flow logic.
- If any spec conflicts with `B_Architecture.md`: **stop and raise with DevLead before proceeding.**
- Do not infer missing details — raise as a spec gap.
- If a feature is marked `Revised`, re-read the spec before continuing implementation.

## Key Facts for Developers

- **Single component, single file.** All logic lives in `src/headless-assistant.js`.
- **Zero runtime dependencies.** Do not import or require any external library. ESLint and Prettier are dev-time only.
- **Internal module order** is defined in `A_Core_Spec.md §3`. Follow it — do not reorganize.
- **XSS sanitization is mandatory** on every markdown render path. See `C_Operational_Specs.md §4.1`.
- **localStorage keys** are `ha_history` and `ha_user_id` only. No other keys may be written.
- **Permitted library list** is in `D_Decisions.md` Technology & Libraries section. No library may be used unless `[X]` approved there.

## Spec Version

Last updated: 2026-05-15 | Status: Ready
