# MailPilot professional UI implementation task

Repository: https://github.com/kasundigital/MailPilot

Implement the agreed compact, premium SaaS button and campaign-table experience using AGENTS.md, without changing the existing frontend framework, APIs, security, database, mail sending, or deployment.

## Objectives
- Semantic light/dark design tokens and coherent buttons, fields, status chips, cards and tables.
- Searchable, status-filtered, paginated campaign table using actual API fields only.
- Preserve all Start, Pause, Duplicate, Delete, Logs and Export CSV actions and rerender-safe delegation.
- Preserve overview, contacts, SMTP, editor wizard, account settings, version badge and developer attribution.
- Clear focus, loading and empty states, accessible semantic labels, and layouts from 390 to 1440 pixels.
- No invented analytics or decorative controls without functionality.

## Regression checks
- Test login, logout (empty POST must not advertise a JSON request body), CSRF, navigation, theme, campaigns, SMTP and contacts.
- Run node --check public/app.js and npm test.
- Review light/dark desktop, tablet and mobile in a browser when available.
- Open a branch PR with changes, actual test results and limitations. Do not deploy unverified code.
