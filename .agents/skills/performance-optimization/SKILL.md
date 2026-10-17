---
name: performance-optimization
description: "Diagnose and improve backend, database, frontend, and container performance without breaking correctness."
---

# Performance Optimization

## When to use

Use for slow APIs, SQL, UI interactions, startup, memory use, and infrastructure costs.

## Workflow

- Reproduce and measure the slowdown first using representative load, traces, profiler samples, query plans, Core Web Vitals, or benchmark baselines.
- Identify dominant bottlenecks before tuning; consider N+1 queries, missing indexes, oversized bundles, blocking I/O, unbounded concurrency, cache misses, excessive polling, and frontend re-renders.
- Prioritize low-risk changes preserving API contracts, permission rules, correctness, cache invalidation, and user-visible behavior.
- Place bounds on memory, queues, retries, rate limits, and connection pools; include resource impact on small VPS deployments.
- Never remove security validation, audit logs, durable writes, or backups merely to make benchmarks faster.

## Verification and handoff

- Benchmark before and after with the same workload, warm-up method, sample size, and environment; report p50/p95 latency and resource usage where relevant.
- Run regression tests and verify failure handling under concurrency, slow dependencies, and cache invalidation.
- If measurement tools are unavailable, label changes as theoretical improvements rather than proven speedups.

## General boundaries

- Read repository-local `AGENTS.md`, `CLAUDE.md`, contributor rules, and relevant existing skills first; project-specific instructions override these general suggestions.
- Preserve working features, real customer data, application credentials, and public interfaces. Use a reviewable branch and minimal diff for changes; avoid destructive production actions.
- Use only the tools actually available in the environment. Do not claim tests, deployments, scans, or external actions ran when they did not.
- Before risky or irreversible steps, explicitly identify impact, required backups, and a recovery plan.
