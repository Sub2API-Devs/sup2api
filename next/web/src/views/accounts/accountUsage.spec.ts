import { describe, expect, it } from 'vitest'
import { limitTone, mainCost, usageLimitError, usageLimitReasonDetail, defaultUsageLimit } from './accountUsage'

const figures = { cost: '6.0', raw_cost: '5.0', requests: 1, tokens: 120 }
const limit = (used: string, amount = '200') => ({ amount, used, period: 'week' as const, period_count: 1, window_start: null, window_end: null })

describe('account usage', () => {
  it('counts in raw cost when the raw ratio is on', () => {
    expect(mainCost({ raw_cost_accounting: true }, figures)).toBe(5)
    expect(mainCost({ raw_cost_accounting: false }, figures)).toBe(6)
    expect(mainCost({ raw_cost_accounting: false }, undefined)).toBe(0)
  })

  it('warns from 90 % of the limit and turns red at it', () => {
    expect(limitTone(limit('179.99'))).toBe('normal')
    expect(limitTone(limit('180'))).toBe('warning')
    expect(limitTone(limit('200'))).toBe('danger')
  })

  it('needs an amount above 0 to enable a limit', () => {
    expect(usageLimitError({ ...defaultUsageLimit() })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), enabled: true })).toBe('amount')
    expect(usageLimitError({ ...defaultUsageLimit(), enabled: true, amount: '500' })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), amount: 'x' })).toBe('amount')
    expect(usageLimitError({ ...defaultUsageLimit(), period_count: 0 })).toBe('period_count')
  })

  it('recognises the reason the usage limit writes', () => {
    expect(usageLimitReasonDetail('usage limit reached: $200.00 / $200.00 (per week)')).toBe('$200.00 / $200.00 (per week)')
    expect(usageLimitReasonDetail('upstream 401')).toBeNull()
  })
})
