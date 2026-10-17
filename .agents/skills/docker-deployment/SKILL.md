---
name: docker-deployment
description: "Create and safely update production Dockerfiles, Docker Compose deployments, installers, and persistent-volume configurations."
---

# Docker Deployment

## When to use

Use for Dockerfiles, Compose, container installs, image upgrades, and deployment scripts. Skip when the change does not touch a containerized deployment.

## Workflow

- Inspect existing `Dockerfile`, Compose files, `.env.example`, networks, bind mounts, named volumes, health checks, and database locations before making edits. Record which objects hold durable data.
- Use small, reproducible images, pinned base versions where practical, `.dockerignore`, a non-root runtime where supported, explicit stop signals, restart policy, and meaningful health checks. Avoid embedding credentials in images or committed Compose files.
- Keep published ports minimal, use environment variables or secrets for credentials, and separate application state from disposable containers. Prefer image digests for rollback-sensitive production updates.
- Provide both install and update procedures. Never remove/recreate persistent volumes, change cryptographic keys, or execute `docker compose down -v` as part of a routine upgrade. If storage mappings change, require a verified backup and a documented migration.
- Review multi-service dependencies and readiness; health checks do not automatically mean dependent applications can use their databases.

## Verification and handoff

- Validate files with `docker compose config` and any available Dockerfile lint/build checks; validate shell scripts with `bash -n` and ShellCheck when installed.
- Test fresh install and upgrade separately, checking that a pre-existing database and uploaded files remain accessible. Document rollback and exact volume paths.
- Distinguish local image builds from images actually published to GHCR or another registry.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
