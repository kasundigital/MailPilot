# Changelog

## 0.2.4 — Contact search, pagination and bulk management (#37)

- Add paginated, searchable and sortable contact listing with subscribed/unsubscribed and tag filters.
- Add compact contacts table, page selection, selected-contact CSV export, bulk tags and irreversible suppression confirmation.
- Add an indexed contact_tags table without modifying existing contacts or campaigns.
- Apply per-request validation and rate limits, CSRF for mutations, transactional changes and audit logging.
- Preserve legacy GET /api/contacts and full CSV export endpoints.


## 0.2.3 — Compact SaaS UI and image-based install/update

- Reorganize SMTP setup into compact grouped connection, identity, and delivery-limit fields.
- Render configured SMTP accounts as a readable live-data table with DNS and connection-test controls.
- Refine navigation, typography, spacing, responsive layouts, buttons, forms, light/dark themes and status labels.
- Update UI agent standards using screenshot-specific visual review principles.
- Add a one-command GHCR image installation and update procedure with historical database volume protection.
- Publish versioned multi-architecture Docker images, plus latest and commit-based image tags.
- Keep existing SMTP, delivery, security, contact and campaign behavior unchanged.

## 0.2.2 — Professional SaaS UI

- Add reusable UI/UX agent guidelines and MailPilot implementation requirements.
- Introduce consistent compact light/dark button, form, table, navigation and status styles.
- Upgrade Campaigns view to a searchable, status-filtered, paginated table using live API data.
- Preserve existing campaign action hooks, email delivery, SMTP, consent and authentication behaviors.
