import { describe, it, expect } from 'vitest'
import { computeSnapshot, hasChanged } from './snapshot'

describe('computeSnapshot', () => {
  it('produces stable hash for same content', () => {
    const a = computeSnapshot('<span>Hello world</span>')
    const b = computeSnapshot('<span>Hello world</span>')
    expect(a.hash).toBe(b.hash)
  })

  it('produces different hash for different content', () => {
    const a = computeSnapshot('<span>Hello</span>')
    const b = computeSnapshot('<span>World</span>')
    expect(a.hash).not.toBe(b.hash)
  })

  it('snippet strips HTML tags', () => {
    const result = computeSnapshot('<p>Hello <b>world</b></p>')
    expect(result.snippet).not.toContain('<b>')
    expect(result.snippet).not.toContain('<p>')
    expect(result.snippet).toContain('Hello')
    expect(result.snippet).toContain('world')
  })

  it('snippet is capped at 200 characters', () => {
    const longText = 'x'.repeat(300)
    const result = computeSnapshot(`<p>${longText}</p>`)
    expect(result.snippet.length).toBeLessThanOrEqual(200)
  })

  it('returns a SHA-256 hex hash (64 chars)', () => {
    const result = computeSnapshot('<div>test</div>')
    expect(result.hash).toHaveLength(64)
    expect(result.hash).toMatch(/^[a-f0-9]+$/)
  })
})

describe('normalization', () => {
  it('strips HTML comments before hashing', () => {
    const a = computeSnapshot('<div>Price: $9<!-- tracking --></div>')
    const b = computeSnapshot('<div>Price: $9</div>')
    expect(a.hash).toBe(b.hash)
  })

  it('strips inline script tags before hashing', () => {
    const a = computeSnapshot('<div>$9<script>window.__id="abc123"</script></div>')
    const b = computeSnapshot('<div>$9</div>')
    expect(a.hash).toBe(b.hash)
  })

  it('strips inline style tags before hashing', () => {
    const a = computeSnapshot('<div>$9<style>.x{color:red}</style></div>')
    const b = computeSnapshot('<div>$9</div>')
    expect(a.hash).toBe(b.hash)
  })

  it('normalizes multiple whitespace to single space before hashing', () => {
    const a = computeSnapshot('Price:    $9.99   in stock')
    const b = computeSnapshot('Price: $9.99 in stock')
    expect(a.hash).toBe(b.hash)
  })

  it('normalizes <time> display text but keeps datetime attribute', () => {
    const a = computeSnapshot('<time datetime="2026-03-07T06:42:00Z">46 min. geleden</time>')
    const b = computeSnapshot('<time datetime="2026-03-07T06:42:00Z">2 uur geleden</time>')
    expect(a.hash).toBe(b.hash)
  })

  it('detects new articles when the datetime itself changes', () => {
    const a = computeSnapshot('<time datetime="2026-03-07T06:42:00Z">46 min. geleden</time>')
    const b = computeSnapshot('<time datetime="2026-03-07T09:00:00Z">zojuist</time>')
    expect(a.hash).not.toBe(b.hash)
  })

  it('still detects meaningful content changes', () => {
    const a = computeSnapshot('<div>In stock</div>')
    const b = computeSnapshot('<div>Out of stock</div>')
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('hasChanged', () => {
  it('returns true when hash changes', () => {
    expect(hasChanged('abc', 'def')).toBe(true)
  })

  it('returns false when hash is unchanged', () => {
    expect(hasChanged('abc', 'abc')).toBe(false)
  })

  it('returns true when previous hash is null (first check)', () => {
    expect(hasChanged(null, 'abc')).toBe(true)
  })
})
