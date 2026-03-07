/**
 * @peek/selector
 *
 * Shared selector parsing and generation logic used by both the Peek worker
 * (Node.js / @peek/checker) and the browser extension content script.
 * Zero runtime dependencies — safe to import in any environment.
 */

export type SelectorType = 'css' | 'xpath' | 'text'

export interface ParsedSelector {
  type: SelectorType
  value: string
}

/**
 * Parse a selector string into its type and bare value.
 *
 * Wire formats:
 *   css=   (default, prefix optional)  — standard CSS selector
 *   xpath= — XPath expression, e.g. xpath=//span[@itemprop="price"]
 *   text=  — text content match, e.g. text=In stock
 */
export function parseSelectorType(selector: string): ParsedSelector {
  if (selector.startsWith('xpath=')) return { type: 'xpath', value: selector.slice(6) }
  if (selector.startsWith('text=')) return { type: 'text', value: selector.slice(5) }
  return { type: 'css', value: selector }
}

/**
 * Format a bare value back into its wire-format selector string.
 */
export function formatSelector(type: SelectorType, value: string): string {
  if (type === 'xpath') return `xpath=${value}`
  if (type === 'text') return `text=${value}`
  return value
}

// ─── Browser-only: selector generation ───────────────────────────────────────
// These functions operate on live DOM elements and must only be called in a
// browser context (extension content script).

/**
 * Generate a short, stable CSS selector that uniquely identifies `el` within
 * the current document.
 *
 * Strategy: #id → unique .class combo → tag[attr] → nth-child path
 */
export function generateCssSelector(el: Element): string {
  if (el.id) {
    const selector = `#${CSS.escape(el.id)}`
    if (document.querySelectorAll(selector).length === 1) return selector
  }

  // Try a class combination
  if (el.classList.length > 0) {
    const classes = Array.from(el.classList)
      .map((c) => `.${CSS.escape(c)}`)
      .join('')
    const withTag = `${el.tagName.toLowerCase()}${classes}`
    if (document.querySelectorAll(withTag).length === 1) return withTag
    if (document.querySelectorAll(classes).length === 1) return classes
  }

  // nth-child path up to <body>
  return buildNthChildPath(el)
}

function buildNthChildPath(el: Element): string {
  const parts: string[] = []
  let node: Element | null = el

  while (node && node !== document.documentElement) {
    const parentEl: Element | null = node.parentElement
    if (!parentEl) break

    const tag = node.tagName.toLowerCase()
    const curTag = node.tagName
    const siblings = Array.from(parentEl.children).filter(
      (c: Element) => c.tagName === curTag,
    )
    const index = siblings.indexOf(node) + 1
    parts.unshift(siblings.length === 1 ? tag : `${tag}:nth-child(${index})`)
    node = parentEl
  }

  return parts.join(' > ')
}

/**
 * Generate an absolute XPath expression that uniquely identifies `el`.
 */
export function generateXPath(el: Element): string {
  const parts: string[] = []
  let node: Element | null = el

  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const parentEl: Element | null = node.parentElement
    const tag = node.tagName.toLowerCase()
    const curTag = node.tagName

    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter((c: Element) => c.tagName === curTag)
      const index = siblings.indexOf(node) + 1
      parts.unshift(siblings.length === 1 ? tag : `${tag}[${index}]`)
    } else {
      parts.unshift(tag)
    }

    node = parentEl
  }

  return '/' + parts.join('/')
}
