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

### Primary: The Technical Researcher
- Developer or analyst who wants to monitor price/stock/status fields without maintaining a script
- Monitors competitor pricing, job boards, government tender pages, open-source release pages
- Values precision and reliability over pretty dashboards
- Pain: writing and maintaining Python scrapers for simple "has this changed?" tasks

### Secondary: The Power User (non-technical)
- Researcher, journalist, procurement professional
- Monitors specific fields on websites they visit regularly
- Pain: checking the same pages manually, missing changes
- Entry point: the browser extension (visual selector lowers the bar)

### Negative ICP:
- Enterprise needing SLA guarantees or SSO
- Users wanting to scrape structured data at scale (that's a different product)

---

## 3. Key Messages

| Audience | Message |
|---|---|
| Developers | "Replace your one-off scraper with Peek — point, click, get notified." |
| Power users | "Set a watch on any part of any webpage in 30 seconds." |
| Both | "Finally know the moment that thing you're watching actually changes." |

---

## 4. Go-to-Market: Phased Launch

### Phase 1 — Soft launch / community seeding (now)
**Goal:** 50 real users, qualitative feedback loop

**Channels:**
- Post in niche communities where the pain is real:
  - Hacker News "Show HN" post
  - r/webdev, r/sysadmin, r/DataHoarder
  - Dev.to / Hashnode article: *"I replaced my weekend scraper project with 30 lines of Supabase + a browser extension"*
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
1. *"How to monitor a specific element on a webpage for changes"* (replaces DIY tutorials)
2. *"Best website change monitoring tools compared"* (Peek vs Visualping vs Distill vs Wachete)
3. *"Monitor competitor pricing changes without a scraper"*
4. *"Track government tender pages automatically"*

**Distribution:** Dev.to, Hashnode, personal blog with canonical → own domain for SEO

---

## 5. Competitive Positioning

| Tool | How it monitors | Peek advantage |
|---|---|---|
| Visualping | Screenshot diff | Precise DOM element, not visual region |
| Distill | CSS selector (also) | No Chrome extension required to set up; cleaner UX |
| Wachete | Full page / visual | Precision + developer-friendly selector format |
| DIY (Python + cron) | Script | Zero maintenance, GUI for non-devs |

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

| Week | Action |
|---|---|
| 1 | Record demo GIF/video. Write Show HN post draft. |
| 2 | Post Show HN. Collect feedback. Fix top 3 friction points. |
| 3 | Write first comparison article. Post in 2 Reddit communities. |
| 4 | Submit to Product Hunt. Line up supporters. |

---

## 10. Success Metrics

| Metric | Target (30 days) | Target (90 days) |
|---|---|---|
| Registered users | 50 | 300 |
| Active tracked items | 150 | 1 000 |
| Email notifications sent | 200 | 5 000 |
| Organic search impressions | — | 5 000/mo |
| Product Hunt position | Top 10 | — |
