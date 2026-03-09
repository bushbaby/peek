# PRD: Peek Browser Extension — Visual Element Selector

## Introduction

A Chrome extension that lets users visually pick any element on any webpage, preview what Peek would capture, configure the item, and send it directly to their Peek account — all without leaving the target page. It eliminates the current friction of manually writing CSS selectors, which requires developer knowledge and trial-and-error.

---

## Goals

- Let non-technical users select a trackable element without knowing CSS
- Preview the captured text content before saving
- Allow the user to broaden or narrow the selection by traversing the DOM tree
- Enable refining the generated selector manually for power users
- Send the configured tracked item to Peek in one flow (no copy-paste)
- Require authentication once; stay logged in via stored token

---

## User Stories

### US-001: Extension scaffold (Manifest V3, Chrome)

**Description:** As a developer, I need a working Chrome extension skeleton so I have a foundation to build on.

**Acceptance Criteria:**

- [ ] `apps/extension/` package in the monorepo with `manifest.json` (Manifest V3)
- [ ] Manifest declares `activeTab`, `storage`, and `scripting` permissions
- [ ] Popup HTML/JS loads without errors in Chrome
- [ ] Content script can be injected into any http/https page
- [ ] `pnpm build` in the extension package produces a loadable `dist/` folder
- [ ] Typecheck passes

### US-002: Login flow in extension popup

**Description:** As a user, I want to log in to Peek from the extension popup so the extension can send items on my behalf.

**Acceptance Criteria:**

- [ ] Popup shows a "Sign in to Peek" button when not authenticated
- [ ] Clicking it opens `https://peek.bushbaby.dev/auth/extension-callback` in a new tab (user authenticates there via the normal GitHub/Google flow)
- [ ] Extension manifest declares a content script scoped to `https://peek.bushbaby.dev/auth/extension-callback` that listens for `window.postMessage`
- [ ] After auth, the `/auth/extension-callback` page reads the Supabase session and calls `window.postMessage({ type: 'PEEK_TOKEN', accessToken, refreshToken }, '*')`
- [ ] The content script receives the message and forwards it to the background worker via `chrome.runtime.sendMessage`; background stores both tokens in `chrome.storage.local`
- [ ] The `/auth/extension-callback` page then closes itself (`window.close()`)
- [ ] Popup shows the logged-in user's email and a "Sign out" button when authenticated
- [ ] Token is cleared on sign-out
- [ ] Typecheck passes

### US-003: Activate element picker from popup

**Description:** As a user, I want to click a button in the extension popup to enter element-pick mode on the current tab.

**Acceptance Criteria:**

- [ ] Popup has an "Pick element" button (disabled if not logged in)
- [ ] Clicking it closes the popup and injects the picker content script into the active tab
- [ ] A visible banner/overlay appears at the top of the page indicating pick mode is active
- [ ] Pressing Escape cancels pick mode and removes all injected UI
- [ ] Typecheck passes

### US-004: Hover highlight and click to select

**Description:** As a user, I want elements to highlight as I move my mouse so I can see what I'm about to select.

**Acceptance Criteria:**

- [ ] Hovering over any element shows a blue highlight outline (not background fill, to avoid layout shift)
- [ ] The highlight follows the mouse without lag
- [ ] Clicking an element locks the selection (highlight turns solid/persistent)
- [ ] Page's default click actions are suppressed while in pick mode (no navigation, no form submission)
- [ ] Typecheck passes

### US-005: DOM tree traversal controls

**Description:** As a user, I want to broaden or narrow my selection by moving up or down the DOM tree so I can capture exactly the right amount of content.

**Acceptance Criteria:**

- [ ] After clicking to lock a selection, a small floating toolbar appears near the element with "↑ Parent" and "↓ Child" buttons
- [ ] "↑ Parent" moves selection up one DOM level and updates the highlight and generated selector
- [ ] "↓ Child" moves selection down to the first child element (disabled if no child elements)
- [ ] The toolbar also shows the current element tag + first class/id for context (e.g. `div.price`)
- [ ] Typecheck passes

### US-006: Selector generation and type switching

**Description:** As a user, I want a selector automatically generated for my selected element, and the ability to switch between selector types to match what the Peek worker supports.

**Background:** The Peek worker (`@peek/checker`) recognises three selector formats stored verbatim in the database:

- Plain CSS (default) — e.g. `#price`, `.stock-badge`
- `xpath=` prefix — e.g. `xpath=//span[@itemprop="price"]`
- `text=` prefix — e.g. `text=In stock`

The extension must produce selectors in this same format.

**Acceptance Criteria:**

- [ ] On element lock, a CSS selector is auto-generated (prefer `#id` → unique `.class` combo → `nth-child` path) and shown in the side panel input
- [ ] A segmented control / pill toggle in the side panel lets the user switch between **CSS**, **XPath**, and **Text** modes
- [ ] Switching to XPath generates the equivalent XPath expression for the locked element; switching to Text pre-fills with the element's trimmed text content (with `text=` prefix)
- [ ] The raw selector string stored in the input always matches the wire format the worker expects (plain for CSS, `xpath=...`, `text=...`)
- [ ] Editing the input live re-evaluates it in the page — for CSS via `document.querySelectorAll`, for XPath via `document.evaluate`, for text= via a substring match — and updates the highlight or shows an error if nothing matches
- [ ] The `parseSelectorType` logic is extracted from `packages/checker/src/fetch.ts` into a new shared package `packages/selector` (`@peek/selector`) so extension and worker import the same function
- [ ] Typecheck passes

### US-007: Side panel with preview and form

