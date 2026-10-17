---
name: n8n-workflow-engineering
description: "Design, test, and operate reliable n8n workflows, webhooks, Telegram bots, document parsing, and SQL automation."
---

# N8n Workflow Engineering

## When to use

Use for n8n workflow JSON, credential handling, database nodes, Telegram menu logic, and scheduled automations.

## Workflow

- Diagram trigger, node paths, credentials, queues, input schema, outputs, and data stores before editing. Confirm timezone and production-versus-test webhook behavior.
- Design for duplicate messages and retries with stable correlation IDs, idempotent UPSERTs, explicit error branches, and durable state for multistep conversations.
- Parameterize SQL, validate webhook authenticity where supported, scope credentials, and never export decrypted n8n credentials into Git.
- Keep workflow JSON importable across deployments; document required credential types, environment variables, schema tables, and Docker network/database connectivity.
- For Telegram bots, handle update_id/chat_id correctly, missing callback data, reset/cancel, keyboard transitions, and retries; for PDFs, verify encoding/fonts and rendered content.

## Verification and handoff

- Test with synthetic and malformed payloads, duplicate triggers, timeouts, missing tables, and credential failures. Verify both active and test-trigger modes.
- Check executions, logs, and expected database rows rather than treating a successful node as successful end-to-end delivery.
- Provide import, migration, recovery, and rollback instructions without exposing real tokens.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
