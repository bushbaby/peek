import { createHash } from 'crypto'

export interface Snapshot {
  hash: string
  snippet: string
}

/**
 * Normalize raw innerHTML before hashing to reduce false positives from:
 * - Injected tracking/analytics scripts
 * - Inline styles that change independently of content
 * - HTML comments (often used for debug info or framework markers)
 * - Whitespace variations (indentation, line endings)
 */
function normalizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')            // HTML comments
    .replace(/<script[\s\S]*?<\/script>/gi, '') // inline scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '')   // inline styles
    // Normalize <time> elements: keep the stable datetime attribute, strip the
    // display text ("46 min. geleden", "2 days ago") which changes every check.
    .replace(/<time([^>]*)>[\s\S]*?<\/time>/gi, (_, attrs: string) => {
      const dt = attrs.match(/datetime="([^"]*)"/)
      return dt ? `<time datetime="${dt[1]}"></time>` : '<time></time>'
    })
    .replace(/\s+/g, ' ')                       // collapse whitespace
    .trim()
}

/**
 * Compute a stable hash and short text snippet from an element's innerHTML.
 * Normalizes the HTML before hashing to reduce noise from injected scripts,
 * styles, comments, and whitespace variations.
 */
export function computeSnapshot(innerHTML: string): Snapshot {
  const normalized = normalizeHtml(innerHTML)
  const hash = createHash('sha256').update(normalized).digest('hex')
  const snippet = normalized
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  return { hash, snippet }
}

export function hasChanged(oldHash: string | null, newHash: string): boolean {
  return oldHash !== newHash
}
