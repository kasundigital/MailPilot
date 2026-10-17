---
name: accessibility-audit
description: "Audit and improve web interfaces for WCAG-aligned keyboard use, semantics, contrast, readable forms, and assistive technology."
---

# Accessibility Audit

## When to use

Use for interactive web UI accessibility fixes; pair with frontend-design without replacing the application's visual style.

## Workflow

- Inventory navigation, dialogs, forms, tables, charts, errors, keyboard interactions, and mobile layouts. Choose WCAG 2.2 AA as a target unless the project defines another standard.
- Use semantic HTML, accessible names, proper labels, visible focus, and sufficient color contrast; never rely on color alone for state.
- Ensure tab order, keyboard shortcuts, dialog focus trapping/restoration, escape behavior, skip navigation, and reduced-motion support.
- Announce important asynchronous changes with appropriate live regions without excessive chatter; provide meaningful empty, loading, and error states.
- Preserve existing visual design and business behavior while fixing accessibility gaps; avoid large dependency/framework rewrites for minor fixes.

## Verification and handoff

- Run automated scans where available, plus hands-on keyboard navigation and representative screen-reader checks when tooling exists.
- Verify multiple viewport widths and both themes; record exact WCAG criteria for confirmed findings.
- Do not claim WCAG conformance solely from automated tests.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
