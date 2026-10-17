---
name: license-subscription-management
description: "Design secure multi-product license issuance, one-time purchases, subscriptions, renewals, entitlements, and offline validation."
---

# License Subscription Management

## When to use

Use for WardCybe Tech licensing backends or other owned products; adapt names, plans, and policies to each product.

## Workflow

- Model products, editions, pricing models, purchases, subscriptions, license keys, activations, seats/devices, feature entitlements, renewals, refunds, cancellations, and audit events separately.
- Use opaque high-entropy license identifiers, salted or keyed server-side lookup, and signed offline entitlements where appropriate. Never trust the client to assert its plan or expiration.
- Make webhook handling authenticated, replay-safe, idempotent, and auditable. Do not grant entitlements merely because a checkout page returned successfully.
- Define explicit states for trial, active, grace, expired, suspended, revoked, and refunded. Support clock skew, offline grace, device migration, and transparent renewal policies.
- Isolate customer/tenant data, role-gate manual license edits, and document key rotation, signing-key storage, and server-side revocation.

## Verification and handoff

- Test one-time and recurring purchases, duplicate/out-of-order webhooks, upgrades/downgrades, refunds, renewal failures, over-activation, and offline validation.
- Verify clients cannot forge signatures or request another tenant's licenses. Do not store private signing keys in distributed applications.
- Document safe migration from legacy licensing systems and production backup/restore.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
