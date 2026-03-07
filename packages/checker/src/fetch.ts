import { load } from 'cheerio'
import { validateUrl } from './validate'
import { parseSelectorType } from '@peek/selector'

export interface FetchOptions {
  /** Max time in ms for Playwright navigation. Default: 15000 */
  timeout?: number
  /** Open a visible browser window instead of running headless (dev only). */
  headed?: boolean
}

export type FetchResult =
  | { html: string; method: 'playwright' | 'static' }
  | { error: string }

/**
 * Fetch a page and extract the innerHTML of the first matching element.
 * Supports CSS selectors (default), XPath (xpath=...), and text matching (text=...).
 * Tries Playwright first (for JS-rendered pages), falls back to a plain HTTP fetch.
 *
 * Playwright's locator() natively handles xpath= and text= prefixes, so all
 * selector types work in both paths.
 */
export async function fetchPage(
  url: string,
  selector: string,
  opts: FetchOptions = {},
): Promise<FetchResult> {
  try {
    await validateUrl(url)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid URL' }
  }

  // Try Playwright (dynamic import — optional dependency).
  // Playwright locator() natively handles css=, xpath=, and text= prefixes.
  try {
    return await fetchWithPlaywright(url, selector, opts.timeout ?? 15_000, opts.headed ?? false)
  } catch {
    // Playwright unavailable or page navigation failed — try static
  }

  return fetchWithStatic(url, selector)
}

async function fetchWithPlaywright(
  url: string,
  selector: string,
  timeout: number,
  headed: boolean,
): Promise<FetchResult> {
  const { chromium } = await import('playwright')

  const browser = await chromium.launch({ headless: !headed })
  try {
    const context = await browser.newContext({
      userAgent: 'Peek/1.0 (+https://peek.bushbaby.dev) Website Change Monitor',
    })
    const page = await context.newPage()

    // Block heavy assets to speed up page loads
    await page.route(
      '**/*.{png,jpg,jpeg,gif,svg,ico,webp,woff,woff2,ttf,eot,mp4,mp3,ogg,css}',
      (route) => route.abort(),
    )

    await page.goto(url, { waitUntil: 'networkidle', timeout })

    // Playwright's locator() natively handles xpath= and text= prefixes
    const element = page.locator(selector).first()
    const count = await element.count()

    if (count === 0) {
      return { error: 'selector_missing' }
    }

    const html = await element.innerHTML({ timeout: 5_000 })
    return { html, method: 'playwright' }
  } finally {
    await browser.close()
  }
}

async function fetchWithStatic(url: string, selector: string): Promise<FetchResult> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Peek/1.0 (+https://peek.bushbaby.dev) Website Change Monitor',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }

  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${res.statusText}` }
  }

  const body = await res.text()
  const { type, value } = parseSelectorType(selector)

  if (type === 'xpath') {
    return extractXPathStatic(body, value)
  }

  const $ = load(body)

  if (type === 'text') {
    // Prefer leaf elements (no child elements) for the most specific match,
    // then fall back to any element containing the text.
    let el = $('*')
      .filter((_, node) => {
        const $node = $(node)
        return $node.children().length === 0 && $node.text().trim().includes(value)
      })
      .first()
    if (!el.length) {
      el = $('*')
        .filter((_, node) => $(node).text().trim().includes(value))
        .first()
    }
    if (!el.length) return { error: 'selector_missing' }
    return { html: el.html() ?? el.text(), method: 'static' }
  }

  // CSS selector (default)
  const el = $(selector)
  if (!el.length) return { error: 'selector_missing' }
  return { html: el.html() ?? '', method: 'static' }
}

/**
 * Evaluate an XPath expression against static HTML using @xmldom/xmldom.
 * Used as the static fallback when Playwright is unavailable.
 */
async function extractXPathStatic(html: string, xpathExpr: string): Promise<FetchResult> {
  try {
    const { DOMParser, XMLSerializer } = await import('@xmldom/xmldom')
    const xpath = await import('xpath')

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const nodes = xpath.select(xpathExpr, doc)

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { error: 'selector_missing' }
    }

    const node = nodes[0] as Node & { nodeType: number; nodeValue?: string; childNodes?: NodeList }

    // Text node — return the text directly
    if (node.nodeType === 3) {
      return { html: node.nodeValue ?? '', method: 'static' }
    }

    // Element node — serialize its children as innerHTML
    const serializer = new XMLSerializer()
    const parts: string[] = []
    const children = node.childNodes
    if (children) {
      for (let i = 0; i < children.length; i++) {
        parts.push(serializer.serializeToString(children.item(i) as Node))
      }
    }
    return { html: parts.join(''), method: 'static' }
  } catch (err) {
    return { error: `XPath error: ${err instanceof Error ? err.message : String(err)}` }
  }
}
