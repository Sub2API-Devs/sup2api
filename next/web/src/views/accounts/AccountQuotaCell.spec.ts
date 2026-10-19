import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { api } from '@sub2api/host'
import type { QuotaSnapshot, QuotaWindow } from '@/api/types'
import { i18n } from '@/i18n'
import { formatDateTime } from '@/utils/format'
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

  it('shows plugin labels and one bar per window in backend order with percent and countdown', () => {
    const w = render(
      snap({
        windows: [
          win('custom_budget', 41, { label: { zh: '自定义额度', en: 'Custom budget' }, short_label: { zh: '自定', en: 'Custom' }, resets_at: inSec(3 * 86400 + 4 * 3600) }),
          win('7d_fable', 34, { label: { zh: '插件额度', en: 'Plugin budget' }, short_label: { zh: '插件', en: 'Plugin' }, resets_at: inSec(2 * 3600 + 25 * 60) }),
          win('5h', 61.6, { resets_at: inSec(3 * 86400 + 4 * 3600) }),
          win('7d_sonnet', 18)
        ]
      })
    )
    const rows = w.findAll('[data-testid^="quota-window-"]')
    expect(rows.map((r) => r.attributes('data-testid'))).toEqual(['quota-window-custom_budget', 'quota-window-7d_fable', 'quota-window-5h', 'quota-window-7d_sonnet'])
    expect(rows[0].text()).toContain('自定')
    expect(rows[0].text()).toContain('41%')
    expect(rows[0].text()).toContain('3d 4h')
    expect(rows[1].text()).toContain('插件')
    expect(rows[1].text()).toContain('34%')
    expect(rows[1].text()).toContain('2h 25m')
    expect(rows[2].text()).toContain('62%')
    expect(rows[3].text()).toContain('7d_sonnet')
    // full window name for screen readers / tooltip
    expect(rows[0].find('[role="progressbar"]').attributes('aria-label')).toBe('自定义额度')
    expect(rows[0].attributes('title')).toContain('自定义额度 41%')
    expect(rows[1].find('[role="progressbar"]').attributes('aria-valuenow')).toBe('34')
    expect(rows.every((r) => r.attributes('data-level') === 'ok')).toBe(true)
  })

  it('reacts to locale changes and uses the existing localized text fallback', async () => {
    const w = render(snap({ windows: [
      win('custom', 12, { label: { zh: '月度额度', en: 'Monthly quota' }, short_label: { zh: '月', en: 'Month' } }),
      win('english_only', 5, { label: { en: 'Daily quota' }, short_label: { en: 'Day' } })
    ] }))
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('月')
    expect(w.get('[data-testid="quota-window-english_only"]').text()).toContain('Day')
    expect(w.get('[data-testid="quota-window-english_only"] [role="progressbar"]').attributes('aria-label')).toBe('Daily quota')
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('Month')
    expect(w.get('[data-testid="quota-window-custom"] [role="progressbar"]').attributes('aria-label')).toBe('Monthly quota')
  })

  it('falls back to keys for old responses and empty labels without provider-specific names', () => {
    const w = render(snap({ windows: [
      win('7d_fable', 3),
      win('7d_sonnet', 4, { label: {}, short_label: { zh: '', en: '' } }),
      win('only_full_label', 5, { label: { zh: '完整标签' } }),
      win('only_short_label', 6, { short_label: { zh: '短标签' } })
    ] }))
    for (const key of ['7d_fable', '7d_sonnet']) {
      expect(w.get(`[data-testid="quota-window-${key}"]`).text()).toContain(key)
      expect(w.get(`[data-testid="quota-window-${key}"] [role="progressbar"]`).attributes('aria-label')).toBe(key)
    }
    expect(w.get('[data-testid="quota-window-only_full_label"]').text()).toContain('only_full_label')
    expect(w.get('[data-testid="quota-window-only_short_label"] [role="progressbar"]').attributes('aria-label')).toBe('only_short_label')
    expect(w.text()).not.toContain('7d F')
    expect(w.text()).not.toContain('7d S')
  })

  it('renders plugin labels as plain text rather than HTML or translation keys', () => {
    const label = '<img src=x onerror=alert(1)>'
    const w = render(snap({ windows: [win('custom', 7, { label: { zh: label }, short_label: { zh: label } })] }))
    expect(w.text()).toContain(label)
    expect(w.find('img').exists()).toBe(false)
    expect(w.get('[role="progressbar"]').attributes('aria-label')).toBe(label)
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

  it.each([false, true])('shows unknown blocked usage without a measured zero while retaining reset metadata: expired=%s', (expired) => {
    const w = render(snap({ windows: [win('scoped', 0, { utilization_unknown: true, status: 'rejected', resets_at: inSec(3600), expired })] }))
    const row = w.get('[data-testid="quota-window-scoped"]')
    const bar = row.get('[role="progressbar"]')
    expect(row.text()).toContain('—')
    expect(row.text()).not.toContain('0%')
    expect(row.attributes('title')).toContain('scoped —')
    expect(row.attributes('title')).toContain(formatDateTime(inSec(3600)))
    expect(row.get('[data-testid="quota-rejected"]').text()).toBe('已限流')
    expect(row.text()).toContain(expired ? '待核验' : '1h 0m')
    expect(bar.attributes('aria-valuenow')).toBeUndefined()
    expect(bar.attributes('aria-valuetext')).toBe('未知')
    expect(bar.find('div').exists()).toBe(false)
    expect(bar.find('[style]').exists()).toBe(false)
  })

  it.each([undefined, false])('keeps real zero usage known for old and explicit DTO flags: %s', (utilization_unknown) => {
    const w = render(snap({ windows: [win('known', 0, { utilization_unknown, status: 'rejected', resets_at: inSec(-60) })] }))
    const row = w.get('[data-testid="quota-window-known"]')
    const bar = row.get('[role="progressbar"]')
    expect(row.text()).toContain('0%')
    expect(row.text()).not.toContain('—')
    expect(row.text()).toContain('待核验')
    expect(row.get('[data-testid="quota-rejected"]').text()).toBe('已限流')
    expect(bar.attributes('aria-valuenow')).toBe('0')
    expect(bar.attributes('aria-valuetext')).toBeUndefined()
    expect(bar.get('div').attributes('style')).toContain('width: 0%')
  })

  it('does not treat an unknown placeholder as measured usage and localizes the accessible unknown value', () => {
    i18n.global.locale.value = 'en'
    const w = render(snap({ windows: [win('unknown', 99, { utilization_unknown: true })] }))
    const row = w.get('[data-testid="quota-window-unknown"]')
    expect(row.text()).toContain('—')
    expect(row.text()).not.toContain('99%')
    expect(row.attributes('data-level')).toBe('ok')
    expect(row.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
    expect(row.get('[role="progressbar"]').attributes('aria-valuetext')).toBe('Unknown')
  })

  it.each([0, 83])('keeps expired observed usage %s unconfirmed, including zero', (utilization) => {
    const quota = snap({ windows: [win('custom', utilization, { resets_at: inSec(-60), expired: false })] })
    const w = render(quota)
    const row = w.get('[data-testid="quota-window-custom"]')
    expect(row.text()).toContain(`${utilization}%`)
    expect(row.text()).toContain('待核验')
    expect(row.text()).not.toContain('已重置')
    expect(row.attributes('title')).toContain('待核验')
    expect(row.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(String(utilization))
    expect(quota.windows[0].utilization).toBe(utilization)
  })

  it.each([0, 83])('respects the server expired flag for usage %s despite a future reset time', (utilization) => {
    const w = render(snap({ windows: [win('custom', utilization, { resets_at: inSec(3600), expired: true })] }))
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('待核验')
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain(`${utilization}%`)
    expect(w.get('[data-testid="quota-window-custom"]').text()).not.toContain('1h')
  })

  it('shows unknown keys verbatim, a stale reset as pending, and the query error', () => {
    const w = render(snap({ error: 'usage query failed: upstream 503', windows: [win('custom', 12, { resets_at: inSec(-60) })] }))
    const row = w.get('[data-testid="quota-window-custom"]')
    expect(row.text()).toContain('custom')
    expect(row.text()).toContain('待核验')
    expect(row.text()).toContain('12%')
    expect(w.get('[data-testid="quota-error"]').text()).toContain('额度查询失败')
    expect(w.get('[data-testid="quota-error"]').text()).toContain('upstream 503')
    expect(w.get('[data-testid="quota-observed"]').attributes('title')).toBe(formatDateTime(inSec(-120)))
  })

  it.each([undefined, 'pending'] as const)('shows initial query pending without fabricated usage for status %s', (refresh_status) => {
    const w = render(snap({ source: '', updated_at: null, refresh_status }))
    expect(w.get('[data-testid="quota-pending"]').text()).toBe('首次额度查询待完成')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
    expect(w.text()).not.toContain('0%')
    expect(w.find('[data-testid="quota-observed"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-empty"]').exists()).toBe(false)
  })

  it('shows a completed empty state and the passive marker', () => {
    const w = render(snap({ source: 'passive', refresh_status: 'ready' }))
    expect(w.get('[data-testid="quota-empty"]').text()).toBe('暂无用量数据')
    expect(w.text()).toContain('被动采样')
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
  })

  it.each(['', 'upstream 503'])('shows initial query failure without fabricated usage: %s', (error) => {
    const w = render(snap({ source: '', updated_at: null, refresh_status: 'error', error }))
    expect(w.get('[data-testid="quota-error"]').text()).toContain('额度查询失败')
    if (error) expect(w.get('[data-testid="quota-error"]').text()).toContain(error)
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-empty"]').exists()).toBe(false)
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
    expect(w.text()).not.toContain('0%')
    expect(w.element.tagName).toBe('BUTTON')
  })

  it('preserves last observed usage while a query is pending without displaying its schedule', () => {
    const w = render(snap({ refresh_status: 'pending', next_check_at: inSec(60), windows: [win('custom', 83, { expired: true })] }))
    expect(w.get('[data-testid="quota-pending"]').text()).toBe('额度查询待完成')
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('83%')
    expect(w.get('[data-testid="quota-observed"]').text()).toContain('最近观测')
    expect(w.find('[data-testid="quota-next-check"]').exists()).toBe(false)
    expect(w.text()).not.toContain('下次查询')
  })

  it('retains last observed usage and a scheduled retry after a query failure', () => {
    const w = render(snap({ refresh_status: 'error', error: 'upstream 503', next_check_at: inSec(60), windows: [win('custom', 83, { expired: true })] }))
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('83%')
    expect(w.get('[data-testid="quota-error"]').text()).toContain('upstream 503')
    expect(w.get('[data-testid="quota-observed"]').text()).toContain('最近观测')
    expect(w.find('[data-testid="quota-next-check"]').exists()).toBe(false)
  })

  it.each([true, false])('silences refreshable token expiry while preserving existing usage: %s', async (observed) => {
    const quota = snap({
      refresh_status: 'error',
      error: 'transient: token_expired: the access token expired',
      updated_at: observed ? inSec(-120) : null,
      next_check_at: inSec(60),
      windows: observed ? [win('5h', 7, { expired: true }), win('7d', 100, { status: 'rejected' })] : []
    })
    const w = render(quota)
    expect(w.find('[data-testid="quota-error"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
    expect(w.text()).not.toContain('等待令牌续期')
    expect(w.text()).not.toContain('token_expired')
    expect(w.find('[data-testid="quota-next-check"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-empty"]').exists()).toBe(!observed)
    expect(w.find('[data-testid="quota-observed"]').exists()).toBe(observed)
    if (observed) {
      expect(w.get('[data-testid="quota-window-5h"]').text()).toContain('7%')
      expect(w.get('[data-testid="quota-rejected"]').text()).toBe('已限流')
    } else {
      expect(w.find('[role="progressbar"]').exists()).toBe(false)
    }
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-error"]').exists()).toBe(false)
    await w.setProps({ quota: snap({ refresh_status: 'ready', windows: [win('5h', 8)] }) })
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
    expect(w.find('[data-testid="quota-error"]').exists()).toBe(false)
    expect(w.get('[data-testid="quota-window-5h"]').text()).toContain('8%')
  })

  it.each(['auth_rejected: token_revoked: refused', 'auth_rejected: not_logged_in: signed out', 'transient: upstream_error', 'transient: token_expired_other: failed'])('keeps real quota failures visible: %s', (error) => {
    const w = render(snap({ refresh_status: 'error', error }))
    expect(w.get('[data-testid="quota-error"]').text()).toContain(error)
    expect(w.find('[data-testid="quota-pending"]').exists()).toBe(false)
  })

  it('does not show an invented next check when the optional timestamp is absent', () => {
    const w = render(snap({ next_check_at: null }))
    expect(w.find('[data-testid="quota-next-check"]').exists()).toBe(false)
  })

  it('refreshes by clicking a window without triggering the row and blocks duplicate clicks while busy', async () => {
    const w = render(snap({ windows: [win('5h', 10)] }))
    const rowClick = vi.fn()
    w.element.parentElement!.addEventListener('click', rowClick)
    expect(w.find('[data-testid="quota-refresh"]').exists()).toBe(false)
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.attributes('type')).toBe('button')
    await w.get('[data-testid="quota-window-5h"]').trigger('click')
    expect(w.emitted('refresh')).toHaveLength(1)
    expect(rowClick).not.toHaveBeenCalled()
    await w.setProps({ refreshing: true })
    expect(w.attributes('disabled')).toBeDefined()
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.get('[role="status"]').text()).toContain('刷新中')
    await w.get('[data-testid="quota-window-5h"]').trigger('click')
    expect(w.emitted('refresh')).toHaveLength(1)
    await w.setProps({ refreshing: false })
    await w.get('[data-testid="quota-observed"]').trigger('click')
    expect(w.emitted('refresh')).toHaveLength(2)
  })

  it('keeps non-refreshable quotas as non-interactive content', async () => {
    const w = render(snap(), { refreshable: false })
    expect(w.element.tagName).toBe('DIV')
    expect(w.find('[data-testid="quota-refresh"]').exists()).toBe(false)
    await w.trigger('click')
    expect(w.emitted('refresh')).toBeUndefined()
  })

  it('moves the countdown with the shared clock and preserves usage after expiry', async () => {
    const w = render(snap({ windows: [win('custom', 27, { resets_at: inSec(10 * 60) })] }))
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('10m')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('5m')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('待核验')
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('27%')
  })

  it('never starts row queries, model calls or refresh events for initialization or expiry', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('unexpected query'))
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('unexpected query'))
    const pending = render(snap({ source: '', updated_at: null, refresh_status: 'pending', next_check_at: inSec(30) }))
    const expired = render(snap({ windows: [win('custom', 20, { resets_at: inSec(30) })] }))
    await vi.advanceTimersByTimeAsync(120_000)
    expect(get).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
    expect(pending.emitted('refresh')).toBeUndefined()
    expect(expired.emitted('refresh')).toBeUndefined()
    expect(vi.getTimerCount()).toBe(1)
  })

  it('renders English plugin labels and pending verification', () => {
    i18n.global.locale.value = 'en'
    const w = render(snap({ windows: [win('custom', 100, { status: 'rejected', expired: true, label: { zh: '自定义额度', en: 'Custom budget' }, short_label: { zh: '自定', en: 'Custom' } })] }))
    expect(w.get('[data-testid="quota-rejected"]').text()).toBe('Limited')
    expect(w.get('[role="progressbar"]').attributes('aria-label')).toBe('Custom budget')
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('Pending verification')
    expect(w.get('[data-testid="quota-window-custom"]').text()).toContain('Custom')
  })

  it('renders English initial query, failure and last observed text without the next check', async () => {
    i18n.global.locale.value = 'en'
    const w = render(snap({ source: '', updated_at: null, refresh_status: 'pending', next_check_at: inSec(60) }))
    expect(w.get('[data-testid="quota-pending"]').text()).toBe('Initial quota query pending')
    expect(w.find('[data-testid="quota-next-check"]').exists()).toBe(false)
    await w.setProps({ quota: snap({ refresh_status: 'error' }) })
    expect(w.get('[data-testid="quota-error"]').text()).toBe('Quota query failed')
    expect(w.get('[data-testid="quota-observed"]').text()).toContain('Last observed')
  })
})
