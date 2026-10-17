---
name: e2e-browser-testing
description: "Create and run end-to-end browser tests for authentication, workflows, form actions, responsive UI, and regressions."
---

# E2e Browser Testing

## When to use

Use when application behavior requires browser verification; favor Playwright if already present or appropriate.

## Workflow

- Read the app's routes, login flow, API contracts, test fixtures, and current browser tooling; use a dedicated test account/database and non-production environment.
- Cover critical user journeys: sign in and sign out, navigation, create/edit/delete, validation, confirmation dialogs, loading/error states, role restrictions, and reload persistence.
- Assert outcomes rather than only button visibility. Use accessible locators and stable test IDs when justified; avoid sleep-based timing and brittle CSS selectors.
- Test at least representative mobile, tablet, and desktop sizes, including 390, 768, 1280, and 1440 px where applicable; verify light/dark modes, overflow, keyboards, and focus.
- Keep tests deterministic: isolate records, control time and external APIs, clean up fixtures, and never send real campaign emails or mutate production services.

## Verification and handoff

- Run focused and full e2e suites where the environment allows, report passed/failed/skipped with browser/device coverage, and attach traces or screenshots when available.
- If no browser can run, mark browser checks unverified rather than substituting static checks.
- Retest the exact regression and neighboring workflows after fixing a UI issue.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
