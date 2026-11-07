import { describe, expect, it } from 'vitest'
import { activeFilterCount } from './useList'

describe('activeFilterCount', () => {
  it('counts the set filters except the primary ones', () => {
    expect(activeFilterCount({ q: 'x', status: 'active', role: '', mine: false, group_id: null })).toBe(1)
    expect(activeFilterCount({ q: 'x', model: 'm', status: 'active' }, ['q', 'model'])).toBe(1)
  })
})
