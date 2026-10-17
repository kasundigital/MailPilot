---
name: linux-server-operations
description: "Troubleshoot and maintain Linux hosts, systemd services, networking, Nginx/Caddy, containers, and storage safely."
---

# Linux Server Operations

## When to use

Use for Ubuntu/Debian administration and customer server work; never assume which host the user intends.

## Workflow

- Before commands, identify the exact host/client, OS/version, shell privileges, critical services, storage topology, and change window. Ask which host when multiple client systems are possible.
- Prefer read-only inspection first (`hostname`, `lsblk`, `findmnt`, `systemctl status`, `journalctl`, `ss`, configuration previews) and preserve command output for diagnosis.
- Keep commands scoped, idempotent, and minimally disruptive. State side effects for service restarts, network changes, firewall rules, disk operations, and package upgrades.
- Never format disks, wipe filesystems, run destructive rsync flags, overwrite RAID/SnapRAID parity, or rebuild arrays based only on assumed device names. Validate UUID/serial/mountpoint against current output.
- For SSH/network changes, preserve a fallback session and test before making rules persistent; back up configs before edits.

## Verification and handoff

- Confirm service health, ports, logs, permissions, firewall routes, mountpoints, and application checks after changes.
- Give copy/pasteable commands for the confirmed host, separate diagnostic from modifying commands, and include rollback where feasible.
- State when a change requires a maintenance window or physical access.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
