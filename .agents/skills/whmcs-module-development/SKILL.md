---
name: whmcs-module-development
description: "Build and test WHMCS provisioning modules, hooks, admin/client pages, billing actions, and 1-Stream API integrations."
---

# Whmcs Module Development

## When to use

Use for WHMCS modules including vendor-neutral WardCybe Tech products and deployment customers; keep module branding separate from customer brands.

## Workflow

- Inspect the deployed WHMCS/PHP versions, module layout, hooks, service lifecycle, admin/client permissions, cron behavior, and the documented upstream API before changing code.
- Implement provisioning idempotently: create, suspend, unsuspend, terminate, password change, and package upgrades must tolerate retries and partial failures without duplicating accounts.
- Store reseller/API credentials in appropriate protected WHMCS settings; never log or display authentication headers or raw secrets. Require HTTPS for upstream endpoints where supported.
- Validate all user and upstream input, encode client/admin output, respect WHMCS CSRF/authorization conventions, and handle API/network errors without granting false success.
- Keep module distribution vendor-neutral under WardCybe Tech; separate commercial license checking and ionCube-protected packaging from development source and deployments.

## Verification and handoff

- Test module install/upgrade, settings validation, product mapping, create/suspend/unsuspend/terminate, renewal, cancellations, retries, and failure recovery in a staging WHMCS instance.
- Confirm remote API actions using a test reseller account and verify database state; do not perform destructive tests on live customers.
- Report WHMCS compatibility version and which upstream operations are validated versus assumed.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
