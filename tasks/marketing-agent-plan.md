# Marketing Agent Execution Infrastructure

## Context

This plan describes the infrastructure required for a Claude agent to autonomously execute the [marketing plan](marketing-plan.md) over several months — from Show HN posts to Product Hunt launch to SEO content.

The system separates responsibilities into three isolated components: **Generator** (Claude API), **Approver** (Next.js dashboard), and **Publisher** (Buffer + Playwright). The generator never holds credentials. The publisher never generates content. The human sits between them.

---

## ICP summary (drives all agent decisions)

| ICP | Trigger | Converts via | Channel fit |
|---|---|---|---|
| **Primary — Developer Who Killed a Scraper** | Wrote/maintained a scraper for a trivial task | Technical credibility, self-hostable angle | HN, r/webdev, r/sysadmin, Dev.to technical articles |
| **Secondary — High-Stakes Manual Checker** | Missed a change that cost them something | Demo video, reliability proof, social proof | SEO (search-driven), comparison articles, landing page |
| **Tertiary — Waitlist/Restock Watcher** | Manually refreshing a page multiple times a day | Word-of-mouth, story ("I caught the drop") | r/DataHoarder, r/buildapc, Twitter |

Every piece of content must be tagged with the ICP it targets. This is the foundation for attribution.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────────────┐
│   GENERATOR     │     │    APPROVER      │     │        PUBLISHER           │
│                 │     │                  │     │                            │
│  Claude API     │────▶│  Next.js         │────▶│  Buffer (Reddit, Twitter,  │
│  weekly cron    │     │  /admin/         │     │  Product Hunt, Dev.to)     │
│  (GitHub        │     │  marketing       │     │                            │
│  Actions)       │     │  dashboard       │────▶│  Playwright (HN only)      │
│                 │     │                  │     │                            │
│  No credentials │     │  You approve or  │     │  Credentials live here,    │
│                 │     │  reject drafts   │     │  nowhere else              │
└─────────────────┘     └──────────────────┘     └────────────────────────────┘
         │                       │                            │
         └───────────────────────┴────────────────────────────┘
                                 │
                         Supabase (one table)
