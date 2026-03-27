# Peek — Marketing Plan

---

## 1. Positioning

**What Peek is:**
Peek monitors any element on any webpage and emails you when it changes — no code, no scraping scripts, no cron jobs.

**Positioning statement:**

> For developers and power users who need to stay on top of specific web content, Peek is the no-code change monitor that lets you point at exactly what to watch and get notified the moment it changes — unlike generic website monitoring tools that alert on full-page diffs.

**Key differentiator:** CSS/XPath selector precision. Competitors (Visualping, Distill, Wachete) monitor full pages or rectangular screenshot regions. Peek monitors the exact DOM element you care about.

---

## 2. Ideal Customer Profile (ICP)

### Primary: The Developer Who Killed a Scraper

- **Who:** Solo developer, DevOps engineer, or technical analyst — individual contributor, not a team
- **Trigger event:** Just spent time writing or maintaining a scraper for a trivially simple "did this change?" task, or just had one break
- **Use cases:** Open-source dependency/release monitoring, competitor pricing spot-checks, job board freshness, API status pages, staging vs production diff
- **What they value:** Technical correctness, no-nonsense UX, self-hostable option (trust signal), no vendor lock-in
- **Conversion path:** Discovers via HN or Reddit → reads the technical explanation → signs up and has their first item tracked in 5 minutes
- **Willingness to pay:** Medium — they understand the value but have high DIY tolerance; free tier must genuinely replace the script, not just demo the concept

### Secondary: The High-Stakes Manual Checker

- **Who:** Procurement professional, compliance officer, academic researcher, or journalist — non-technical, but monitoring something that matters
- **Trigger event:** Missed a change and it cost them something — a tender deadline, a competitor price move, a regulatory update, a product restock
- **Use cases:** Government procurement / tender portals, supplier pricing pages, regulatory or policy pages, niche product restock — anything checked on a recurring manual schedule
- **What they value:** Reliability ("will it actually email me?"), simplicity (no CSS knowledge required), and time saved on a repetitive task with real consequences
- **Conversion path:** Searches "get notified when webpage changes" → lands on comparison article or landing page → converts on demo video, not technical copy
- **Willingness to pay:** Higher than Primary — stakes justify a monthly charge, especially if one missed change = real cost

### Tertiary: The Waitlist/Restock Watcher

- **Who:** Anyone waiting on a limited product, GPU drop, concert ticket, visa slot, rental listing
- **Trigger event:** Currently manually refreshing a page multiple times a day
- **Use cases:** GPU/console restocks, visa appointment slots, scholarship/grant portals, apartment listings, limited-edition drops
- **What they value:** Speed (notification latency matters), simplicity, free tier
- **Conversion path:** Word-of-mouth ("I used Peek to catch the RTX drop") or targeted Reddit posts
- **Note:** High volume, lower retention once the item is obtained — good for top-of-funnel visibility and social proof, not the monetisation core

### Negative ICP

- **Sub-minute pollers:** Need infra-grade tooling (Datadog, UptimeRobot) — wrong product, wrong price point
- **Scale scrapers:** Want structured data extraction across hundreds of pages — different product entirely
- **Collaborative teams:** Need shared workspaces, role permissions, audit history — premature for current scope
- **API-first integrations:** Want programmatic setup and webhook output — a future Pro/API tier, not current Peek
- **Enterprise:** SLA, SSO, procurement process — cost of sale too high at current stage

---

## 3. Key Messages

| Audience    | Message                                                                |
| ----------- | ---------------------------------------------------------------------- |
| Developers  | "Replace your one-off scraper with Peek — point, click, get notified." |
| Power users | "Set a watch on any part of any webpage in 30 seconds."                |
| Both        | "Finally know the moment that thing you're watching actually changes." |

---

## 4. Go-to-Market: Phased Launch

### Phase 1 — Soft launch / community seeding (now)

**Goal:** 50 real users, qualitative feedback loop

**Channels:**

- Post in niche communities where the pain is real:
  - Hacker News "Show HN" post
  - r/webdev, r/sysadmin, r/DataHoarder
  - Dev.to / Hashnode article: _"I replaced my weekend scraper project with 30 lines of Supabase + a browser extension"_
- Personal network (direct messages, not mass blast)
- Offer free access in exchange for feedback call

