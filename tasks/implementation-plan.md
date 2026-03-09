# Implementation Plan: Peek (Website Change Tracker)

## Architecture: Layered Monorepo

**Pattern:** Layered architecture with clear domain/infrastructure separation, split across pnpm workspace packages.

**Package boundaries mirror the domain:**

- `@peek/db` — infrastructure: Supabase client, typed queries, shared types
- `@peek/checker` — domain services: page fetching, diffing, email notification
- `apps/web` — presentation + application: Next.js UI and local-dev API
- `apps/worker` — application orchestrator: cron entry point for GitHub Actions

---

## Directory Structure

```
peek/
├── apps/
│   ├── web/                          # Next.js App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx          # Homepage (sign-in CTA)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx      # Protected dashboard
│   │   │   │   ├── auth/
│   │   │   │   │   └── callback/
│   │   │   │   │       └── route.ts  # Supabase OAuth callback
│   │   │   │   └── api/
│   │   │   │       └── dev/
│   │   │   │           └── check/
│   │   │   │               └── [id]/
│   │   │   │                   └── route.ts  # LOCAL DEV ONLY
│   │   │   ├── components/
│   │   │   │   ├── TrackedItemList.tsx
│   │   │   │   ├── TrackedItemRow.tsx
│   │   │   │   ├── AddEditModal.tsx
│   │   │   │   ├── DeleteConfirmDialog.tsx
│   │   │   │   └── StatusBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useTrackedItems.ts
│   │   │   └── lib/
│   │   │       └── supabase-client.ts  # Anon key browser client
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                       # Cron runner (GitHub Actions)
│       ├── src/
│       │   └── index.ts              # Entry: run all checks
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── db/                           # Supabase infrastructure
│   │   ├── src/
│   │   │   ├── client.ts             # createSupabaseClient(options)
│   │   │   ├── queries.ts            # getTrackedItems, updateSnapshot, ...
│   │   │   └── types.ts              # TrackedItem, CheckStatus, Snapshot
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── checker/                      # Core domain services
│   │   ├── src/
│   │   │   ├── fetch.ts              # fetchPage() — Playwright + static fallback
│   │   │   ├── snapshot.ts           # computeSnapshot(), hasChanged()
│   │   │   ├── email.ts              # sendNotification() via SMTP
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── tsconfig/                     # Shared TS configs
│       ├── base.json
│       └── nextjs.json
│
├── .github/
│   └── workflows/
│       ├── check.yml                 # Cron: 4x/day, runs apps/worker
│       └── ci.yml                    # PR: typecheck, lint, test
│
├── supabase/
│   └── migrations/
│       └── 001_tracked_items.sql
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                      # Root: scripts, devDeps
└── .env.example
```

---

## Domain Model

### Aggregate: `TrackedItem`

```typescript
// packages/db/src/types.ts
export type CheckStatus = 'ok' | 'changed' | 'error' | 'selector_missing'

export interface TrackedItem {
  id: string
  user_id: string
  url: string
  selector: string
  last_snapshot_hash: string | null
  last_snapshot_snippet: string | null
  last_checked_at: string | null
  last_changed_at: string | null
  last_status: CheckStatus | null
  last_error_message: string | null
  is_paused: boolean
  created_at: string
  updated_at: string
}

export interface Snapshot {
  hash: string // SHA-256 of normalised innerHTML
  snippet: string // first ~200 chars of text content, sanitised
}

export interface CheckResult {
  status: CheckStatus
  snapshot?: Snapshot
  error?: string
}
```

### Value Objects

- `Snapshot { hash, snippet }` — immutable result of computing innerHTML state
- `CheckResult { status, snapshot?, error? }` — outcome of a single check run

---

## Database Schema

```sql
-- supabase/migrations/001_tracked_items.sql

create table tracked_items (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  url                  text not null,
  selector             text not null,
  last_snapshot_hash   text,
  last_snapshot_snippet text,
  last_checked_at      timestamptz,
  last_changed_at      timestamptz,
  last_status          text check (last_status in ('ok','changed','error','selector_missing')),
  last_error_message   text,
  is_paused            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table tracked_items enable row level security;

create policy "owner_all" on tracked_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tracked_items_updated_at
  before update on tracked_items
  for each row execute function update_updated_at();
```

---

## Package Specifications

### `@peek/tsconfig`

No build step. Provides:

- `base.json` — strict TS, ESNext, bundler resolution
- `nextjs.json` — extends base, adds JSX, DOM libs

### `@peek/db`

Built with tsup → `dist/`. Provides:

```typescript
// client.ts
createSupabaseClient(options: { serviceRole?: boolean }): SupabaseClient

// queries.ts
getTrackedItems(client): Promise<TrackedItem[]>              // non-paused only; for worker
getAllTrackedItems(client): Promise<TrackedItem[]>            // all; for UI
getTrackedItemById(client, id): Promise<TrackedItem>
getUserEmail(client, userId): Promise<string>                // reads auth.users via service role
insertTrackedItem(client, data): Promise<TrackedItem>
updateTrackedItem(client, id, data): Promise<TrackedItem>
deleteTrackedItem(client, id): Promise<void>
updateSnapshot(client, id, result: CheckResult): Promise<void>
setPaused(client, id, paused: boolean): Promise<void>
```

Deps: `@supabase/supabase-js`

### `@peek/checker`

Built with tsup → `dist/`. Provides:

```typescript
// fetch.ts
fetchPage(url: string, selector: string, opts?: FetchOptions): Promise<PageFetchResult>
// → tries Playwright (15s timeout, blocks images/fonts/ads)
// → on Playwright failure, falls back to static fetch + cheerio parse
// → returns { html: string } or { error: 'selector_missing' | 'unreachable' | string }

// snapshot.ts
computeSnapshot(html: string): Snapshot
hasChanged(oldHash: string | null, newHash: string): boolean

// email.ts
sendNotification(config: SmtpConfig, to: string, item: TrackedItem, result: CheckResult): Promise<void>
// → nodemailer SMTP; from: peeked@bushbaby.dev
// → subject: "[Peek] Change detected: {url}"
// → body: URL, selector, timestamp, old hash → new hash, snippet
```

Deps: `playwright`, `cheerio`, `nodemailer`, `@peek/db` (types only)

### `apps/worker`

Entry: `src/index.ts`. No HTTP server — plain Node script.

```typescript
// Orchestration loop (pseudo):
const supabase = createSupabaseClient({ serviceRole: true })
const items = await getTrackedItems(supabase) // non-paused only

for (const item of items) {
  const fetchResult = await fetchPage(item.url, item.selector)
  const snapshot = computeSnapshot(fetchResult.html)
  const changed = hasChanged(item.last_snapshot_hash, snapshot.hash)

  if (changed) {
    const email = await getUserEmail(supabase, item.user_id)
    await sendNotification(smtpConfig, email, item, { status: 'changed', snapshot })
  }

  await updateSnapshot(supabase, item.id, {
    status: changed ? 'changed' : 'ok',
    snapshot: changed ? snapshot : undefined,
  })
}
```

Deps: `@peek/checker`, `@peek/db`

### `apps/web`

Standard Next.js App Router setup. Server components read Supabase directly. Client components use anon key. Local dev check route:

```typescript
// app/api/dev/check/[id]/route.ts
export async function POST(req, { params }) {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
  }
  // run checker pipeline, return result; no email sent
}
```

---

## Turborepo Pipeline

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

Build order: `@peek/tsconfig` (no build) → `@peek/db` → `@peek/checker` → `apps/web` / `apps/worker`

---

## GitHub Actions Workflows

### `check.yml` — Scheduled cron

```yaml
name: Scheduled Check
on:
  schedule:
    - cron: '0 */6 * * *' # 4x/day at 00:00, 06:00, 12:00, 18:00 UTC
  workflow_dispatch: # manual trigger for testing

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Cache Chromium
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('packages/checker/package.json') }}
      - run: pnpm --filter @peek/checker exec playwright install chromium --with-deps
      - run: pnpm turbo build --filter=apps/worker...
      - run: node apps/worker/dist/index.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_PORT: ${{ secrets.SMTP_PORT }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
```

### `ci.yml` — PR checks

```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck lint test
```

---

## Environment Variables

### Vercel (production + preview)

| Variable                        | Location    | Notes                    |
| ------------------------------- | ----------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | public      | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public      | Anon key for client-side |
| `SUPABASE_SERVICE_ROLE_KEY`     | server-only | Never exposed to client  |

### GitHub Actions Secrets

| Secret                      | Notes                   |
| --------------------------- | ----------------------- |
| `SUPABASE_URL`              | Same project URL        |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for worker |
| `SMTP_HOST`                 | e.g., smtp.resend.com   |
| `SMTP_PORT`                 | 465 or 587              |
| `SMTP_USER`                 | SMTP username           |
| `SMTP_PASS`                 | SMTP password / API key |

### Local Dev (`.env.local` in `apps/web`)

All of the above plus optionally `BROWSERLESS_TOKEN` for hosted Playwright.

---

## Implementation Phases

### Phase 0 — Monorepo Scaffold

- [ ] Init pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Create `packages/tsconfig` with `base.json` and `nextjs.json`
- [ ] Create `apps/web` via `pnpm create next-app`; wire tsconfig
- [ ] Create `packages/db` and `packages/checker` shells (package.json + tsup config)
- [ ] Create `apps/worker` shell
- [ ] Add `turbo.json` pipeline
- [ ] Add root `package.json` scripts: `dev`, `build`, `typecheck`, `lint`, `test`
- [ ] Add `.env.example`

