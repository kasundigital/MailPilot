---
name: github-actions-ci-cd
description: "Build secure GitHub Actions pipelines for linting, tests, Docker publishing, release artifacts, and deployments."
---

# Github Actions Ci Cd

## When to use

Use for `.github/workflows`, reusable workflows, deployment gates, and GHCR publishing.

## Workflow

- Inspect branch protection, required checks, existing runners, release tags, environments, package registry permissions, and deployment methods before editing workflows.
- Set least-privilege `permissions:` per workflow/job; pin trusted third-party Actions to full commit SHAs for sensitive workflows, and avoid executing untrusted PR code with privileged tokens.
- Separate PR validation from publication. Only trusted main/tag builds publish artifacts or deploy; use environment approvals for production when needed.
- Set timeouts, concurrency controls, caching with safe keys, build reproducibility, protected secrets, and explicit artifact retention.
- Prevent circular workflows, duplicate releases, racing version tags, and uploads before all required tests pass. For self-hosted runners, treat untrusted PRs as high risk.

## Verification and handoff

- Lint workflow YAML and run appropriate Actions validation tools if available; check triggers, token scopes, conditions, permissions, and fork behavior.
- Confirm release image tags, manifests, and checksums by actual workflow output. Check rollback plan before modifying production deployments.
- Do not report a workflow as passed while still queued, in progress, or unexecuted.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
