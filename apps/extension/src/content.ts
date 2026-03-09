/**
 * Peek content script — visual element picker + side panel
 *
 * Loaded on all pages via manifest content_scripts. Activates only when it
 * receives a START_PICKER message from the popup. All UI lives inside a Shadow
 * DOM root to avoid CSS collisions with the host page.
 */

import {
  generateCssSelector,
  generateXPath,
  formatSelector,
  parseSelectorType,
  type SelectorType,
} from '@peek/selector'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthStorage {
  accessToken?: string
}

// ─── State ────────────────────────────────────────────────────────────────────

let hoveredEl: Element | null = null
let lockedEl: Element | null = null
let selectorMode: SelectorType = 'css'
let currentSelector = ''
let shadowHost: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let highlightEl: HTMLElement | null = null
let panelEl: HTMLElement | null = null
let toolbarEl: HTMLElement | null = null

// Light theme tokens to mirror the web app
const THEME = {
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  ghost: '#F1F5F9',
  line: 'rgba(15,23,42,0.12)',
  lineSubtle: 'rgba(15,23,42,0.08)',
  ink: '#0F172A',
  inkSoft: '#1E293B',
  inkMuted: '#475569',
  accent: '#22C55E',
  accentHover: '#16A34A',
}

// ─── Private network guard ────────────────────────────────────────────────────

const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /\.local$/i,
]

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_PATTERNS.some((r) => r.test(hostname))
}

// ─── Initialise ──────────────────────────────────────────────────────────────

function init() {
  if (document.getElementById('__peek_host__')) return // already injected

  if (isPrivateHostname(window.location.hostname)) {
    showPrivateNetworkMessage()
    return
  }

  shadowHost = document.createElement('div')
  shadowHost.id = '__peek_host__'
  shadowHost.style.cssText =
    'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
  document.body.appendChild(shadowHost)
  shadow = shadowHost.attachShadow({ mode: 'open' })

  // Highlight outline
  highlightEl = document.createElement('div')
  highlightEl.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483646;
    outline: 2px solid ${THEME.accent}; outline-offset: 1px;
    background: rgba(34,197,94,0.08); border-radius: 3px;
    transition: top 0.05s, left 0.05s, width 0.05s, height 0.05s;
  `
  shadow.appendChild(highlightEl)

  // Top banner
  const banner = document.createElement('div')
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; pointer-events: auto;
    background: ${THEME.ink}; color: ${THEME.surface}; font: 600 12px/1.4 'Inter', -apple-system, system-ui, sans-serif;
    padding: 8px 12px; display: flex; align-items: center; gap: 10px; z-index: 2147483647;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  `
  banner.innerHTML = `<span style="letter-spacing:0.02em">Peek — click any element to select it</span><span style="margin-left:auto;opacity:.75;font-size:11px">Esc to cancel</span>`
  shadow.appendChild(banner)

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('contextmenu', suppressEvent, true)
  document.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
}

