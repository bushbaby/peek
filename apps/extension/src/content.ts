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

// ─── Initialise ──────────────────────────────────────────────────────────────

function init() {
  if (document.getElementById('__peek_host__')) return // already injected

  shadowHost = document.createElement('div')
  shadowHost.id = '__peek_host__'
  shadowHost.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
  document.body.appendChild(shadowHost)
  shadow = shadowHost.attachShadow({ mode: 'open' })

  // Highlight outline
  highlightEl = document.createElement('div')
  highlightEl.style.cssText = `
    position: fixed; pointer-events: none; z-index: 2147483646;
    outline: 2px solid #3b82f6; outline-offset: 1px;
    background: rgba(59,130,246,0.08); border-radius: 2px;
    transition: top 0.05s, left 0.05s, width 0.05s, height 0.05s;
  `
  shadow.appendChild(highlightEl)

  // Top banner
  const banner = document.createElement('div')
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; pointer-events: auto;
    background: #111; color: #fff; font: 500 12px/1 -apple-system, sans-serif;
    padding: 7px 12px; display: flex; align-items: center; gap: 8px; z-index: 2147483647;
  `
  banner.innerHTML = `<span>Peek — click any element to select it</span><span style="margin-left:auto;opacity:.6;font-size:11px">Esc to cancel</span>`
  shadow.appendChild(banner)

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('contextmenu', suppressEvent, true)
  document.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
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
  if (e.key === 'Escape') { suppressEvent(e); cleanup() }
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
    highlightEl.style.outline = '2px solid #10b981'
    highlightEl.style.background = 'rgba(16,185,129,0.08)'
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
    background: #111; color: #fff; border-radius: 6px;
    font: 12px/1 -apple-system, sans-serif;
    display: flex; align-items: center; gap: 4px; padding: 5px 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
  `
  toolbarEl.innerHTML = `
    <button id="__peek_up__" style="background:transparent;border:none;color:#fff;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:12px">↑</button>
    <span style="opacity:.5;font-size:10px">${tag}${hint}</span>
    <button id="__peek_down__" style="background:transparent;border:none;color:#fff;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:12px">↓</button>
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
      const result = document.evaluate(value, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      const els: Element[] = []
      for (let i = 0; i < result.snapshotLength; i++) {
        const n = result.snapshotItem(i)
        if (n instanceof Element) els.push(n)
      }
      return els
    }
    if (type === 'text') {
      return Array.from(document.querySelectorAll('*')).filter(
        (el) => el.textContent?.trim().includes(value),
      )
    }
  } catch { /* invalid selector */ }
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
    background: #fff; border-left: 1px solid #e5e7eb;
    font: 13px/1.5 -apple-system, sans-serif; color: #111;
    display: flex; flex-direction: column; z-index: 2147483647;
    pointer-events: auto; overflow: hidden;
    box-shadow: -2px 0 12px rgba(0,0,0,.08);
  `
  panelEl.innerHTML = `
    <div style="padding:14px 14px 12px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px">
      <strong style="font-size:14px">Peek</strong>
      <button id="__peek_cancel__" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#6b7280;font-size:18px;line-height:1">×</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:6px">Selector type</label>
        <div id="__peek_mode__" style="display:flex;gap:4px">
          ${(['css','xpath','text'] as SelectorType[]).map((m) => `
            <button data-mode="${m}" style="
              flex:1;padding:5px;border-radius:5px;font-size:12px;cursor:pointer;
              border:1px solid ${m === selectorMode ? '#111' : '#d1d5db'};
              background:${m === selectorMode ? '#111' : '#fff'};
              color:${m === selectorMode ? '#fff' : '#374151'};
              font-weight:${m === selectorMode ? '600' : '400'};
            ">${m.toUpperCase()}</button>
          `).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:6px">Selector</label>
        <textarea id="__peek_selector__" rows="3" style="
          width:100%;padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;
          font:12px/1.5 'Menlo','Monaco',monospace;resize:vertical;
          box-sizing:border-box;outline:none;
        ">${currentSelector}</textarea>
        <p id="__peek_sel_status__" style="font-size:11px;color:#6b7280;margin-top:4px"></p>
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:6px">Content preview</label>
        <div id="__peek_preview__" style="
          font-size:12px;line-height:1.5;color:#374151;
          background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;
          padding:8px 10px;max-height:120px;overflow-y:auto;
          white-space:pre-wrap;word-break:break-word;
        ">${escapeHtml(preview.slice(0, 500))}</div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:6px">URL</label>
        <p style="font-size:12px;color:#374151;word-break:break-all">${escapeHtml(window.location.href)}</p>
      </div>
    </div>
    <div style="padding:12px 14px;border-top:1px solid #e5e7eb;display:flex;gap:8px">
      <button id="__peek_save__" style="
        flex:1;padding:9px;background:#111;color:#fff;border:none;
        border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;
      ">Save to Peek</button>
    </div>
    <div id="__peek_toast__" style="
      position:absolute;bottom:60px;left:14px;right:14px;
      padding:10px 12px;border-radius:6px;font-size:12px;
      display:none;text-align:center;font-weight:500;
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
      el.style.border = `1px solid ${active ? '#111' : '#d1d5db'}`
      el.style.background = active ? '#111' : '#fff'
      el.style.color = active ? '#fff' : '#374151'
      el.style.fontWeight = active ? '600' : '400'
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

  const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH' }) as AuthStorage

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
        'Authorization': `Bearer ${auth.accessToken}`,
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
      const body = await res.json() as { error?: string }
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
  setTimeout(() => { toast.style.display = 'none' }, 3000)
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'START_PICKER') init()
})
