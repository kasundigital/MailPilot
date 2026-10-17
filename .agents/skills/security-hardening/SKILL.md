---
name: security-hardening
description: "Review and improve application security across authentication, sessions, permissions, APIs, data handling, and deployment configuration."
---

# Security Hardening

## When to use

Use when reviewing security-sensitive application code or deployment configuration; prioritize exploitable issues over cosmetic refactoring.

## Workflow

- Map trust boundaries, data classifications, roles/tenants, authentication methods, and any public unauthenticated endpoints before changing controls.
- Enforce server-side authorization on every sensitive action; validate input with allowlists, encode output by context, parameterize SQL, and guard against stored/reflected XSS, CSRF, SSRF, path traversal, and unsafe file uploads.
- Use least-privilege service and database accounts; protect tokens, session cookies, webhooks, and cryptographic keys. Never commit credentials, echo secrets to logs, or expose admin endpoints by default.
- Use practical login/session protection: strong password hashing, secure cookie flags, rotation/revocation where appropriate, throttling, and event audit logs without secrets.
- Review third-party libraries, container images, and GitHub Actions permissions. Any breaking permission change needs a migration and test plan.

## Verification and handoff

- Write positive and negative permission tests, including cross-user/cross-tenant access, expired tokens, invalid requests, and malicious HTML payloads.
- Run repository's existing security checks and dependency audits. Record severity, reproducible impact, and exactly what was fixed; avoid claiming an audit proves total security.
- Do not expose vulnerable production endpoints or live secrets in demonstrations.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
