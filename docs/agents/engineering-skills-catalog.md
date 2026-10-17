# Additional engineering skills

This folder contains 17 optional, task-specific engineering skills added to the existing 28 skills in `.agents/skills/`. Existing skill files and the repository's `AGENTS.md` are not modified.

## Core production skills

- [docker-deployment](../../.agents/skills/docker-deployment/SKILL.md) — Create and safely update production Dockerfiles, Docker Compose deployments, installers, and persistent-volume configurations.
- [database-migrations](../../.agents/skills/database-migrations/SKILL.md) — Design and verify safe SQL schema changes, queries, backups, and database version upgrades for PostgreSQL, MySQL, MariaDB, and SQLite.
- [security-hardening](../../.agents/skills/security-hardening/SKILL.md) — Review and improve application security across authentication, sessions, permissions, APIs, data handling, and deployment configuration.
- [github-actions-ci-cd](../../.agents/skills/github-actions-ci-cd/SKILL.md) — Build secure GitHub Actions pipelines for linting, tests, Docker publishing, release artifacts, and deployments.
- [release-versioning](../../.agents/skills/release-versioning/SKILL.md) — Manage semantic versions, changelogs, immutable GitHub releases, Docker tags, updater metadata, and rollback documentation.
- [e2e-browser-testing](../../.agents/skills/e2e-browser-testing/SKILL.md) — Create and run end-to-end browser tests for authentication, workflows, form actions, responsive UI, and regressions.

## Platform and operations skills

- [api-design-integration](../../.agents/skills/api-design-integration/SKILL.md) — Design robust internal and third-party HTTP APIs, webhook integrations, pagination, retries, and backward-compatible contracts.
- [observability-monitoring](../../.agents/skills/observability-monitoring/SKILL.md) — Implement actionable metrics, health checks, structured logging, tracing, and alerting for server and SaaS operations.
- [license-subscription-management](../../.agents/skills/license-subscription-management/SKILL.md) — Design secure multi-product license issuance, one-time purchases, subscriptions, renewals, entitlements, and offline validation.
- [whmcs-module-development](../../.agents/skills/whmcs-module-development/SKILL.md) — Build and test WHMCS provisioning modules, hooks, admin/client pages, billing actions, and 1-Stream API integrations.
- [n8n-workflow-engineering](../../.agents/skills/n8n-workflow-engineering/SKILL.md) — Design, test, and operate reliable n8n workflows, webhooks, Telegram bots, document parsing, and SQL automation.
- [linux-server-operations](../../.agents/skills/linux-server-operations/SKILL.md) — Troubleshoot and maintain Linux hosts, systemd services, networking, Nginx/Caddy, containers, and storage safely.
- [backup-disaster-recovery](../../.agents/skills/backup-disaster-recovery/SKILL.md) — Plan and verify application/database backups, off-host retention, restoration drills, and disaster recovery.
- [go-agent-development](../../.agents/skills/go-agent-development/SKILL.md) — Build reliable cross-platform Go agents, installers, background services, telemetry collectors, and update mechanisms.

## Quality and collaboration skills

- [accessibility-audit](../../.agents/skills/accessibility-audit/SKILL.md) — Audit and improve web interfaces for WCAG-aligned keyboard use, semantics, contrast, readable forms, and assistive technology.
- [performance-optimization](../../.agents/skills/performance-optimization/SKILL.md) — Diagnose and improve backend, database, frontend, and container performance without breaking correctness.
- [pr-conflict-resolution](../../.agents/skills/pr-conflict-resolution/SKILL.md) — Resolve GitHub pull-request merge conflicts safely against current main, preserving code changes and validating CI before merge.

All of these are original, project-neutral guidance and should be used only for relevant tasks. They do not replace specific instructions in `AGENTS.md`, `CLAUDE.md`, or existing skills. Installing a skill does not guarantee every AI coding tool will discover or execute it; the agent must support the skill location and its runtime capabilities.

**Safety:** Don't automatically run production migrations, destroy Docker volumes, overwrite RAID members, deploy unreviewed images, or merge PRs based solely on a skill's presence.