**Message:** Lead with the problem ("tired of checking that page every morning?"), show the 30-second demo GIF.

### Phase 2 — Product Hunt launch

**Goal:** Top 5 of the day, 200+ new signups

**Prep checklist:**

- [ ] Record a 60-second demo video (hover → click → panel → Save to Peek → email arrives)
- [ ] Write a maker comment explaining the technical approach (Shadow DOM, CSS selectors, Supabase Realtime)
- [ ] Line up 10 supporters to upvote and comment in the first hour
- [ ] Time launch for Tuesday or Wednesday, 12:01 AM PST
- [ ] Make the landing page (peek.bushbaby.dev) convert: hero with GIF, one CTA

**Framing:** "No-code web change monitoring — point at what matters, get notified when it changes"

### Phase 3 — Content-led growth

**Goal:** Sustainable organic traffic

**High-intent articles to write:**

1. _"How to monitor a specific element on a webpage for changes"_ (replaces DIY tutorials)
2. _"Best website change monitoring tools compared"_ (Peek vs Visualping vs Distill vs Wachete)
3. _"Monitor competitor pricing changes without a scraper"_
4. _"Track government tender pages automatically"_

**Distribution:** Dev.to, Hashnode, personal blog with canonical → own domain for SEO

---

## 5. Competitive Positioning

| Tool                | How it monitors     | Peek advantage                                     |
| ------------------- | ------------------- | -------------------------------------------------- |
| Visualping          | Screenshot diff     | Precise DOM element, not visual region             |
| Distill             | CSS selector (also) | No Chrome extension required to set up; cleaner UX |
| Wachete             | Full page / visual  | Precision + developer-friendly selector format     |
| DIY (Python + cron) | Script              | Zero maintenance, GUI for non-devs                 |

**Battlecard summary:** Lead with precision and zero setup time. When asked about Distill: acknowledge overlap, emphasize the simpler UX and self-hostable model.

---

## 6. Distribution Channels (Prioritised)

1. **Hacker News** — highest density of early adopters who understand the value immediately
2. **Product Hunt** — discovery moment, press pickup
3. **SEO content** — long-tail, compounds over time
4. **Reddit** (r/DataHoarder, r/webdev, r/sysadmin) — niche but high-intent
5. **Twitter/X** — demo GIFs perform well; developer audience
6. **Extension discoverability** — if/when listed on Chrome Web Store

---

## 7. Activation & Retention

**Time-to-value target:** < 3 minutes from signup to first tracked item

**Activation flow:**

1. Sign in with GitHub (one click)
2. Install extension (one-click "Get extension" from dashboard)
3. Navigate to any page, click Pick element
4. Hit Save — first item tracked

**Retention levers:**

- Email notifications (core value delivery) — every notification is a product impression
- Dashboard shows "last changed" — makes the monitoring visible and satisfying
- Realtime dashboard updates via Supabase keep the dashboard feeling alive

**Churn risk:** Users who never get their first notification email. Fix: nudge email 24h after first item is added — "We're watching. Here's what we'll do when it changes."

---

## 8. Pricing Considerations (for later)

- **Free tier:** 3 tracked items, daily check frequency
- **Pro ($7–9/mo):** Unlimited items, hourly checks, multiple selectors per URL
- **Self-hosted:** Always free — this builds developer trust and word-of-mouth

Free tier should be generous enough to deliver real value and produce word-of-mouth.

---

## 9. 30-Day Action Plan

| Week | Action                                                        |
| ---- | ------------------------------------------------------------- |
| 1    | Record demo GIF/video. Write Show HN post draft.              |
| 2    | Post Show HN. Collect feedback. Fix top 3 friction points.    |
| 3    | Write first comparison article. Post in 2 Reddit communities. |
| 4    | Submit to Product Hunt. Line up supporters.                   |

---

## 10. Success Metrics

| Metric                     | Target (30 days) | Target (90 days) |
| -------------------------- | ---------------- | ---------------- |
| Registered users           | 50               | 300              |
| Active tracked items       | 150              | 1 000            |
| Email notifications sent   | 200              | 5 000            |
| Organic search impressions | —                | 5 000/mo         |
| Product Hunt position      | Top 10           | —                |
