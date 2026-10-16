# Features to develop — mapped from open issues

This file was generated automatically to capture and prioritize feature work from open issues in the repository.

Top priority (P0) — high-impact, required for reliable operation

- #30 Reliable queue, worker leasing and crash recovery — https://github.com/kasundigital/MailPilot/issues/30
  - Why: core reliability for dispatching campaigns.
  - Suggested first steps: design worker lease model, implement lease/heartbeat, add retry and dead-letter queue.
  - Suggested branch: feature/reliable-queue-#30

- #31 Automated backups, restore verification and DB migrations — https://github.com/kasundigital/MailPilot/issues/31
  - Why: protect production data and enable safe migrations.
  - Suggested first steps: add scheduled backups, backup verification job, and migration scripts.
  - Suggested branch: feature/backups-migrations-#31

- #32 Domain authentication and deliverability diagnostics — https://github.com/kasundigital/MailPilot/issues/32
  - Why: email deliverability depends on domain auth (SPF, DKIM, DMARC).
  - Suggested first steps: add DNS checks, instructions for domain setup, and UI for diagnostics.
  - Suggested branch: feature/deliverability-#32

- #33 Consent audit history and privacy controls — https://github.com/kasundigital/MailPilot/issues/33
  - Why: legal and privacy requirements; audit trails for consent.
  - Suggested first steps: design schema for consent records and UI for audit history.
  - Suggested branch: feature/consent-audit-#33

- #34 SMTP provider management, OAuth2 and secret rotation — https://github.com/kasundigital/MailPilot/issues/34
  - Why: provider management and secret rotation are needed for secure SMTP integrations.
  - Suggested first steps: provider configuration UI, OAuth2 flow, and secret rotation tooling.
  - Suggested branch: feature/smtp-providers-#34


High priority (P1) — important product functionality for users

- #35 CSV/Excel contact import with field mapping — https://github.com/kasundigital/MailPilot/issues/35
  - Why: onboarding requires importing contacts quickly.
  - Suggested first steps: backend import endpoint, mapping UI, validation, and dry-run preview.
  - Suggested branch: feature/csv-import-#35

- #36 Contact lists, tags, custom fields and saved segments — https://github.com/kasundigital/MailPilot/issues/36
- #37 Contact search, pagination and bulk management — https://github.com/kasundigital/MailPilot/issues/37
- #38 Visual drag-and-drop email template builder — https://github.com/kasundigital/MailPilot/issues/38
- #39 Campaign personalization and test sends — https://github.com/kasundigital/MailPilot/issues/39
- #40 Audience-targeted campaigns and draft management — https://github.com/kasundigital/MailPilot/issues/40
- #41 Multi-SMTP scheduling, routing and failover — https://github.com/kasundigital/MailPilot/issues/41
- #42 Campaign logs, export and error diagnostics — https://github.com/kasundigital/MailPilot/issues/42


Medium priority (P2/P3) — valuable enhancements and integrations

- #43 Privacy-conscious click and open analytics — https://github.com/kasundigital/MailPilot/issues/43
- #44 Marketing automation workflow builder — https://github.com/kasundigital/MailPilot/issues/44
- #45 A/B testing for campaigns — https://github.com/kasundigital/MailPilot/issues/45
- #46 Signup forms, embeddable widgets and preference center — https://github.com/kasundigital/MailPilot/issues/46
- #47 REST API, signed webhooks and n8n integration — https://github.com/kasundigital/MailPilot/issues/47
- #48 Advanced reports and conversion attribution — https://github.com/kasundigital/MailPilot/issues/48
- #49/#50/#51/#52/#53/#54 P3 wishlist items (roles, branding kits, AI, localization, plugin architecture)


Next recommended actions

1. Choose the first issue to implement. I recommend starting with either a P0 reliability item (#30 or #34) or a P1 onboarding item that delivers immediate user value (#35 CSV import).
2. Create a dedicated branch for the chosen issue using the suggested branch name pattern (feature/<short>-#<issue>).
3. Open a draft PR with a short implementation plan and checklist.
4. Break work into small PRs where possible (API, database schema, backend job, UI).


If you want, I can:
- Create the branch(es) and open draft PR(s) for you.
- Start implementing issue #35 (CSV import) and push an initial PR with the import endpoint and tests.
- Or I can start on a P0 item (pick #30 or #34) if you prefer reliability/security first.

Tell me which issue you'd like me to start with and whether to create branches/PRs automatically.
