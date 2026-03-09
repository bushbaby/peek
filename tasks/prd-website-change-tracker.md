# PRD: Peek (Personal Website Change Tracker)

## Introduction/Overview

Personal, authenticated Next.js + Supabase tool to monitor specific parts of web pages. Users maintain a list of URLs with CSS selectors; the system detects content changes (text/HTML diff of the selected element) and emails the owner when differences are found. UI is intentionally simple: a dashboard listing tracked items with add/edit/remove and a modal for adding entries. Uses pnpm, linting, and testing.

## Goals

- Track changes for user-defined URL + CSS selector pairs
- Scheduled checks on a global cadence; manual checks available in local dev only
- Notify via email when a change is detected
- Keep UI minimal: list view, add modal, edit/remove actions
- Provide lightweight auth for private use (GitHub OAuth)

## User Stories

### US-001: Auth gate with GitHub OAuth

**Description:** As a private user, I want GitHub sign-in so the dashboard is protected.

**Acceptance Criteria:**

- [ ] Sign-in with GitHub via Supabase Auth; signed-in state required to access dashboard
- [ ] Basic homepage shows one-liner and sign-in button
- [ ] Sign-out control visible on dashboard
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-002: Add tracked item via modal

**Description:** As a user, I want to add a URL + CSS selector so it can be monitored.

**Acceptance Criteria:**

- [ ] Add button opens modal with inputs: URL (required, valid), CSS selector (required)
- [ ] Save validates inputs and persists to Supabase
- [ ] List updates immediately after save
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-003: List tracked items

**Description:** As a user, I want to see all tracked URL/selector pairs so I can manage them.

**Acceptance Criteria:**

- [ ] Table/list shows URL, selector, last checked, last change status
- [ ] Loading and empty states are present
- [ ] Edit and remove controls per row
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-004: Edit tracked item

**Description:** As a user, I want to edit URL and selector.

**Acceptance Criteria:**

- [ ] Edit action opens modal prefilled with current values
- [ ] Updates persist to Supabase and reflect in list
- [ ] Validation matches add flow
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-005: Remove tracked item

**Description:** As a user, I want to delete a tracked item.

**Acceptance Criteria:**

- [ ] Remove action asks for confirmation
- [ ] Item deleted from Supabase and disappears from list
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-006: Manual check now _(local dev only — not deployed to production)_

**Description:** As a developer, I want to trigger an immediate check for a single tracked item during local development and testing.

**Acceptance Criteria:**

- [ ] “Check now” action per item invokes a local API route that runs the checker pipeline (fetch + selector extraction + diff)
- [ ] UI shows in-progress state and result (no change / change detected / error)
- [ ] Route is excluded from the production Vercel deployment (env guard or build exclusion)
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-007: Scheduled checks (global cadence)

**Description:** As a user, I want items checked automatically on the global schedule.

**Acceptance Criteria:**

- [ ] Background job runs on the global cadence (4×/day) and processes all non-paused items
- [ ] Skip or backoff on repeated failures; log errors
- [ ] Checks update last checked and last change metadata
- [ ] Typecheck/lint/test pass

### US-008: Change detection and diffing

**Description:** As a user, I want reliable change detection on the targeted selector.

**Acceptance Criteria:**

- [ ] Fetch HTML, parse, select element; compare innerHTML (text + attributes) to prior snapshot
- [ ] Store last snapshot per item; treat missing selector as an error state
- [ ] Record whether change occurred and the timestamp; small hash-based comparison acceptable
- [ ] Typecheck/lint/test pass

### US-010: Pause/resume tracked item

**Description:** As a user, I want to pause a tracked item so it is skipped during scheduled checks without losing its data.

**Acceptance Criteria:**

- [ ] Each item has a pause toggle; paused items are visually distinct in the list
- [ ] Scheduled checks skip items where `is_paused = true`
- [ ] Resuming re-enables checks on the next scheduled run
- [ ] Typecheck/lint/test pass
- [ ] Verify in browser using dev-browser skill

### US-009: Email notifications

**Description:** As a user, I want an email when a change is detected.

**Acceptance Criteria:**

- [ ] On detected change, GitHub Actions workflow sends email via SMTP
- [ ] Email includes URL, selector, timestamp, snapshot hash, and a short sanitized snippet (~200 chars)
- [ ] Failures are retried or logged; no duplicate emails when snapshot hash is unchanged since last notification
- [ ] Typecheck/lint/test pass

## Functional Requirements

- FR-1: Require GitHub OAuth sign-in for dashboard access; show minimal homepage with sign-in CTA.
- FR-2: Allow creating tracked items with fields URL, CSS selector, and store current snapshot hash/text.
- FR-3: Provide list UI with URL, selector, last checked, last change, pause toggle, and actions (edit, remove). In local dev only, also show "check now" action.
- FR-4: Support editing and deleting tracked items with confirmation on delete.
- FR-5 _(local dev only)_: Implement manual “check now” per item as a local API route; fetches the page, extracts selector content, compares to stored snapshot, and updates metadata. Route must be excluded from production deployments (e.g., gated on `NODE_ENV !== 'production'` or omitted from Vercel config). No email is sent from this path; it is purely for development testing.
- FR-6: Implement scheduled checks on a global cadence (4×/day) via GitHub Actions cron; process all non-paused items; skip items where `is_paused = true`.
- FR-7: Change detection uses innerHTML comparison (text + attributes) and stores new snapshot when changed.
- FR-8: Send email on change from within the GitHub Actions workflow using SMTP creds; recipient is the item owner's email from `auth.users` (looked up via service role key); include URL, selector, timestamp, hash, and sanitized snippet. Do not re-send if snapshot hash is unchanged since last notification.
- FR-9: Use pnpm with linting and testing in CI; type-safety enforced.
- FR-10: Support SPA/JS-rendered pages by executing page scripts before selecting the target element; fallback to static fetch when JS execution fails.
- FR-11: Validate user-supplied URLs before fetching — reject non-HTTP/S schemes and resolve hostname to block private/loopback IP ranges (SSRF guard). Validate CSS selectors syntactically on save.
- FR-12: Allow per-item pause/resume; scheduled checks skip items where `is_paused = true`.

