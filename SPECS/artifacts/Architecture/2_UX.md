---
name: b-architecture-ux
description: User experience design — interface surfaces, key user flows, and mandatory lenses for HeadlessAssistant.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# User Experience

> **Audience:** Frontend · Design · Product
> 📐 **Mobile-first, Cloud-first, and AI-first** are mandatory lenses. State applicability for each.

---

## 1. Interface Surfaces

- [x] Conversational / chat interface (primary)
- [x] Floating widget (bubble + panel — default mode)
- [x] Inline embed (mounts in integrator-designated container)
- [ ] Web app (SPA / SSR / static)
- [ ] Mobile app (iOS / Android / React Native / PWA)
- [ ] CLI
- [ ] Dashboard / admin panel
- [ ] Notification surface (email, push, SMS)

---

## 2. Key User Flows

| Flow | Entry point | Success exit | Owner component |
| :--- | :---------- | :----------- | :-------------- |
| Send Message | User types in input and presses Enter or Send button | Response rendered in chat panel; turn appended to history | C01 |
| Session Resume | Page load when `ha_history` exists in localStorage | Previous conversation restored from localStorage and displayed | C01 |
| Clear History | User clicks trash icon in header | localStorage cleared; chat panel resets; new UUID issued | C01 |
| Close / Minimize | User clicks close button | Floating: panel collapses to bubble. Inline: widget hidden (`display:none`) | C01 |
| Error & Retry | API error or stream interruption occurs | Toast shown with retry button; partial content preserved (stream errors); history not modified | C01 |
| Greeting (fresh session) | First visit, no history | Personalized greeting rendered (`user_name` if set, generic otherwise) | C01 |

---

## 3. Mandatory Lenses

| Lens | Applicable? | Rationale / constraint |
| :--- | :---------- | :--------------------- |
| Mobile-first | N | Primary integration target is desktop portals; mobile is not in scope for MVP |
| Cloud-first | N | Client-side bundle; no server components in C01 |
| AI-first | N | Widget is AI-agnostic; routes to integrator's AI API |

---

## 4. Accessibility

The widget implements ARIA roles and live regions throughout:
- `.ha-messages` — `role="log"` + `aria-live="polite"` (scrolling conversation)
- `.ha-panel` — `role="dialog"` with `aria-label` from `theme.header_title`
- `.ha-toast` — `role="alert"` + `aria-live="assertive"` (error notification)
- Floating bubble — `role="button"` + `aria-label="Open assistant"` + `tabindex="0"`
- Focus trap in panel (Tab cycle within focusable elements) in floating mode
- All buttons have `aria-label` attributes

> 🔽 **Deferred to Detailed Design:** Responsive breakpoints, WCAG compliance level, per-flow step-by-step UX — resolved in `./SPECS/components/c01-headless-assistant/`.
