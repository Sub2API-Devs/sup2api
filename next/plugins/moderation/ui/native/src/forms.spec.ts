import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyFilters } from './forms'

describe('applyFilters', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('says whether the filters changed, so that the caller reloads an unchanged list itself', () => {
    const filters: Record<string, unknown> = { user_id: '', q: 'a' }
    expect(applyFilters(filters, { user_id: 7 })).toBe(true)
    expect(filters).toEqual({ user_id: 7, q: 'a' })
    vi.runAllTimers()
    expect(applyFilters(filters, { user_id: 7 })).toBe(false)
  })

  it('counts a change of the same task for the search that follows it at once', () => {
    const filters: Record<string, unknown> = { user_id: '' }
    const other: Record<string, unknown> = { user_id: 7 }
    applyFilters(filters, { user_id: 7 })
    // Enter in a picker's text box: the pick applied, then the form's search finds nothing to change.
    expect(applyFilters(filters, { user_id: 7 })).toBe(true)
    expect(applyFilters(other, { user_id: 7 })).toBe(false)
    vi.runAllTimers()
    expect(applyFilters(filters, { user_id: 7 })).toBe(false)
  })
})