## Non-Goals (Out of Scope)

- No visual screenshot diffing
- No multi-user org/teams or sharing; single private user only
- No webhook or SMS notifications
- No historical version browsing beyond last snapshot
- No browser extension

## Design Considerations

- Simple dashboard layout; emphasize clarity over decoration
- Add/Edit modal for tracked item management; confirm dialog for delete
- Clear status badges for last check result; surface errors unobtrusively
- Mobile-friendly list and modal

- Stack: Next.js (App Router), Supabase (DB + Auth + RLS), GitHub Actions (scheduled checks + email), pnpm
- Data model: tracked_items (id, url, selector, last_snapshot_hash, last_snapshot_snippet, last_checked_at, last_changed_at, last_status, last_error_message, is_paused, created_at, updated_at, user_id)
- Background: GitHub Actions cron runs on global cadence (4×/day) and iterates all non-paused items; consider next_run_at only if future cadence changes.
- Email: GitHub Actions workflow calls external SMTP directly (sending address: peeked@bushbaby.dev; recipient: email address from the GitHub user's Supabase Auth record — looked up via service role key from `auth.users` using the item's `user_id`); retries/logging; no duplicate emails while snapshot hash unchanged
- SPA rendering: use headless browser (e.g., Playwright) in scheduled checks (and local dev manual checks) to wait for network idle and run selectors post-hydration; block images/fonts/ads to reduce load; 15s timeout with graceful fallback to static HTML fetch.
- Error handling: capture unreachable URLs, selector not found, unexpected HTML structure
- Testing: unit tests for change detection hashing; integration tests for API routes; lint/typecheck in CI

## Deployment/Infra (free-tier friendly)

- Host UI on Vercel Hobby (Next.js App Router). No Playwright on Vercel — all check logic runs in GitHub Actions.
- Use Supabase Free for Postgres + Auth + RLS; store service role key only server-side.
- Run all Playwright checks via GitHub Actions cron 4×/day (~every 6h); the workflow reads/writes Supabase and sends SMTP emails.
- Manual “check now” route exists locally only for development/testing; it is excluded from the Vercel deployment.
- Store Vercel secrets: NEXT*PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-only). Mirror SUPABASE_SERVICE_ROLE_KEY and SMTP*\* into GitHub Actions secrets for the cron workflow. Configure Supabase SITE_URL/auth redirect to the Vercel domain; set custom domain peek.bushbaby.dev on Vercel and add it to Supabase redirect whitelist.

## Risks & Mitigations

- Rate limits / host blocks: Per-host concurrency cap, retry/backoff strategy, distinct User-Agent; optional robots.txt respect. Mitigate by limiting parallel Playwright pages and pacing the global cadence (4×/day).
- Playwright cost/timeouts: Cap page launches per run, block heavy assets (images/fonts/ads), 15s timeout per page, static-fetch fallback. Cache Chromium in CI (actions/cache) to keep cron runs fast.
- Data retention: Keep snapshot hash + short sanitized snippet; avoid storing full innerHTML long-term; consider pruning status logs after N days.
- Security/RLS: Strict RLS tying tracked_items to GitHub UID; service role key server-side only. SSRF guard on fetches (block private IP ranges) and strong URL/selector validation.
- Email deliverability: Verify sender domain (SPF/DKIM/DMARC); handle bounces/retries; rate-limit notifications to one per change until next change.
- Secrets handling: Mirror Vercel secrets into GitHub Actions; never expose service role or SMTP creds client-side.
- Monitoring/alerts: Log failures, surface a simple status/health indicator, alert on repeated errors or long runtimes.

## Success Metrics

- ≥95% of scheduled checks complete without error over a week
- Emails sent only on state changes (no duplicates when unchanged)
- Add/edit/delete/pause/resume UI operations complete within 1s perceived latency on normal network (excludes check execution time, which is async in CI)
- Zero unauthenticated access to dashboard endpoints

## Decisions on Prior Questions

- Diff snippets vs hashes: include both — hash for deduplication logic, sanitized snippet (~200 chars) for actionable email content.
- Pause/disable: per-item pause toggle; `is_paused = true` causes scheduled jobs to skip the item without deleting data.
- Email sending address: `peeked@bushbaby.dev` (requires SPF/DKIM/DMARC on bushbaby.dev). Recipient: the email from the item owner's GitHub OAuth record, read from `auth.users` via service role key at send time.
- Email transport: external SMTP called directly from GitHub Actions (e.g., Resend SMTP bridge). No Edge Functions involved.
- robots.txt: not respected — personal tool, owner controls which URLs are tracked.