function showPrivateNetworkMessage() {
  shadowHost = document.createElement('div')
  shadowHost.id = '__peek_host__'
  shadowHost.style.cssText =
    'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
  document.body.appendChild(shadowHost)
  shadow = shadowHost.attachShadow({ mode: 'open' })

  const banner = document.createElement('div')
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; pointer-events: auto;
    background: #7f1d1d; color: ${THEME.surface}; font: 600 12px/1.4 'Inter', -apple-system, system-ui, sans-serif;
    padding: 8px 12px; display: flex; align-items: center; gap: 10px; z-index: 2147483647;
  `
  banner.innerHTML = `
    <span>Peek can't track pages on private networks (${escapeHtml(window.location.hostname)})</span>
    <button id="__peek_close__" style="margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;font-size:16px;line-height:1;opacity:.8">×</button>
  `
  shadow.appendChild(banner)

  document.addEventListener('keydown', onKeyDown, true)
  banner.querySelector('#__peek_close__')!.addEventListener('click', cleanup)
}

function cleanup() {
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('contextmenu', suppressEvent, true)
  document.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
  shadowHost?.remove()
  shadowHost = null
  shadow = null
  highlightEl = null
  panelEl = null
  toolbarEl = null
  hoveredEl = null
  lockedEl = null
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent) {
  if (lockedEl) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === shadowHost) return
  hoveredEl = el
  positionHighlight(el)
}

function onClick(e: MouseEvent) {
  // Clicks inside the Shadow DOM (panel, toolbar) are retargeted to shadowHost —
  // let those through so buttons work.
  if (e.target === shadowHost) return
  suppressEvent(e)
  if (lockedEl) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === shadowHost) return
  lockElement(el)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    suppressEvent(e)
    cleanup()
  }
}

function suppressEvent(e: Event) {
  if ((e as MouseEvent).target === shadowHost) return
  e.stopPropagation()
  e.preventDefault()
}

function onScroll() {
  if (lockedEl) positionHighlight(lockedEl)
  if (toolbarEl && lockedEl) positionToolbar(lockedEl)
}

// ─── Highlight ────────────────────────────────────────────────────────────────

function positionHighlight(el: Element) {
  if (!highlightEl) return
  const r = el.getBoundingClientRect()
  highlightEl.style.cssText += `
    top: ${r.top}px; left: ${r.left}px;
    width: ${r.width}px; height: ${r.height}px;
    display: block;
  `
}

// ─── Lock + toolbar ───────────────────────────────────────────────────────────

function lockElement(el: Element) {
  lockedEl = el
  selectorMode = 'css'
  currentSelector = generateCssSelector(el)

  if (highlightEl) {
    highlightEl.style.outline = `2px solid ${THEME.accent}`
    highlightEl.style.background = 'rgba(34,197,94,0.10)'
  }

  renderToolbar(el)
  renderPanel()
}

function renderToolbar(el: Element) {
  if (!shadow) return
  toolbarEl?.remove()

  const tag = el.tagName.toLowerCase()
  const hint = el.id ? `#${el.id}` : el.classList[0] ? `.${el.classList[0]}` : ''

  toolbarEl = document.createElement('div')
  toolbarEl.style.cssText = `
    position: fixed; pointer-events: auto; z-index: 2147483647;
    background: ${THEME.ink}; color: ${THEME.surface}; border-radius: 8px;
    font: 12px/1.2 'Inter', -apple-system, system-ui, sans-serif;
    display: flex; align-items: center; gap: 4px; padding: 6px 9px;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
    border: 1px solid ${THEME.line};
  `
  toolbarEl.innerHTML = `
    <button id="__peek_up__" style="background:${THEME.surface};border:1px solid ${THEME.line};color:${THEME.ink};cursor:pointer;padding:2px 6px;border-radius:6px;font-size:12px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.08)">↑</button>
    <span style="opacity:.75;font-size:11px;color:${THEME.surface}">${tag}${hint}</span>
    <button id="__peek_down__" style="background:${THEME.surface};border:1px solid ${THEME.line};color:${THEME.ink};cursor:pointer;padding:2px 6px;border-radius:6px;font-size:12px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.08)">↓</button>
  `
  shadow.appendChild(toolbarEl)
  positionToolbar(el)

  toolbarEl.querySelector('#__peek_up__')!.addEventListener('click', () => {
    if (lockedEl?.parentElement && lockedEl.parentElement !== document.documentElement) {
      lockedEl = lockedEl.parentElement
      updateSelection(lockedEl)
    }
  })
  toolbarEl.querySelector('#__peek_down__')!.addEventListener('click', () => {
    if (lockedEl?.firstElementChild) {
      lockedEl = lockedEl.firstElementChild
      updateSelection(lockedEl)
    }
  })
}

function positionToolbar(el: Element) {
  if (!toolbarEl) return
  const r = el.getBoundingClientRect()
  const top = Math.max(r.bottom + 6, 36)
  toolbarEl.style.top = `${top}px`
  toolbarEl.style.left = `${r.left}px`
}

function updateSelection(el: Element) {
  positionHighlight(el)
  positionToolbar(el)
  currentSelector = buildSelector(el, selectorMode)
  updatePanelSelector()
  updatePanelPreview()

  // Update toolbar tag hint
  const tag = el.tagName.toLowerCase()
  const hint = el.id ? `#${el.id}` : el.classList[0] ? `.${el.classList[0]}` : ''
  const span = toolbarEl?.querySelector('span')
  if (span) span.textContent = `${tag}${hint}`
}

// ─── Selector helpers ─────────────────────────────────────────────────────────

function buildSelector(el: Element, mode: SelectorType): string {
  if (mode === 'css') return generateCssSelector(el)
  if (mode === 'xpath') return formatSelector('xpath', generateXPath(el))
  // text= mode: use the element's trimmed text content
  return formatSelector('text', el.textContent?.trim().slice(0, 100) ?? '')
}

