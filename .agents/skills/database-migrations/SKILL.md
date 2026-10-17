---
name: database-migrations
description: "Design and verify safe SQL schema changes, queries, backups, and database version upgrades for PostgreSQL, MySQL, MariaDB, and SQLite."
---

# Database Migrations

## When to use

Use for migrations, schema modifications, seed data, query performance, and data imports. Do not automatically run production migrations.

## Workflow

- Inspect the existing schema, migration runner, application queries, constraints, indexes, current engine/version, and backup process. Locate all code paths that read or write changed fields.
- Use versioned, ordered migrations with explicit prerequisites and a tested idempotency strategy; do not silently re-run destructive SQL.
- Prefer additive expand/migrate/contract changes when older and newer application versions may coexist. Backfill in bounded batches for large tables.
- Protect users' records: no dropping tables, columns, indexes, or records without an approved migration plan, verified backup, and concrete rollback/recovery path. Treat SQLite file replacement and MariaDB datadir mounts as production data.
- Enforce constraints and transactions where supported, note online DDL limits, and never log secrets or personally identifiable data during migration.

## Verification and handoff

- Test against a representative non-production copy with realistic data, including repeated execution, partial failure, and old-to-new upgrade paths.
- Verify row counts, foreign keys, unique constraints, indexes, and application compatibility. If rollback is not safe, state that clearly and provide restore steps.
- Report engine-specific limitations; never claim a migration is zero downtime without evidence.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
