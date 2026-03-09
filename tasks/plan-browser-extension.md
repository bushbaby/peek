# Execution Plan: Peek Browser Extension

Ordered by dependency. Each phase must be complete and typechecking before the next begins.

---

## Phase 1 — Shared foundation (monorepo, no extension yet)

These two tasks touch existing code and can ship independently of the extension itself.

### Step 1 · Extract `@peek/selector` package

**Why first:** Everything downstream (worker and extension) imports from it. Doing it first means no logic is duplicated and the type contract is locked in.

**Files:**

- Create `packages/selector/package.json`, `tsconfig.json`, `tsup.config.ts`
- Create `packages/selector/src/index.ts` — move `parseSelectorType()` + `SelectorType` type from `packages/checker/src/fetch.ts` here; add `generateXPath(el: Element): string` and `generateCssSelector(el: Element): string` stubs (used later by the content script)
- Update `packages/checker/src/fetch.ts` to import from `@peek/selector` instead of defining locally
- Add `@peek/selector` to the root `pnpm-workspace.yaml` if not implicit
- Verify: `pnpm typecheck` passes in checker

### Step 2 · `POST /api/items` endpoint in the web app

**Why now:** Needed before the extension can save anything. Build and test it in isolation using `curl` before the extension exists.

**Files:**

- `apps/web/src/app/api/items/route.ts` — `POST` handler:
  - Reads `Authorization: Bearer <token>` header
  - Calls `supabase.auth.getUser(token)` to validate
  - Validates body: `{ url, selector, label? }`
  - Inserts row via existing DB logic; returns `201 + item` or `401`/`422`
- `apps/web/next.config.ts` (or equivalent) — add CORS headers for `chrome-extension://*` on `/api/items`

### Step 3 · `/auth/extension-callback` page in the web app

**Why now:** The extension auth flow (Step 6) depends on this page existing.

**Files:**

- `apps/web/src/app/auth/extension-callback/page.tsx` — client component:
  - On mount: reads Supabase session via `supabase.auth.getSession()`
  - Calls `window.postMessage({ type: 'PEEK_TOKEN', accessToken, refreshToken }, '*')`
  - Then calls `window.close()`
  - Shows a brief "Connecting to extension…" state while waiting
- This page must be reachable at the Supabase OAuth callback URL — add it to the Supabase allowed redirect URLs list

---

## Phase 2 — Extension scaffold

### Step 4 · `apps/extension/` package skeleton

**Files:**

- `apps/extension/package.json` — name `@peek/extension`, scripts: `dev`, `build`
- `apps/extension/manifest.json` (MV3):
  ```json
  {
    "manifest_version": 3,
    "name": "Peek",
    "permissions": ["activeTab", "storage", "scripting"],
    "background": { "service_worker": "dist/background.js" },
    "action": { "default_popup": "popup.html" },
    "content_scripts": [
      {
        "matches": ["https://peek.bushbaby.dev/auth/extension-callback"],
        "js": ["dist/auth-relay.js"]
      }
    ]
  }
  ```
- `apps/extension/vite.config.ts` — multi-entry build: `popup`, `background`, `content` (picker), `auth-relay`
- `apps/extension/src/background.ts` — empty service worker stub
- `apps/extension/src/popup.ts` + `apps/extension/popup.html` — "Hello Peek" stub
- `apps/extension/src/content.ts` — injected picker stub (logs `"content script loaded"`)
- `apps/extension/src/auth-relay.ts` — listens for `PEEK_TOKEN` postMessage, stubs forwarding
- Verify: `pnpm build` produces `dist/` loadable in Chrome without errors

---

## Phase 3 — Authentication

### Step 5 · Token storage in background service worker

**Files:**

- `apps/extension/src/background.ts`:
  - `chrome.runtime.onMessage` listener: handles `STORE_TOKEN` message → saves `accessToken` + `refreshToken` to `chrome.storage.local`
  - Handles `GET_AUTH` message → returns stored tokens (or null)
  - Handles `CLEAR_AUTH` message → clears storage

### Step 6 · Auth relay content script

**Files:**

- `apps/extension/src/auth-relay.ts`:
  - Listens for `window.postMessage` where `event.data.type === 'PEEK_TOKEN'`
  - Validates origin is `https://peek.bushbaby.dev`
  - Sends `STORE_TOKEN` to background via `chrome.runtime.sendMessage`

### Step 7 · Popup login / logout UI

**Files:**

- `apps/extension/popup.html` + `apps/extension/src/popup.ts`:
  - On load: sends `GET_AUTH` to background; renders logged-in or logged-out state
  - **Logged out:** "Sign in to Peek" button → opens `https://peek.bushbaby.dev/auth/extension-callback` in new tab via `chrome.tabs.create`
  - **Logged in:** shows email (decode from JWT), "Pick element" button (disabled until on a real tab), "Sign out" button → sends `CLEAR_AUTH`
  - "Pick element" is disabled on extension pages (`chrome://`, `chrome-extension://`)

---

## Phase 4 — Element picker (content script)

### Step 8 · Hover highlight

**Files:**

