import { describe, it, expect } from 'vitest'
import { decideNotification } from './notify'

const HASH_A = 'aaaa'
const HASH_B = 'bbbb'

// ─── selector_missing ────────────────────────────────────────────────────────

describe('selector_missing', () => {
  const missing = { error: 'selector_missing' }

  it('notifies when selector disappears from ok', () => {
    expect(decideNotification('ok', HASH_A, missing)).toMatchObject({ kind: 'error', status: 'selector_missing' })
  })

  it('notifies when selector disappears from changed', () => {
    expect(decideNotification('changed', HASH_A, missing)).toMatchObject({ kind: 'error', status: 'selector_missing' })
  })

  it('does not notify when already missing', () => {
    expect(decideNotification('selector_missing', null, missing)).toEqual({ kind: 'none' })
  })

  it('does not notify on first check (never found)', () => {
    expect(decideNotification(null, null, missing)).toEqual({ kind: 'none' })
  })

  it('does not notify when previously an error', () => {
    expect(decideNotification('error', null, missing)).toEqual({ kind: 'none' })
  })
})

// ─── error ───────────────────────────────────────────────────────────────────

describe('error', () => {
  const err = { error: 'network timeout' }

  it('notifies on first error (null → error)', () => {
    expect(decideNotification(null, null, err)).toMatchObject({ kind: 'error', status: 'error' })
  })

  it('notifies when transitioning from ok to error', () => {
    expect(decideNotification('ok', HASH_A, err)).toMatchObject({ kind: 'error', status: 'error' })
  })

  it('notifies when transitioning from changed to error', () => {
    expect(decideNotification('changed', HASH_A, err)).toMatchObject({ kind: 'error', status: 'error' })
  })

  it('notifies when transitioning from selector_missing to error', () => {
    expect(decideNotification('selector_missing', null, err)).toMatchObject({ kind: 'error', status: 'error' })
  })

  it('does not notify when already in error state', () => {
    expect(decideNotification('error', null, err)).toEqual({ kind: 'none' })
  })
})

// ─── content changed ─────────────────────────────────────────────────────────

describe('content changed', () => {
  it('notifies when hash changes', () => {
    expect(decideNotification('ok', HASH_A, { newHash: HASH_B })).toEqual({ kind: 'changed' })
  })

  it('does not notify when hash is unchanged', () => {
    expect(decideNotification('ok', HASH_A, { newHash: HASH_A })).toEqual({ kind: 'none' })
  })

  it('does not notify on first successful check (no baseline)', () => {
    expect(decideNotification(null, null, { newHash: HASH_A })).toEqual({ kind: 'none' })
  })

  it('notifies when selector comes back after missing (same hash as before)', () => {
    expect(decideNotification('selector_missing', HASH_A, { newHash: HASH_A })).toEqual({ kind: 'changed' })
  })

  it('notifies when selector comes back after missing (different hash)', () => {
    expect(decideNotification('selector_missing', HASH_A, { newHash: HASH_B })).toEqual({ kind: 'changed' })
  })

  it('notifies when selector comes back after missing (null previous hash)', () => {
    expect(decideNotification('selector_missing', null, { newHash: HASH_A })).toEqual({ kind: 'changed' })
  })
})
