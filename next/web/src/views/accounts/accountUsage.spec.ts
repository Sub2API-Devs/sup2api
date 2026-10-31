import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { amountDecimals, anchorFloor, defaultUsageLimit, limitLevel, loadedUsageLimit, mainCost, neverSaved, usageLimitBody, usageLimitError, usagePeriodLabel } from './accountUsage'

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
  })

  it('has no period length to check for a lifetime limit', () => {
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'none', period_count: 1001 })).toBeNull()
    expect(usageLimitError({ ...defaultUsageLimit(), period: 'none', period_count: 0 })).toBeNull()
    expect(usageLimitBody({ ...defaultUsageLimit(), period: 'none', period_count: 13 }).period_count).toBe(1)
    expect(usageLimitBody({ ...defaultUsageLimit(), period: 'week', period_count: 3 }).period_count).toBe(3)
  })

  it('takes amounts with up to 8 decimals, as the server keeps', () => {
    const on = (amount: string) => usageLimitError({ ...defaultUsageLimit(), enabled: true, amount })
    expect(on('0.12345678')).toBeNull()
    expect(on('0.123456789')).toBe('amount')
    expect(on('1.100000000')).toBeNull()
    expect(on('1e-7')).toBeNull()
    expect(on('1e-9')).toBe('amount')
    expect(on('1000000000')).toBeNull()
    expect(on('1000000001')).toBe('amount')
    expect(on('-1')).toBe('amount')
    expect(on('')).toBe('amount')
    expect(amountDecimals('12.50')).toBe(1)
    expect(amountDecimals('abc')).toBeNaN()
  })

  it('lets a switched-off limit have no amount and sends one an older core accepts', () => {
    const off = { ...defaultUsageLimit(), enabled: false, amount: '' }
    expect(usageLimitError(off)).toBeNull()
    expect(usageLimitBody(off, '200').amount).toBe('200')
    expect(usageLimitBody(off).amount).toBe('0')
    expect(usageLimitBody({ ...off, amount: ' 5 ' }).amount).toBe('5')
    expect(usageLimitError({ ...off, enabled: true })).toBe('amount')
  })

  it('starts a limit that was never saved in the browser time zone', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const server = { raw_cost_accounting: false, enabled: false, amount: '0', period: 'month' as const, period_count: 1, anchor: null }
    // A newer core: "" means never saved.
    expect(loadedUsageLimit({ ...server, timezone: '' }).timezone).toBe(zone)
    // An older core sends "UTC" with the defaults; a saved limit differs somewhere.
    expect(neverSaved({ ...server, timezone: 'UTC' })).toBe(true)
    expect(loadedUsageLimit({ ...server, timezone: 'UTC' }).timezone).toBe(zone)
    expect(loadedUsageLimit({ ...server, enabled: true, amount: '5', timezone: 'UTC' }).timezone).toBe('UTC')
    expect(loadedUsageLimit({ ...server, amount: '5', timezone: 'UTC' }).timezone).toBe('UTC')
    expect(loadedUsageLimit({ ...server, timezone: 'Asia/Shanghai' }).timezone).toBe('Asia/Shanghai')
  })

  it('starts a new limit in the browser time zone', () => {
    expect(defaultUsageLimit().timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  describe('anchor in a half-hour zone (Asia/Kolkata)', () => {
    const tz = process.env.TZ
    afterEach(() => {
      if (tz === undefined) delete process.env.TZ
      else process.env.TZ = tz
    })

    it('floors as the server stores it: UTC hours for hourly periods, local hours otherwise', () => {
      process.env.TZ = 'Asia/Kolkata'
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      // 09:45 IST = 04:15 UTC.
      const picked = new Date('2026-03-01T04:15:00Z').toISOString()
      expect(anchorFloor(picked, 'hour', zone)).toBe('2026-03-01T04:00:00.000Z')
      expect(anchorFloor(picked, 'day', zone)).toBe('2026-03-01T03:30:00.000Z')
      // Another zone than the browser's is floored by the server.
      expect(anchorFloor(picked, 'day', 'Pacific/Chatham')).toBe(picked)
      expect(anchorFloor(null, 'day', zone)).toBeNull()
      expect(usageLimitBody({ ...defaultUsageLimit(), period: 'hour', anchor: picked }).anchor).toBe('2026-03-01T04:00:00.000Z')
    })
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