- `apps/extension/src/content.ts`:
  - Injected via `chrome.scripting.executeScript` from the popup "Pick element" button
  - Creates a Shadow DOM host `<div>` appended to `document.body` for isolated UI
  - Injects a transparent overlay `<div>` (full viewport, `pointer-events: none`) with a highlight `<div>` that follows `mousemove` — positioned using `element.getBoundingClientRect()`
  - Suppresses click / contextmenu default while in pick mode
  - `Escape` key exits and removes all injected DOM

### Step 9 · Click to lock + DOM traversal toolbar

**Files:**

- `apps/extension/src/content.ts` (continued):
  - On click: stores the `lockedElement`, stops hover tracking, freezes highlight outline
  - Renders a small floating toolbar near the element (in the Shadow DOM host):
    - `↑ Parent` button — moves `lockedElement` to `lockedElement.parentElement`; re-runs selector generation
    - `↓ Child` button — moves to `lockedElement.firstElementChild`; disabled if none
    - Tag badge: `lockedElement.tagName.toLowerCase()` + first id or class
  - Toolbar repositions on window scroll/resize

---

## Phase 5 — Selector logic

### Step 10 · CSS selector generation

**Files:**

- `packages/selector/src/index.ts` — implement `generateCssSelector(el: Element): string`:
  - Try `#id` first (if unique in document)
  - Try unique class combination
  - Fall back to `nth-child` path up to document root
  - Must satisfy `document.querySelector(result) === el`
- Unit tests: `packages/selector/src/selector.test.ts`

### Step 11 · XPath generation

**Files:**

- `packages/selector/src/index.ts` — implement `generateXPath(el: Element): string`:
  - Builds absolute XPath: `/html/body/div[2]/span[1]` etc.
  - Must satisfy `document.evaluate(result, document, ...).iterateNext() === el`
- Unit tests in `packages/selector/src/selector.test.ts`

### Step 12 · Selector mode switching in content script

**Files:**

- `apps/extension/src/content.ts`:
  - When element is locked, generate both CSS and XPath for it; store element's `textContent.trim()` for Text= mode
  - Mode toggle (CSS / XPath / Text) in the side panel (Phase 6) drives which value is shown
  - On mode switch: update displayed selector string and re-evaluate highlight

---

## Phase 6 — Side panel

### Step 13 · Side panel UI

**Files:**

- `apps/extension/src/panel.ts` + inline HTML string rendered into the Shadow DOM:
  - CSS / XPath / Text pill toggle
  - Editable `<textarea>` for selector — live re-evaluation updates highlight (debounced 300ms)
  - Read-only content preview `<div>` — shows `lockedElement.textContent.trim()`
  - Label `<input>` — pre-filled with `document.title`
  - URL `<p>` — `window.location.href` (read-only)
  - "Save to Peek" `<button>` (primary)
  - "Cancel" `<button>`
- Panel styled with scoped CSS inside the Shadow DOM — no Tailwind (avoid build complexity)
- Panel width: 320px, slides in from right, scrollable

---

## Phase 7 — Save flow & end-to-end

### Step 14 · Send to Peek API

**Files:**

- `apps/extension/src/panel.ts`:
  - On "Save to Peek": send `GET_AUTH` to background → use `accessToken` as Bearer
  - `POST https://peek.bushbaby.dev/api/items` with `{ url, selector, label }`
  - Success: close panel, remove picker, show toast ("Added to Peek ✓") for 2s
  - 401: toast "Session expired — sign in again", clear token
  - Other error: toast with error message, panel stays open
  - Button shows spinner during request

### Step 15 · End-to-end smoke test

Manual checklist before considering the extension shippable:

- [ ] Sign in from popup, tab closes, popup shows email
- [ ] On a real webpage, click "Pick element", hover highlights elements
- [ ] Click to lock, toolbar appears with correct tag badge
- [ ] ↑ Parent / ↓ Child navigate correctly
- [ ] CSS selector auto-generated and unique on page
- [ ] Switch to XPath — selector updates, highlight stays
- [ ] Switch to Text — pre-fills with element text
- [ ] Edit selector manually — highlight updates in real time
- [ ] Save — item appears in Peek dashboard without page refresh
- [ ] Cancel — all injected UI removed cleanly
- [ ] Escape at any point — all injected UI removed cleanly
- [ ] Sign out from popup — email cleared, button returns to "Sign in"

---

## Dependency graph

```
Step 1 (@peek/selector)
  └─ Step 10 (CSS gen)
  └─ Step 11 (XPath gen)
  └─ Step 12 (mode switching)  ← also needs Step 8+9

Step 2 (API endpoint)
  └─ Step 14 (save flow)

Step 3 (extension-callback page)
  └─ Step 6 (auth relay)
  └─ Step 7 (popup login)

Step 4 (scaffold)
  └─ Step 5 (background token storage)
       └─ Step 6 (auth relay)
       └─ Step 7 (popup UI)
  └─ Step 8 (hover highlight)
       └─ Step 9 (toolbar)
            └─ Step 12 (selector modes)
                 └─ Step 13 (side panel)
                      └─ Step 14 (save flow)
                           └─ Step 15 (smoke test)
```

Steps 1, 2, 3, and 4 can be done in parallel.
Steps 5–7 (auth) and Steps 8–9 (picker) can also be parallelised after Step 4 is done.