**Description:** As a user, I want a side panel to appear with the captured content preview and a form to configure the tracked item before saving.

**Acceptance Criteria:**

- [ ] A side panel slides in from the right of the page when an element is locked (does not use `chrome.sidePanel` API — inject it as a fixed overlay to avoid MV3 complexity)
- [ ] Panel shows:
  - CSS / XPath / Text mode toggle (linked to US-006)
  - Editable selector input (linked to US-006)
  - Preview of the extracted text content of the selected element (plain text, trimmed), re-evaluated whenever the selector or mode changes
  - "Label" text input (optional friendly name, pre-filled with the page `<title>`)
  - "URL" field pre-filled with the current page URL (read-only)
  - "Save to Peek" primary button
  - "Cancel" secondary button
- [ ] Panel is scrollable if content is long
- [ ] Typecheck passes

### US-008: Send tracked item to Peek API

**Description:** As a user, I want clicking "Save to Peek" to create the tracked item in my account immediately.

**Acceptance Criteria:**

- [ ] Clicking "Save to Peek" calls `POST https://peek.bushbaby.dev/api/items` with `{ url, selector, label }` and the stored auth token as a Bearer header
- [ ] On success: panel closes, picker is deactivated, a brief success toast appears on the page ("Added to Peek ✓")
- [ ] On auth error (401): toast says "Session expired — please sign in again" and clears stored token
- [ ] On other error: toast shows the error message and the panel stays open
- [ ] Button shows a loading state while the request is in flight
- [ ] Typecheck passes

### US-009: Peek web app — POST /api/items endpoint

**Description:** As a developer, I need an authenticated API endpoint in the Peek web app that the extension can call to create tracked items.

**Acceptance Criteria:**

- [ ] `POST /api/items` accepts `{ url: string, selector: string, label?: string }` JSON body
- [ ] Request must include a valid Supabase Bearer token in the `Authorization` header
- [ ] Returns `201` with the created item on success
- [ ] Returns `401` if token is missing or invalid
- [ ] Returns `422` with field errors if `url` or `selector` is missing
- [ ] Reuses existing DB insert logic (same as dashboard "Add item")
- [ ] Typecheck passes

---

## Functional Requirements

- **FR-1:** Extension targets Chrome/Chromium with Manifest V3
- **FR-2:** Authentication uses the Peek Supabase session token, stored in `chrome.storage.local`
- **FR-3:** The picker injects a content script that intercepts mousemove and click events globally without breaking the host page
- **FR-4:** The extension and worker share the same selector wire format: plain string = CSS, `xpath=<expr>`, `text=<string>`. This format is defined once in `@peek/selector` and imported by both `@peek/checker` and `apps/extension`.
- **FR-5:** Selector generation (CSS mode) prefers short, stable selectors: `#id` → `.unique-class` → `tag[attr]` → positional `nth-child` path
- **FR-6:** DOM traversal toolbar updates the selector and preview in real time
- **FR-7:** The side panel is a shadow DOM iframe or isolated custom element to avoid CSS collisions with the host page
- **FR-8:** All injected UI is removed cleanly on Cancel, Escape, or successful save
- **FR-9:** The Peek API endpoint validates the auth token server-side via Supabase's `auth.getUser()` — it does not trust any user-supplied identity
- **FR-10:** The extension communicates with its background service worker via `chrome.runtime.sendMessage` for token storage/retrieval

---

## Non-Goals

- No Firefox or Safari support in this version
- No editing of existing tracked items from the extension
- No `chrome.sidePanel` API usage (too new, limited availability)
- No ability to track multiple selectors on the same URL in one flow
- No scheduling or check-frequency configuration from the extension
- No notification settings configuration from the extension
- No offline/queued saves (if the API call fails, the user retries manually)

---

## Technical Considerations

- **Monorepo placement:** `apps/extension/` — a new pnpm package, not part of the Next.js app
- **Build tool:** Vite with `vite-plugin-web-extension` or plain Rollup (no framework needed for the popup; use vanilla TS or Preact to keep bundle small)
- **Content script isolation:** Use a Shadow DOM root for all injected UI to prevent CSS leakage from host pages
- **CORS:** The `/api/items` endpoint must allow requests from `chrome-extension://*` origins
- **Token handoff from web → extension:** A dedicated `/auth/extension-callback` page in the Peek web app handles the Supabase auth callback, then calls `window.postMessage({ type: 'PEEK_TOKEN', accessToken, refreshToken }, '*')`. A content script scoped to that URL intercepts the message and stores the tokens via `chrome.runtime.sendMessage` to the background worker. The web app never needs to know the extension ID.
- **Shared selector package:** Extract `parseSelectorType` from `packages/checker/src/fetch.ts` into `packages/selector/src/index.ts` (`@peek/selector`). This package has zero runtime dependencies and is importable by both Node.js (worker) and browser (extension content script). `@peek/checker` is updated to import from `@peek/selector` instead of defining it locally.
- **Selector uniqueness check:** For CSS use `document.querySelectorAll(selector).length === 1`; for XPath use `document.evaluate(expr, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength === 1`; for text= use a full-text scan of `document.body.innerText`
- **Extension package:** `@peek/extension` in `apps/extension/`

---

## Success Metrics

- A user with no CSS knowledge can track any element on any page in under 30 seconds
- Generated selector correctly matches only the intended element on first try in >90% of cases
- Zero host-page visual regressions caused by injected picker UI (shadow DOM isolation)

---

## Open Questions

- **Label default:** Should the label default to the page `<title>` or the element's own text content (trimmed to 50 chars)?