function evaluateSelector(selector: string): Element[] {
  const { type, value } = parseSelectorType(selector)
  try {
    if (type === 'css') return Array.from(document.querySelectorAll(value))
    if (type === 'xpath') {
      const result = document.evaluate(
        value,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      )
      const els: Element[] = []
      for (let i = 0; i < result.snapshotLength; i++) {
        const n = result.snapshotItem(i)
        if (n instanceof Element) els.push(n)
      }
      return els
    }
    if (type === 'text') {
      return Array.from(document.querySelectorAll('*')).filter((el) =>
        el.textContent?.trim().includes(value),
      )
    }
  } catch {
    /* invalid selector */
  }
  return []
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function renderPanel() {
  if (!shadow) return
  panelEl?.remove()

  const preview = lockedEl?.textContent?.trim() ?? ''

  panelEl = document.createElement('div')
  panelEl.style.cssText = `
    position: fixed; top: 0; right: 0; bottom: 0; width: 320px;
    background: ${THEME.surface}; border-left: 1px solid ${THEME.line};
    font: 13px/1.6 'Inter', -apple-system, system-ui, sans-serif; color: ${THEME.ink};
    display: flex; flex-direction: column; z-index: 2147483647;
    pointer-events: auto; overflow: hidden;
    box-shadow: -6px 0 28px rgba(15,23,42,0.14);
  `
  const logoSrc = chrome.runtime.getURL('icons/icon48.png')
  panelEl.innerHTML = `
    <div style="padding:14px 14px 12px;border-bottom:1px solid ${THEME.line};display:flex;align-items:center;gap:10px;background:${THEME.surface};position:sticky;top:0;z-index:1">
      <img src="${logoSrc}" alt="Peek logo" style="width:20px;height:20px" />
      <div style="display:flex;flex-direction:column;gap:1px;align-items:flex-start">
        <strong style="font-size:14px;letter-spacing:-0.01em">Peek</strong>
      </div>
      <button id="__peek_cancel__" style="margin-left:auto;background:none;border:none;cursor:pointer;color:${THEME.inkMuted};font-size:18px;line-height:1;padding:4px;transition:color .15s" aria-label="Close">×</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:14px;background:${THEME.canvas}">
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${THEME.inkMuted};display:block;margin-bottom:6px">Selector type</label>
        <div id="__peek_mode__" style="display:flex;gap:6px">
          ${(['css', 'xpath', 'text'] as SelectorType[])
            .map(
              (m) => `
            <button data-mode="${m}" style="
              flex:1;padding:7px 8px;border-radius:8px;font-size:12px;cursor:pointer;
              border:1px solid ${m === selectorMode ? THEME.accent : THEME.line};
              background:${m === selectorMode ? THEME.accent : THEME.surface};
              color:${m === selectorMode ? '#0B1220' : THEME.inkSoft};
              font-weight:${m === selectorMode ? '700' : '500'};
              box-shadow:${m === selectorMode ? '0 6px 16px rgba(34,197,94,0.25)' : 'none'};
              transition: border-color .15s, box-shadow .15s;
            ">${m.toUpperCase()}</button>
          `,
            )
            .join('')}
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${THEME.inkMuted};display:block;margin-bottom:6px">Selector</label>
        <textarea id="__peek_selector__" rows="3" style="
          width:100%;padding:9px 11px;border:1px solid ${THEME.line};border-radius:8px;
          font:12px/1.6 'Menlo','Monaco',monospace;resize:vertical;
          box-sizing:border-box;outline:none;background:${THEME.surface};color:${THEME.inkSoft};
          box-shadow: inset 0 1px 2px rgba(15,23,42,0.04);
        ">${currentSelector}</textarea>
        <p id="__peek_sel_status__" style="font-size:11px;color:${THEME.inkMuted};margin-top:6px"></p>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${THEME.inkMuted};display:block;margin-bottom:6px">Content preview</label>
        <div id="__peek_preview__" style="
          font-size:12px;line-height:1.6;color:${THEME.inkSoft};
          background:${THEME.ghost};border:1px solid ${THEME.line};border-radius:8px;
          padding:10px 12px;max-height:140px;overflow-y:auto;
          white-space:pre-wrap;word-break:break-word;
        ">${escapeHtml(preview.slice(0, 500))}</div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${THEME.inkMuted};display:block;margin-bottom:6px">URL</label>
        <p style="font-size:12px;color:${THEME.inkSoft};word-break:break-all">${escapeHtml(window.location.href)}</p>
      </div>
    </div>
    <div style="padding:12px 14px;border-top:1px solid ${THEME.line};display:flex;gap:8px;background:${THEME.surface}">
      <button id="__peek_save__" style="
        flex:1;padding:11px;background:${THEME.accent};color:#0B1220;border:none;
        border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;
        box-shadow:0 10px 30px rgba(34,197,94,0.35);
      ">Save to Peek</button>
    </div>
    <div id="__peek_toast__" style="
      position:absolute;bottom:60px;left:14px;right:14px;
      padding:10px 12px;border-radius:8px;font-size:12px;
      display:none;text-align:center;font-weight:600;
    "></div>
  `
  shadow.appendChild(panelEl)

  // Mode toggle
  panelEl.querySelector('#__peek_mode__')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-mode]') as HTMLElement | null
    if (!btn || !lockedEl) return
    selectorMode = btn.dataset['mode'] as SelectorType
    currentSelector = buildSelector(lockedEl, selectorMode)
    // Re-render mode buttons
    panelEl!.querySelectorAll('[data-mode]').forEach((b: Element) => {
      const el = b as HTMLElement
      const active = el.dataset['mode'] === selectorMode
      el.style.border = `1px solid ${active ? THEME.accent : THEME.line}`
      el.style.background = active ? THEME.accent : THEME.surface
      el.style.color = active ? '#0B1220' : THEME.inkSoft
      el.style.fontWeight = active ? '700' : '500'
      el.style.boxShadow = active ? '0 6px 16px rgba(34,197,94,0.25)' : 'none'
    })
    updatePanelSelector()
    updatePanelPreview()
  })

  // Selector textarea live update
  let debounce: ReturnType<typeof setTimeout>
  panelEl.querySelector('#__peek_selector__')!.addEventListener('input', (e) => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      currentSelector = (e.target as HTMLTextAreaElement).value.trim()
      applyLiveSelector()
    }, 300)
  })

  // Cancel
  panelEl.querySelector('#__peek_cancel__')!.addEventListener('click', cleanup)

  // Save
  panelEl.querySelector('#__peek_save__')!.addEventListener('click', saveItem)

  updatePanelSelectorStatus(evaluateSelector(currentSelector).length)
}