### Phase 1 — Database + Auth

- [ ] Create Supabase project; apply `001_tracked_items.sql` migration
- [ ] Enable GitHub OAuth provider in Supabase dashboard
- [ ] Set `SITE_URL` and OAuth redirect to `peek.bushbaby.dev` (+ localhost for dev)
- [ ] Implement `@peek/db`: `client.ts`, `types.ts`
- [ ] Implement auth callback route in `apps/web` (`/auth/callback`)
- [ ] Build homepage (`/`) with sign-in CTA
- [ ] Build middleware to protect `/dashboard`
- [ ] Add sign-out to dashboard shell
- [ ] Verify: sign-in → redirect to dashboard, sign-out → redirect to homepage

### Phase 2 — CRUD UI

- [ ] Implement `@peek/db`: `queries.ts` (insert, update, delete, setPaused, getAllTrackedItems)
- [ ] Build `TrackedItemList` with loading + empty states
- [ ] Build `AddEditModal` (URL + CSS selector inputs, validation)
- [ ] Build `DeleteConfirmDialog`
- [ ] Wire add/save → insert → list refresh
- [ ] Wire edit → modal prefilled → update → list refresh
- [ ] Wire delete → confirm → delete → list refresh
- [ ] Wire pause toggle → setPaused → visual distinction
- [ ] Build `StatusBadge` component
- [ ] Verify: all CRUD flows in browser

### Phase 3 — Checker Core

- [ ] Implement `packages/checker/src/snapshot.ts`: SHA-256 hash + 200-char snippet
- [ ] Implement `packages/checker/src/fetch.ts`: Playwright fetch (block assets, 15s timeout)
- [ ] Add static fetch fallback (cheerio) when Playwright throws
- [ ] Add SSRF guard: validate URL scheme; resolve hostname; reject private IP ranges
- [ ] Validate CSS selector syntax on parse (try `document.querySelector` in a safe context)
- [ ] Unit tests: hash stability, changed detection, SSRF guard, fallback trigger

### Phase 4 — Worker + Scheduled Checks

- [ ] Implement `apps/worker/src/index.ts`: orchestration loop
- [ ] Implement `@peek/db`: `getTrackedItems` (non-paused only), `updateSnapshot`, `getUserEmail`
- [ ] Handle per-item errors: catch, write error status, continue loop
- [ ] Add `check.yml` GitHub Actions cron workflow with Chromium cache
- [ ] Add `workflow_dispatch` trigger for manual testing
- [ ] Verify: trigger workflow manually → Supabase rows updated

### Phase 5 — Email Notifications

- [ ] Implement `packages/checker/src/email.ts` with nodemailer
- [ ] Email template: URL, selector, timestamp, old hash → new hash, snippet
- [ ] Wire into worker: send only on `hasChanged()`; lookup user email from `auth.users`
- [ ] Test with a staging tracked item that will change
- [ ] Verify: change detected → email arrives at GitHub account email

### Phase 6 — Local Dev Check Route

- [ ] Implement `apps/web/src/app/api/dev/check/[id]/route.ts`
- [ ] Gate with `if (process.env.NODE_ENV === 'production') return 404`
- [ ] Show "Check now" button in `TrackedItemRow` only when `NODE_ENV !== 'production'`
- [ ] Wire UI: loading spinner → result badge (no change / changed / error)
- [ ] Verify: works locally; confirm button absent in Vercel preview

### Phase 7 — CI, Testing, Polish

- [ ] Add `ci.yml`: typecheck + lint + test on push/PR
- [ ] Integration tests for CRUD API routes
- [ ] Unit tests for `@peek/checker` snapshot and fetch fallback
- [ ] Confirm Supabase RLS: attempt cross-user read with a second test account
- [ ] Set up custom domain `peek.bushbaby.dev` on Vercel
- [ ] Add domain to Supabase OAuth redirect whitelist
- [ ] Configure SPF/DKIM/DMARC for `bushbaby.dev` (required for `peeked@bushbaby.dev`)
- [ ] Smoke test full production flow: scheduled check → change detected → email received

---

## Key Trade-offs

| Decision            | Choice                   | Reason                                                   |
| ------------------- | ------------------------ | -------------------------------------------------------- |
| Playwright location | GitHub Actions only      | Avoids Vercel 10s limit; free CI minutes                 |
| Email trigger       | Worker (GH Actions)      | Email is computed where check result is known            |
| Manual check        | Local dev only           | Eliminates Playwright on Vercel entirely                 |
| Package for checker | Separate `@peek/checker` | Worker and local dev route share identical pipeline      |
| RLS strategy        | `auth.uid() = user_id`   | Zero-config row isolation; no separate ACL table         |
| Snapshot storage    | Hash + 200-char snippet  | Lightweight; avoids storing full HTML; actionable emails |
