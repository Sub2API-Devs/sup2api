import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyFilters, idNumber } from './forms'

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

describe('idNumber', () => {
  it("reads an entity picker's id, 0 (the default group) included", () => {
    expect(['7', '0', '9007199254740991'].map(idNumber)).toEqual([7, 0, Number.MAX_SAFE_INTEGER])
  })

  it('reads no id from nothing, from another spelling of one or from digits a number cannot hold', () => {
    for (const v of ['', ' 7', '007', '00', '-1', '1.5', '1e3', 'abc', '9007199254740993']) expect(idNumber(v)).toBeNaN()
  })
})