function updatePanelSelector() {
  const ta = panelEl?.querySelector('#__peek_selector__') as HTMLTextAreaElement | null
  if (ta) ta.value = currentSelector
  updatePanelSelectorStatus(evaluateSelector(currentSelector).length)
}

function updatePanelPreview() {
  const matches = evaluateSelector(currentSelector)
  const text = matches[0]?.textContent?.trim().slice(0, 500) ?? ''
  const div = panelEl?.querySelector('#__peek_preview__')
  if (div) div.innerHTML = escapeHtml(text)
}

function updatePanelSelectorStatus(matchCount: number) {
  const p = panelEl?.querySelector('#__peek_sel_status__')
  if (!p) return
  if (matchCount === 0) {
    p.textContent = 'No elements match'
    ;(p as HTMLElement).style.color = '#ef4444'
  } else if (matchCount === 1) {
    p.textContent = 'Matches 1 element ✓'
    ;(p as HTMLElement).style.color = '#10b981'
  } else {
    p.textContent = `Matches ${matchCount} elements`
    ;(p as HTMLElement).style.color = '#f59e0b'
  }
}

function applyLiveSelector() {
  const matches = evaluateSelector(currentSelector)
  updatePanelSelectorStatus(matches.length)
  if (matches[0]) positionHighlight(matches[0])
  updatePanelPreview()
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveItem() {
  const saveBtn = panelEl?.querySelector('#__peek_save__') as HTMLButtonElement | null
  if (!saveBtn) return

  saveBtn.disabled = true
  saveBtn.textContent = 'Saving…'

  const auth = (await chrome.runtime.sendMessage({ type: 'GET_AUTH' })) as AuthStorage

  if (!auth.accessToken) {
    showToast('Session expired — please sign in again', 'error')
    await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' })
    saveBtn.disabled = false
    saveBtn.textContent = 'Save to Peek'
    return
  }

  try {
    const res = await fetch('https://peek.bushbaby.dev/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ url: window.location.href, selector: currentSelector }),
    })

    if (res.status === 401) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' })
      showToast('Session expired — please sign in again', 'error')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save to Peek'
      return
    }

    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      showToast(body.error ?? 'Something went wrong', 'error')
      saveBtn.disabled = false
      saveBtn.textContent = 'Save to Peek'
      return
    }

    showToast('Added to Peek ✓', 'success')
    setTimeout(cleanup, 1500)
  } catch {
    showToast('Network error — please try again', 'error')
    saveBtn.disabled = false
    saveBtn.textContent = 'Save to Peek'
  }
}

function showToast(msg: string, kind: 'success' | 'error') {
  const toast = panelEl?.querySelector('#__peek_toast__') as HTMLElement | null
  if (!toast) return
  toast.textContent = msg
  toast.style.display = 'block'
  toast.style.background = kind === 'success' ? '#d1fae5' : '#fee2e2'
  toast.style.color = kind === 'success' ? '#065f46' : '#991b1b'
  if (kind === 'success') return // stays until cleanup
  setTimeout(() => {
    toast.style.display = 'none'
  }, 3000)
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'START_PICKER') init()
})
