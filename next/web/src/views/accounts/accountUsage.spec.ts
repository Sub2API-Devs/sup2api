import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { defaultUsageLimit, limitLevel, mainCost, usageLimitError, usagePeriodLabel } from './accountUsage'

const figures = { cost: '6.0', raw_cost: '5.0', requests: 1, tokens: 120 }
const limit = (used: string, amount = '200') => ({ amount, used, period: 'week' as const, period_count: 1, window_start: null, window_end: null, waived: false })

describe('account usage', () => {
  it('counts in raw cost when the raw ratio is on', () => {
    expect(mainCost({ raw_cost_accounting: true }, figures)).toBe(5)
    expect(mainCost({ raw_cost_accounting: false }, figures)).toBe(6)
    expect(mainCost({ raw_cost_accounting: false }, undefined)).toBe(0)
  })

  it('warns from 90 % of the limit and turns red at it', () => {
    expect(limitLevel(limit('179.99'))).toBe('ok')
    expect(limitLevel(limit('180'))).toBe('warning')
    expect(limitLevel(limit('200'))).toBe('danger')
  })

  it('needs an amount above 0 to enable a limit and caps a period at 366 days', () => {
    expect(usageLimitError({ ...defaultUsageLimit() })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), enabled: true })).toBe('amount')
    expect(usageLimitError({ ...defaultUsageLimit(), enabled: true, amount: '500' })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), amount: 'x' })).toBe('amount')
    expect(usageLimitError({ ...defaultUsageLimit(), period_count: 0 })).toBe('period_count')
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'month', period_count: 12 })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'month', period_count: 13 })).toBe('period_count')
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'week', period_count: 53 })).toBe('period_count')
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'hour', period_count: 8784 })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'none', period_count: 1000 })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'none', period_count: 1001 })).toBe('period_count')
  })

  it('starts a new limit in the browser time zone', () => {
    expect(defaultUsageLimit().timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('labels a period in both languages, with its length', () => {
    const t = i18n.global.t
    i18n.global.locale.value = 'zh'
    expect(usagePeriodLabel(t, 'week', 1)).toBe('每周')
    expect(usagePeriodLabel(t, 'week', 2)).toBe('每 2 周')
    expect(usagePeriodLabel(t, 'none', 3)).toBe('总额')
    i18n.global.locale.value = 'en'
    expect(usagePeriodLabel(t, 'month', 1)).toBe('per month')
    expect(usagePeriodLabel(t, 'day', 3)).toBe('per 3 days')
  })
})
