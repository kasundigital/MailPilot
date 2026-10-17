---
name: release-versioning
description: "Manage semantic versions, changelogs, immutable GitHub releases, Docker tags, updater metadata, and rollback documentation."
---

# Release Versioning

## When to use

Use when preparing, repairing, or auditing application releases and update mechanisms.

## Workflow

- Identify the canonical version source, tags, published artifacts, release workflow, compatibility rules, updater URLs, and API/agent minimum versions.
- Choose SemVer increments according to actual compatibility; keep package metadata, UI version, build info, release tag, Docker tag, and update manifest consistent.
- Generate user-facing changelog entries from merged changes and verified features, not aspirational PR descriptions.
- Publish immutable release artifacts with checksums; do not overwrite an existing tag or silently repoint a release. Version agent and server components independently where required.
- Define upgrade prerequisites and a rollback path that preserves volumes, databases, secrets, and configuration. Note irreversible migrations explicitly.

## Verification and handoff

- Verify the release tag points to the intended commit, CI passed, artifacts are downloadable, checksums match, and public update metadata names a real published version.
- Test upgrade and rollback against representative persistent data before recommending production deployment.
- Never state that a release exists simply because a PR merged or a version string changed.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
