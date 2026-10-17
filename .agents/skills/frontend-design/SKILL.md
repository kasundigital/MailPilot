---
name: frontend-design
description: Produce distinctive, professional, production-ready website and application UI. Use when designing or refining web pages, dashboards, admin panels, buttons, forms, tables, responsive layouts, or frontend CSS/UX. Preserve existing features and layout constraints unless redesign is requested.
---

# Frontend Design — Production UI Skill

Use this skill when creating a new web interface or polishing an existing interface in HTML/CSS, React, Vue, or a comparable web stack.

## 1. Understand the brief and the existing product

- Identify the app's audience, important user actions, domain and brand personality.
- Inspect existing components, theme variables, design conventions, routes and functionality before modifying code.
- For existing apps, preserve working flows, data structures, navigation and integrations. Do not replace a working UI with a generic template. If asked for CSS improvements only, avoid unrelated code changes.
- Respect explicit reference screenshots and stated layout constraints more than your preferred style.

## 2. Create a deliberate visual direction

Before significant UI coding, define a small design system appropriate to this exact product:

- Palette: 4–6 named colors with hex values, including text, surfaces, borders and a clear accent. Check readable contrast.
- Typography: deliberate font selection, a coherent size/weight hierarchy and legible line lengths.
- Density and grid: content max-width, spacing increments, component heights and responsive breakpoints.
- Shapes: consistent but context-appropriate border radii, dividers and elevation.
- One signature visual detail that suits the domain. Avoid decorative gradients, needless shadows and identical cards everywhere.

Critique the visual direction before implementation: could the same styling be pasted into any unrelated product? If so, make it more specific.

## 3. Build production-quality components

- Buttons: clear primary/secondary/tertiary/danger distinctions; meaningful labels; consistent sizing; hover, focus, active, loading and disabled states.
- Forms: accessible labels, inline validation, hints, clear errors, keyboard interaction and visible success feedback.
- Tables: sensible column alignment, compact but readable row density, wrapping/truncation rules, responsive overflow, sort/filter if relevant, empty and loading states.
- Navigation: obvious selected states, stable layout, reliable sidebar/mobile navigation, breadcrumbs where they help.
- Dashboards: show hierarchy and actionable information rather than filling the screen with repetitive cards.
- Dialogs and menus: predictable dismissal, focus behavior and high-quality contrast.
- Copy: plain language and action-specific verbs. Avoid vague buttons such as 'Submit' when 'Save settings' is clearer.

## 4. Polish and verify

- Build desktop and mobile layouts, handling very narrow screens, long labels and real-world content.
- Preserve keyboard focus indicators, semantic HTML and reduced-motion preferences.
- Avoid needless animation; motion should clarify state and user actions.
- Prefer reusable design tokens and components over ad hoc per-page CSS overrides.
- Check stylesheet specificity and regressions caused by competing selectors.
- When available, run formatting/build/lint/tests and inspect screenshots at representative screen sizes.
- Verify existing routes and interactions still work; never claim a test was run if it was not.

## 5. Report results

Briefly summarize the visual direction, exactly which components/files changed, which checks passed, and any outstanding limitations. Provide preview instructions or screenshots when supported by the environment.

Source inspiration: Anthropic Claude Code frontend-design skill (https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design). This is an independently written adaptation for ChatGPT/Codex workflows, not a verbatim copy.
