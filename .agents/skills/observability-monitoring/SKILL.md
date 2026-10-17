---
name: observability-monitoring
description: "Implement actionable metrics, health checks, structured logging, tracing, and alerting for server and SaaS operations."
---

# Observability Monitoring

## When to use

Use when adding operational telemetry, Grafana/Prometheus integrations, alerts, or diagnostic dashboards.

## Workflow

- Identify user-visible service objectives, failure modes, dependencies, log volume, and telemetry privacy concerns.
- Expose separate liveness, readiness, and dependency diagnostics. Design counters, gauges, and histograms with bounded label cardinality.
- Structure logs with request IDs and consistent severity; redact credentials, API keys, customer payloads, and sensitive session data.
- Create actionable alerts with severity, thresholds, sustained windows, runbooks, and owner context; reduce noisy duplicates and avoid alerting on one transient failed scrape.
- For host agents, collect CPU, memory, disk, temperature, and network metrics safely; distinguish unsupported sensor readings from zero values.

## Verification and handoff

- Simulate at least one failure and recovery; verify metrics, alerts, and status pages display accurate state and timestamps.
- Check dashboards for label explosion and false green values; verify retention and least-privilege access.
- Provide a short troubleshooting path from alert to relevant logs/metrics.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
