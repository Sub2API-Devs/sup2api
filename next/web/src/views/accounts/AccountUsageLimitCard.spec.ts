import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { SSegmented } from '@sub2api/ui'
import type { AccountUsageLimit } from '@/api/types'
import { i18n } from '@/i18n'
import AccountUsageLimitCard from './AccountUsageLimitCard.vue'
import type { UsageLimitStatus } from './useUsageLimitEdit'

enableAutoUnmount(afterEach)
const limit = (over: Partial<AccountUsageLimit> = {}): AccountUsageLimit => ({ raw_cost_accounting: false, enabled: true, amount: '200', period: 'week', period_count: 1, anchor: null, timezone: 'Asia/Shanghai', ...over })

function render(modelValue: AccountUsageLimit, status: UsageLimitStatus = 'ready', loadError = '') {
  const w: VueWrapper<any> = mount(AccountUsageLimitCard, {
    props: { modelValue, status, loadError, 'onUpdate:modelValue': (v: AccountUsageLimit) => w.setProps({ modelValue: v }) },
    global: { plugins: [i18n] }
  })
  return w
}

const input = (w: ReturnType<typeof render>, id: string) => w.get(`[data-testid="${id}"] input, input[data-testid="${id}"]`)

describe('AccountUsageLimitCard', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })

  it('round-trips the anchor through local wall time on whole hours', async () => {
    const anchor = new Date(2026, 0, 5, 8, 0).toISOString()
    const w = render(limit({ anchor }))
    const field = input(w, 'usage-limit-anchor')
    expect((field.element as HTMLInputElement).value).toBe('2026-01-05T08:00')
    await field.setValue('2026-03-01T09:45')
    expect(w.props('modelValue').anchor).toBe(new Date(2026, 2, 1, 9, 0).toISOString())
    expect((field.element as HTMLInputElement).value).toBe('2026-03-01T09:00')
    await field.setValue('')
    expect(w.props('modelValue').anchor).toBeNull()
  })

  it('caps the period length so that a period spans at most 366 days', async () => {
    const w = render(limit({ period: 'hour' }))
    expect(input(w, 'usage-limit-count').attributes('max')).toBe('8784')
    await w.setProps({ modelValue: limit({ period: 'month' }) })
    expect(input(w, 'usage-limit-count').attributes('max')).toBe('12')
  })

  it('takes any number of decimals in the browser, leaving the 8-decimal check to the editor', () => {
    expect(input(render(limit()), 'usage-limit-amount').attributes('step')).toBe('any')
  })

  it('resets the hidden period length to 1 on "never"', async () => {
    const w = render(limit({ period: 'month', period_count: 13 }))
    w.getComponent(SSegmented).vm.$emit('update:modelValue', 'none')
    await nextTick()
    expect(w.props('modelValue')).toMatchObject({ period: 'none', period_count: 1 })
    expect(w.find('[data-testid="usage-limit-count"]').exists()).toBe(false)
    w.getComponent(SSegmented).vm.$emit('update:modelValue', 'week')
    await nextTick()
    expect(w.props('modelValue')).toMatchObject({ period: 'week', period_count: 1 })
  })

  describe('in a half-hour zone (Asia/Kolkata)', () => {
    const tz = process.env.TZ
    beforeEach(() => {
      process.env.TZ = 'Asia/Kolkata'
    })
    afterEach(() => {
      if (tz === undefined) delete process.env.TZ
      else process.env.TZ = tz
    })

    it('shows the stored start as it is, minutes included', () => {
      // An hourly limit starts on a whole UTC hour: 03:00 UTC is 08:30 IST, not 08:00.
      const w = render(limit({ period: 'hour', anchor: '2026-01-05T03:00:00Z' }))
      expect((input(w, 'usage-limit-anchor').element as HTMLInputElement).value).toBe('2026-01-05T08:30')
    })

    it('floors a picked start the way the server stores it', async () => {
      const w = render(limit({ period: 'hour' }))
      await input(w, 'usage-limit-anchor').setValue('2026-03-01T09:45')
      expect(w.props('modelValue').anchor).toBe('2026-03-01T04:00:00.000Z')
      expect((input(w, 'usage-limit-anchor').element as HTMLInputElement).value).toBe('2026-03-01T09:30')
      await w.setProps({ modelValue: limit({ period: 'day' }) })
      await input(w, 'usage-limit-anchor').setValue('2026-03-01T09:45')
      expect(w.props('modelValue').anchor).toBe('2026-03-01T03:30:00.000Z')
    })
  })

  it('names the time zone the periods follow', () => {
    expect(render(limit()).get('[data-testid="usage-limit-timezone"]').text()).toBe('周期按 Asia/Shanghai 计算')
    i18n.global.locale.value = 'en'
    expect(render(limit({ timezone: 'UTC' })).get('[data-testid="usage-limit-timezone"]').text()).toBe('Periods follow UTC')
  })

  it('says when the current period was released by hand', async () => {
    const state = { amount: '200', used: '250', period: 'week' as const, period_count: 1, window_start: null, window_end: null, waived: true }
    const w = render(limit())
    await w.setProps({ usage: { raw_cost_accounting: false, total: { cost: '0', raw_cost: '0', requests: 0, tokens: 0 }, today: { cost: '0', raw_cost: '0', requests: 0, tokens: 0 }, limit: state, limit_disabled: false } })
    expect(w.get('[data-testid="usage-limit-waived"]').text()).toBe('本周期已人工放行')
  })

  it.each<UsageLimitStatus>(['idle', 'loading'])('is read-only until the limit has loaded (%s)', (status) => {
    const w = render(limit(), status)
    expect(w.find('[data-testid="usage-limit-loading"]').exists()).toBe(true)
    expect(input(w, 'usage-limit-amount').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="usage-limit-enabled"] input, input[data-testid="usage-limit-enabled"]').attributes('disabled')).toBeDefined()
  })

  it('shows why the limit could not load and offers a retry', async () => {
    const w = render(limit(), 'failed', 'network down')
    expect(w.get('[data-testid="usage-limit-load-failed"]').text()).toContain('network down')
    expect(input(w, 'usage-limit-amount').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="usage-limit-retry"]').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('is editable once loaded', () => {
    const w = render(limit())
    expect(w.find('[data-testid="usage-limit-loading"]').exists()).toBe(false)
    expect(input(w, 'usage-limit-amount').attributes('disabled')).toBeUndefined()
  })
})
