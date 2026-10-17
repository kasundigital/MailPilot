# MailPilot — Professional SaaS UI Standard

Use these instructions for all UI/UX work by ChatGPT, Codex, Jules, Claude, and other coding agents. Reuse them as a starting point for future projects.

## Product and safety
- Build a calm, premium, compact, professional SaaS application instead of a toy-like dashboard.
- Inspect existing screens, styles, APIs, page IDs and handlers first; preserve established workflows.
- MailPilot has a vanilla HTML/CSS/JavaScript frontend and Node/Fastify backend. Do not migrate frameworks or install heavyweight UI libraries solely for styling.
- Do not change authentication, CSRF, SMTP secrets, consent, suppression/unsubscribe, send limits, database, delivery queue, API contracts, or working actions to improve appearance.
- Preserve existing IDs, form names and data-action attributes unless updating every dependent handler.
- Never invent open/click rates, fake analytics, or placeholder data in real application views.

## Visual language
- Restraint: clear typography, dense but comfortable layouts, consistent 4px/8px spacing, thin borders and unobtrusive shadows.
- Central light and dark theme tokens for page, surface, text, muted text, border, accent, focus, success, warning and danger.
- Controls approximately 36–40px tall on desktop, with 6–8px radii and usable mobile touch targets.
- Standard primary, secondary, ghost and danger button variants; provide hover, pressed, disabled, loading and keyboard focus states.
- Semantic accessible forms with proper labels, inline validation and full-width mobile layouts.
- Tables: meaningful headings, numeric alignment, readable rows, distinct status text, working search/filter/pagination where appropriate, explicit empty/error states.
- Consistent sidebar/header, status tags, KPIs, toolbars, dialogs and editor wizard.
- SVG icons when possible, not mixed emojis or inconsistent unicode icon substitutes.
- Avoid giant rounded cards, gradients, heavy shadows, rainbow accents, glassmorphism, oversized gaps and decorative controls.

## Engineering quality
- Centralize CSS variables and reusable classes; don't continuously append unrelated contradictory CSS.
- Support 390px, 768px, 1280px and 1440px viewport widths; limit horizontal scrolling to data tables.
- Ensure accessible keyboard operation, readable contrast, focus-visible and reduced-motion support.
- Keep live version text sourced from the existing version endpoint; follow project semver/changelog policy.
- Preserve Designed & Developed by Kasun Indika linked to https://kasunindika.com.
- Work on a dedicated branch; check latest main before pushing; produce a reviewable PR; never force push.

## Verification
- Run node --check public/app.js and npm test plus any relevant additional checks.
- Manually verify sign-in/sign-out, theme, pages, SMTP actions, contact import/export, campaign wizard, campaign Start/Pause/Duplicate/Delete/Logs/Export and newly added controls.
- Confirm both themes at mobile, tablet and desktop widths, with screenshots if available.
- Explicitly report what passed and what could not be tested. Do not claim browser verification without a browser.

## Screenshot-driven compact production standard (2026-10)
- Favor MailPilot's operational density over marketing-page aesthetics: restrained indigo, quiet panels, 218px navigation, 34–36px desktop controls, 6–9px radii.
- SMTP settings use semantic grouped fieldsets (connection, sender, sending limits), an aligned three-column desktop grid, and explicit quota guidance. Do not use full-viewport giant forms.
- Keep accounts/campaigns in accessible data tables with actionable controls, useful empty states and honest data.
- No uppercase decorative headings or gratuitous gradients. Use typography, spacing, grouping and strong labels to encode hierarchy.
- Review work critically before merging; follow Anthropic's frontend-design principles of brief-specific visual direction and removal of unnecessary decoration.
- A successful CSS/JS check does not replace screenshot QA. Verify 390/768/1280/1440px in both light and dark themes when browser tooling is available.
- For Docker upgrades, keep the existing database volume and persistent .env/cryptographic keys. The image deploy path must not create a new blank database volume when old data exists.

## Deployment discipline
- Use GitHub Actions to publish reviewed images to GHCR. PR builds do not publish; main/tag builds publish only on passing jobs.
- Pin immutable images for critical deployments where appropriate; never rotate existing secrets or replace a database volume on routine update.
- Keep install and update commands in docs and CLI tested by bash -n and shellcheck; do not claim an image was published until the workflow has completed.
