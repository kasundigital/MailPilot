---
name: api-design-integration
description: "Design robust internal and third-party HTTP APIs, webhook integrations, pagination, retries, and backward-compatible contracts."
---

# Api Design Integration

## When to use

Use for REST APIs, agents, integrations, external connectors, and asynchronous callbacks.

## Workflow

- Inventory endpoints, auth methods, request/response schemas, error codes, rate limits, webhook signing, client versions, and existing consumers.
- Use validated schemas, consistent error envelopes, appropriate HTTP status codes, pagination limits/cursors, and explicit request timeouts.
- Implement bounded exponential retry with jitter only for safe/idempotent operations. Use idempotency keys for mutation retries and queues/webhooks where needed.
- Treat third-party responses as untrusted; verify webhook signatures and replay windows, redact secrets, and constrain outbound URLs against SSRF.
- Document versioning and compatibility. Do not break existing clients/agents without a staged migration and deprecation plan.

## Verification and handoff

- Add contract tests for success, invalid input, unauthorized access, rate limits, timeouts, partial responses, retries, and duplicate delivery.
- Test integrations with controlled fixtures or sandboxes; distinguish mocked tests from live endpoint verification.
- Report request and response examples with secrets and personal data removed.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
