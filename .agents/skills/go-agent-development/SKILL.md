---
name: go-agent-development
description: "Build reliable cross-platform Go agents, installers, background services, telemetry collectors, and update mechanisms."
---

# Go Agent Development

## When to use

Use for StackPulse and similar Go-based Linux/Windows/macOS agent code.

## Workflow

- Inspect existing protocol compatibility, module versions, OS targets, agent config, service scripts, and update endpoints before changing behavior.
- Keep collection bounded and fault tolerant. Use context cancellation, timeouts, jitter/backoff, graceful shutdown, metric validity flags, and safe concurrency.
- Treat Linux systemd, Windows services, and macOS launchd as separate integration surfaces. Never assume identical paths, privileges, or restart semantics.
- Protect enrollment keys and TLS verification; do not log tokens or invent fallback insecure URLs. Validate signed/checksummed update artifacts and make updates atomic with rollback on failure.
- Handle sensors as optional: temperature, fan, SMART, and hardware health APIs differ by platform and privilege; unavailable does not mean healthy.

## Verification and handoff

- Run `go test ./...`, `go vet ./...`, race tests where practical, and cross-compilation for supported GOOS/GOARCH targets.
- Validate fresh install, upgrade, reinstall, service stop/start, uninstall, offline handling, and agent/server version compatibility for each supported platform.
- Report which platform tests ran on actual machines versus cross-compiled only.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
