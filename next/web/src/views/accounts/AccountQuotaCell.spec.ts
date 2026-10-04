import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import type { QuotaSnapshot, QuotaWindow } from '@/api/types'
import { i18n } from '@/i18n'
import AccountQuotaCell from './AccountQuotaCell.vue'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const inSec = (s: number) => new Date(NOW + s * 1000).toISOString()
const win = (key: string, utilization: number, over: Partial<QuotaWindow> = {}): QuotaWindow => ({ key, utilization, resets_at: null, status: 'allowed', ...over })
const snap = (over: Partial<QuotaSnapshot> = {}): QuotaSnapshot => ({ supported: true, source: 'active', updated_at: inSec(-120), error: '', windows: [], ...over })

function render(quota: QuotaSnapshot, props: Record<string, unknown> = {}) {
  return mount(AccountQuotaCell, { props: { quota, ...props }, global: { plugins: [i18n] } })
}

enableAutoUnmount(afterEach)

describe('AccountQuotaCell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    i18n.global.locale.value = 'zh'
  })
  afterEach(() => vi.useRealTimers())

  it('shows one bar per window in display order with percent and countdown', () => {
    const w = render(
      snap({
        windows: [
          win('7d_fable', 41, { resets_at: inSec(3 * 86400 + 4 * 3600) }),
          win('5h', 34, { resets_at: inSec(2 * 3600 + 25 * 60) }),
          win('7d', 61.6, { resets_at: inSec(3 * 86400 + 4 * 3600) }),
          win('7d_sonnet', 18)
        ]
      })
    )
    const rows = w.findAll('[data-testid^="quota-window-"]')
    expect(rows.map((r) => r.attributes('data-testid'))).toEqual(['quota-window-5h', 'quota-window-7d', 'quota-window-7d_sonnet', 'quota-window-7d_fable'])
    expect(rows[0].text()).toContain('5h')
    expect(rows[0].text()).toContain('34%')
    expect(rows[0].text()).toContain('2h 25m')
    expect(rows[1].text()).toContain('62%')
    expect(rows[1].text()).toContain('3d 4h')
    expect(rows[2].text()).toContain('7d S')
    expect(rows[3].text()).toContain('7d F')
    // full window name for screen readers / tooltip
    expect(rows[2].find('[role="progressbar"]').attributes('aria-label')).toBe('7 天 Sonnet')
    expect(rows[0].find('[role="progressbar"]').attributes('aria-valuenow')).toBe('34')
    expect(rows.every((r) => r.attributes('data-level') === 'ok')).toBe(true)
  })

  it('colours by usage and flags a rejected window', () => {
    const w = render(snap({ windows: [win('5h', 100, { status: 'rejected', resets_at: inSec(3600) }), win('7d', 81, { status: 'allowed_warning' }), win('7d_sonnet', 92)] }))
    const row = (k: string) => w.get(`[data-testid="quota-window-${k}"]`)
    expect(row('5h').attributes('data-level')).toBe('danger')
    expect(row('5h').find('[data-testid="quota-rejected"]').text()).toBe('已限流')
    expect(row('5h').find('.bg-danger-500').exists()).toBe(true)
    expect(row('7d').attributes('data-level')).toBe('warning')
    expect(row('7d').find('.bg-warning-500').exists()).toBe(true)
    expect(row('7d').find('[data-testid="quota-rejected"]').exists()).toBe(false)
    expect(row('7d_sonnet').attributes('data-level')).toBe('danger')
  })

  it('shows unknown keys verbatim, a stale reset as pending, and the query error', () => {
    const w = render(snap({ error: 'usage query failed: upstream 503', windows: [win('7d_opus', 12, { resets_at: inSec(-60) })] }))
    const row = w.get('[data-testid="quota-window-7d_opus"]')
    expect(row.text()).toContain('7d_opus')
    expect(row.text()).toContain('待刷新')
    expect(w.get('[data-testid="quota-error"]').text()).toContain('upstream 503')
  })

  it('shows an empty state and the passive marker', () => {
    const w = render(snap({ source: 'passive', updated_at: null }))
    expect(w.find('[data-testid="quota-empty"]').exists()).toBe(true)
    expect(w.text()).toContain('被动采样')
  })

  it('emits refresh, and disables the button while refreshing', async () => {
    const w = render(snap({ windows: [win('5h', 10)] }))
    await w.get('[data-testid="quota-refresh"]').trigger('click')
    expect(w.emitted('refresh')).toHaveLength(1)
    await w.setProps({ refreshing: true })
    const btn = w.get('[data-testid="quota-refresh"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('刷新中')
  })

  it('hides the refresh action when not refreshable', () => {
    const w = render(snap(), { refreshable: false })
    expect(w.find('[data-testid="quota-refresh"]').exists()).toBe(false)
  })

  it('moves the countdown with the shared clock', async () => {
    const w = render(snap({ windows: [win('5h', 10, { resets_at: inSec(10 * 60) })] }))
    expect(w.get('[data-testid="quota-window-5h"]').text()).toContain('10m')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(w.get('[data-testid="quota-window-5h"]').text()).toContain('5m')
  })

  it('renders English labels', () => {
    i18n.global.locale.value = 'en'
    const w = render(snap({ windows: [win('7d_fable', 100, { status: 'rejected' })] }))
    expect(w.get('[data-testid="quota-rejected"]').text()).toBe('Limited')
    expect(w.get('[role="progressbar"]').attributes('aria-label')).toBe('7 days Fable')
  })
})
