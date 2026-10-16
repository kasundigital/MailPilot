# MailPilot: Free-for-Everyone Feature Roadmap

MailPilot is MIT-licensed, self-hosted software. **Every implemented capability is available to every installation, without paid tiers, license-key gates, account-based unlocks, or artificial product quotas.** Sending remains subject to each mail provider's quotas, abuse controls, and applicable law. Prioritize reliable, consent-based delivery over sending volume.

## Current baseline (already available)
- Single-admin authentication; encrypted SMTP secrets; SMTP connection testing
- Contact paste import, consent source, deduplication and unsubscribe
- HTML/plaintext campaigns, draft/pause/resume, paced queue, rolling account limits, retries, per-recipient logs
- MariaDB storage, Docker Compose, installer, responsive dashboard
- All-contacts CSV export (added in the companion PR)

## P0 — Reliability, security and compliance
- [ ] CSRF defense on all state-changing cookie-authenticated routes; strong HTTP CSP and secure HTML rendering
- [ ] Production-ready migrations and backups with restore verification; optional backup scheduling
- [ ] Durable worker leasing/locks, clean crash recovery, idempotent sending, concurrency tests
- [ ] Reliable bounce and spam-complaint ingestion using authenticated provider webhooks or dedicated mailbox; never infer delivery from SMTP acceptance
- [ ] Automated suppression, unsubscribe preference center and optional double opt-in
- [ ] SMTP secret rotation, account update/delete, encrypted backup export; SSRF protection for SMTP host configuration
- [ ] Abuse prevention: throttling, validation, send authorization, tenant isolation before public multi-user deployments
- [ ] Sender/domain DNS validation for SPF, DKIM and DMARC, with clear actionable guidance
- [ ] Install/update health checks, reproducible Docker builds, automated security and integration tests
- [ ] Fully auditable consent history and contact erasure/export tools

## P1 — Core campaigns and audiences
- [ ] Contact CSV import with field mapping, validation preview, deduplication reports, import rollback
- [ ] Tags, lists, custom fields, segment builder and saved segments
- [ ] Campaign audience selection and exclusions; campaign cloning, archive, draft autosave
- [ ] Drag-and-drop templates, responsive blocks, safe HTML editor, media library, saved templates
- [ ] Personalization tokens with fallback, email previews, test sends, link checks
- [ ] Scheduled/time-zone sends, quiet hours, per-account rate policies and queue ETA
- [ ] Contact pagination, search, bulk actions, consent/suppression filters and CSV export
- [ ] Provider-specific quotas, multiple SMTP account routing, failover with explicit safety rules
- [ ] Detailed status dashboards and downloadable campaign event reports
- [ ] Campaign-level cancellation, retry controls and error diagnostics

## P2 — Analytics, automation, forms
- [ ] Link tracking with secure redirect allowlists and privacy-conscious analytics
- [ ] Optional open tracking clearly labeled as approximate; opt-out and data retention controls
- [ ] Conversion tracking and UTM integration without invasive fingerprinting
- [ ] Workflows: triggers, waits, conditions, branches, suppression checks, templates and versioning
- [ ] Welcome sequences, follow-ups, re-engagement and RSS-to-email (with subscriber consent)
- [ ] A/B testing with configurable splits, success metrics and minimum sample safeguards
- [ ] Signup/embedded forms with anti-bot controls, double opt-in, confirmation emails, preferences
- [ ] Public API (scoped tokens), signed webhooks, n8n integrations, event logs and replay tools
- [ ] Reports and analytics on opt-ins, complaints, bounces, engagement and list quality

## P3 — Collaboration, advanced editing and optional AI
- [ ] Multi-user roles, workspaces, invitations, 2FA/passkeys, SSO and audit logs
- [ ] Localization, accessibility, mobile improvements and light/dark themes
- [ ] Optional AI-assisted drafts, subject suggestions and translation using user-provided API keys
- [ ] Optional OAuth2 SMTP credential flows, provider API connectors and secrets vault support
- [ ] Campaign content approval workflow, revision history and reusable brand kits
- [ ] Optional plugins/extensions and comprehensive admin API
- [ ] Export/import instance configuration and disaster-recovery documentation

## Acceptance rules for each feature
1. Feature is accessible to every installation without payment or license checks.
2. Existing databases, deployments and campaigns remain compatible; reversible migrations where practical.
3. Each write path has authentication, authorization, input validation, and relevant abuse protections.
4. Automated tests cover happy paths, invalid inputs, retries and relevant race conditions.
5. Documentation describes setup, limits, privacy and provider-specific prerequisites.
6. No campaign sends without an explicit operator action or previously enabled workflow.
7. Maintain deliverability and lawful, permission-based list management.

## Development sequence
Complete P0 before offering hosted multi-user accounts; implement P1 as small, reviewable pull requests; only then advance to automation and analytics. Track changes in CHANGELOG and tag immutable releases after CI validation.