```

### Why this split
- Generator never holds posting credentials — safe to run on GitHub Actions
- Publisher (Buffer) posts from residential IPs — avoids datacenter IP bans on Reddit/Twitter
- Playwright is scoped to HN only — the one platform with no API and no Buffer support
- Dashboard reuses the existing Next.js app — no new service to deploy

---

## Components

### 1. Generator — Claude API orchestrator

A script at `tasks/marketing-agent/run.ts`, triggered weekly by a new GitHub Actions workflow (`marketing.yml`).

Each run:
1. Reads `marketing_tasks` from Supabase to understand current state
2. Reads [marketing-plan.md](marketing-plan.md) for the overall plan
3. Determines next action (which ICP, which channel, which phase)
4. Generates a draft using a per-ICP × per-channel prompt template
5. Writes draft to `marketing_tasks` with status `draft`
6. Sends a notification email (existing SMTP infra) that a draft is ready for review

The generator produces structured output per draft:

```ts
{
  platform: 'reddit' | 'hn' | 'twitter' | 'devto' | 'producthunt',
  icp_target: 'primary' | 'secondary' | 'tertiary',
  utm_tag: string,         // e.g. 'reddit-webdev-2026-04'
  hook: string,
  body: string,
  cta: string,
  hashtags: string[],
  reasoning: string,       // why this ICP/channel/timing
}
```

### 2. Approver — Next.js dashboard

A simple `/admin/marketing` route added to the existing Next.js app. No new service, no new deployment.

Shows a list of drafts with status `draft`, each displaying the structured output above. Two actions per draft:
- **Approve** → status becomes `approved`, triggers publisher
- **Reject** → status becomes `rejected`, agent will regenerate next week with notes

The approval step is intentionally lightweight. You read it, click approve, done.

### 3. Publisher

**Buffer** handles Reddit, Twitter/X, Dev.to, and Product Hunt:
- Posts from residential IPs (avoids datacenter bans — the GitHub Actions IP problem is gone)
- Handles scheduling, retries, and credential storage
- Webhook or polling confirms `published` status back to `marketing_tasks`
- Cost: ~$6–15/mo depending on tier

**Playwright** (existing worker infrastructure) handles HN only:
- Saves session state after a one-time manual login: `storageState({ path: 'sessions/hn.json' })`
- Loads session on each post — no repeated login
- Detects session expiry (redirect to login page) and notifies you to re-authenticate
- Runs locally or on a non-datacenter VPS, not GitHub Actions

---

## State database

One table in the existing Supabase project:

```sql
CREATE TABLE marketing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text,           -- 'phase1', 'phase2', 'phase3'
  task text,            -- e.g. 'post_reddit_webdev', 'write_article_comparison'
  icp_target text,      -- 'primary', 'secondary', 'tertiary'
  platform text,        -- 'reddit', 'hn', 'twitter', 'devto', 'producthunt'
  status text,          -- 'draft', 'approved', 'rejected', 'published', 'failed'
  scheduled_for date,
  completed_at timestamptz,
  draft jsonb,          -- structured output from generator
  result jsonb,         -- upvotes, signups_delta, link, etc.
  utm_tag text,
  notes text            -- rejection reason, agent can read this on next run
);
```

---

## Content prompt templates — per ICP

Templates live in `tasks/marketing-agent/prompts/{icp}/{channel}.md`. Each constrains tone, problem framing, and CTA.

**Primary (Developer):**
- `prompts/primary/hn.md` — problem-first, technical credibility, mention self-hostable, no hype
- `prompts/primary/reddit.md` — conversational, "I got tired of maintaining a scraper for this"
- `prompts/primary/devto.md` — technical deep-dive, credibility primary, SEO secondary

**Secondary (High-Stakes Checker):**
- `prompts/secondary/devto.md` — search-intent driven, demo video embedded, no CSS jargon
- `prompts/secondary/devto-comparison.md` — objective tone, win on UX simplicity + self-hosted

**Tertiary (Waitlist/Restock Watcher):**
- `prompts/tertiary/reddit.md` — story format, outcome-first ("I caught the RTX drop")
- `prompts/tertiary/twitter.md` — short, screenshot of notification email

---

## ICP-aware nudge email

The 24h nudge email (existing plan) should vary by the URL pattern of the user's first tracked item:

- Package registry / GitHub URL → *"We'll email you the moment that release drops."*
- Government / procurement domain → *"We check every few hours and email you the moment anything changes."*
- Product / retail page → *"The moment it changes — price drop, back in stock — you'll know."*

Extend the existing email infra in `packages/checker/src/email.ts`. No new service.

---

## UTM attribution

Every Buffer-scheduled post uses a UTM-tagged link:
```
?utm_source=reddit&utm_campaign=webdev-2026-04&utm_content=primary
?utm_source=hn&utm_campaign=show-hn-2026-04&utm_content=primary
```

After each post, the generator (on its next weekly run) queries Supabase `auth.users` count delta from the publish date and logs it to `marketing_tasks.result`. Over time this reveals which ICP/channel produces the highest-value signups.

---

## Build order

1. `marketing_tasks` table in Supabase
2. Prompt templates in `tasks/marketing-agent/prompts/{icp}/{channel}.md`
3. Generator script (`tasks/marketing-agent/run.ts`) with structured output
4. Weekly `marketing.yml` GitHub Actions workflow (runs generator)
5. `/admin/marketing` dashboard in Next.js — draft list with approve/reject
6. Buffer account + connect platforms (Reddit, Twitter, Dev.to)
7. Playwright HN session — one-time manual login, save `storageState`
8. ICP-aware nudge email — URL pattern matching in existing email infra
9. UTM signup counter — query on next weekly run, log to `result`

---

## Verification checklist

- [ ] Generator `--dry-run` reads state, selects correct ICP/channel, writes structured draft to Supabase
- [ ] Draft appears in `/admin/marketing` dashboard with correct fields
- [ ] Approve action triggers Buffer API call with UTM-tagged link
- [ ] Buffer confirms post published → `marketing_tasks.status` updates to `published`
- [ ] HN Playwright script loads saved session and posts without login prompt
- [ ] Session expiry triggers email notification to re-authenticate
- [ ] Nudge email selects correct copy variant based on tracked URL pattern
- [ ] Weekly run queries signup delta and logs to `result`
