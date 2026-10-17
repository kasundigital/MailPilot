---
name: pr-conflict-resolution
description: "Resolve GitHub pull-request merge conflicts safely against current main, preserving code changes and validating CI before merge."
---

# Pr Conflict Resolution

## When to use

Use when a pull request is conflicting, outdated, or fails integration checks. Work on one PR at a time.

## Workflow

- Confirm repository, PR number, target branch, head SHA, dirty working tree, and whether another agent is editing the branch. Fetch current base and head refs before starting.
- Inspect each conflicting hunk in context and understand both sides' intent, tests, migrations, security checks, and interface contracts. Never apply blanket `ours` or `theirs` without an explicit file-by-file reason.
- Resolve on the PR branch or a dedicated conflict-fix branch, preserving feature work and any newly merged main changes. Avoid unrelated refactors and do not rewrite other contributors' work.
- Run targeted tests for affected functionality and the repository's required CI checks. Review the final diff for accidental deletions, stale imports, conflict markers, and bad lockfile changes.
- Recheck upstream branch SHAs before push. Push normally without force-pushing. Do not merge to main automatically unless specifically requested and checks satisfy policy.

## Verification and handoff

- Verify `git diff --check`, no unresolved index entries, no conflict markers in changed files, and successful integration with current base.
- Report resolved files, test commands/results, PR URL, latest base/head SHA, and whether CI is actually complete.
- If a conflict is semantic or a required choice is unknown, flag it rather than silently discarding behavior.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
