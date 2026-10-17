---
name: backup-disaster-recovery
description: "Plan and verify application/database backups, off-host retention, restoration drills, and disaster recovery."
---

# Backup Disaster Recovery

## When to use

Use for backup/restore design, migrations, outages, large volumes, and disaster-recovery reviews.

## Workflow

- Inventory authoritative data: database files, object/media storage, volumes, secrets, keys, certificates, config, repositories, and external integration state.
- Define RPO, RTO, retention, encryption, access control, off-site/off-host copy, and monitoring for backup failures; a backup stored only beside its source is insufficient.
- Create consistent backups with application-aware database snapshots/dumps or quiescence; don't copy live database files unsafely and assume consistency.
- Protect backup credentials and encryption keys separately; document dependency order and restoration of users, permissions, DNS/proxies, volumes, and service settings.
- For RAID/SnapRAID/mergerfs, explicitly separate parity, availability, and independent backups. Never call parity protection a backup or overwrite data during an unverified recovery.

## Verification and handoff

- Run a restore drill in an isolated environment and check data integrity, row counts, service start, credentials, and representative user workflows.
- Prove alerts fire for missed/failed backups and expired/invalid archives; log last verified restore date.
- Document step-by-step restore and rollback paths, including limits of what the backup does not protect.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
