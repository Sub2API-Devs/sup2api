import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { ApiError, type PluginHost } from '@sub2api/host'
import CodexResetTab from './CodexResetTab.vue'
import { setHost } from './host'

// A plugin host whose t() returns the key; the plugin API answers POSTs from
// `answer`, the core API answers the forced quota query, confirm() says yes.
type Answer = (path: string, body: any) => unknown
let answer: Answer
let calls: Array<{ path: string; body: any }>
let host: any

const CREDITS = {
  available_count: 2,
  credits: [
    { id: 'soon', title: 'Referral reset', description: 'Thanks', status: 'available', granted_at: 1700000000, expires_at: 1800000000 },
    { id: 'never', title: '', description: '', status: 'available', granted_at: 1700000000, expires_at: null }
  ]
}
const QUOTA = { windows: [{ key: '5h', utilization: 100, resets_at: '2026-11-10T12:00:00Z' }] }

function fakeHost(canReset = true): PluginHost {
  const post = vi.fn(async (path: string, body?: unknown) => {
    calls.push({ path, body })
    const r = answer(path, body)
    if (r instanceof Error) throw r
    return r
  })
  return {
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { locale: ref('en'), formatDateTime: (v: unknown) => `T(${Number(v)})`, t: (k: string) => k, text: (v: unknown) => String(v ?? '') },
    can: (p: string) => p === 'codex:reset' && canReset,
    confirm: vi.fn(async () => true),
    toast: vi.fn(),
    api: { get: vi.fn(async () => ({ windows: [{ key: '5h', utilization: 0, resets_at: null }] })) },
    pluginApi: { post }
  } as unknown as PluginHost
}

let wrapper: VueWrapper | null = null
async function mountTab(canReset = true) {
  host = fakeHost(canReset)
  setHost(host)
  wrapper = mount(CodexResetTab, { props: { account: { id: 29, name: 'plus', quota: QUOTA } }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  calls = []
  answer = (path) => (path === '/reset-credits/list' ? structuredClone(CREDITS) : new Error('unexpected'))
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  setHost(null)
})

describe('CodexResetTab', () => {
  it('lists the available resets and the used-up window', async () => {
    const w = await mountTab()
    expect(calls[0]).toEqual({ path: '/reset-credits/list', body: { account_id: 29 } })
    expect(w.get('[data-testid="codex-reset-count"]').text()).toBe('2')
    expect(w.findAll('[data-testid="codex-reset-credit"]')).toHaveLength(2)
    expect(w.text()).toContain('reset.fullHint')
  })

  it('lists the used resets too, after the usable ones, dimmed and without a button', async () => {
    answer = () => ({
      available_count: 1,
      credits: [
        { id: 'old', title: 'Full reset', description: '', status: 'redeemed', granted_at: 1600000000, expires_at: null },
        { id: 'new', title: '', description: '', status: 'available', granted_at: 1700000000, expires_at: null }
      ]
    })
    const w = await mountTab()
    const rows = w.findAll('[data-testid="codex-reset-credit"]')
    expect(rows.map((r) => r.attributes('data-status'))).toEqual(['available', 'redeemed'])
    expect(rows[0].text()).toContain('reset.status.available')
    expect(rows[1].text()).toContain('reset.status.redeemed')
    expect(rows[1].classes()).toContain('cx-reset-item--spent')
    expect(rows[0].findAll('button')).toHaveLength(1)
    expect(rows[1].findAll('button')).toHaveLength(0)
  })

  it('spends the soonest-expiring reset from the header, then refreshes the usage and the list', async () => {
    const w = await mountTab()
    answer = (path) =>
      path === '/reset-credits/consume'
        ? { outcome: 'reset', windows_reset: 1, account_restored: true }
        : { available_count: 1, credits: [CREDITS.credits[1]] }
    await w.get('[data-testid="codex-reset-use-next"]').trigger('click')
    await flushPromises()
    expect(host.confirm).toHaveBeenCalledOnce()
    expect(calls.find((c) => c.path === '/reset-credits/consume')?.body).toEqual({ account_ids: [29], credit_id: 'soon' })
    expect(host.toast).toHaveBeenCalledWith('reset.done:{"n":1}', 'success')
    expect(host.api.get).toHaveBeenCalledWith('/accounts/29/quota', { force: true })
    expect(w.get('[data-testid="codex-reset-count"]').text()).toBe('1')
    expect(w.text()).not.toContain('reset.fullHint')
  })

  it('shows a refusal that spent nothing as a warning', async () => {
    const w = await mountTab()
    answer = (path) =>
      path === '/reset-credits/consume'
        ? new ApiError(409, { code: 'nothing_to_reset', message: 'Nothing to reset / 无需重置' })
        : structuredClone(CREDITS)
    await w.findAll('[data-testid="codex-reset-credit"]')[1].get('button').trigger('click')
    await flushPromises()
    expect(calls.find((c) => c.path === '/reset-credits/consume')?.body).toEqual({ account_ids: [29], credit_id: 'never' })
    expect(host.toast).toHaveBeenCalledWith('Nothing to reset / 无需重置', 'warning')
  })

  it('does not spend anything when the confirmation is declined', async () => {
    const w = await mountTab()
    host.confirm.mockResolvedValueOnce(false)
    await w.get('[data-testid="codex-reset-use-next"]').trigger('click')
    await flushPromises()
    expect(calls.some((c) => c.path === '/reset-credits/consume')).toBe(false)
  })

  it('hides the buttons without the codex:reset permission', async () => {
    const w = await mountTab(false)
    expect(w.find('[data-testid="codex-reset-use-next"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="codex-reset-credit"] button')).toHaveLength(0)
  })

  it('shows the empty state when the account has no reset', async () => {
    answer = () => ({ available_count: 0, credits: [] })
    const w = await mountTab()
    expect(w.text()).toContain('reset.emptyTitle')
    expect(w.get('[data-testid="codex-reset-use-next"]').attributes('disabled')).toBeDefined()
  })

  it('shows a failed load as an error, without the empty state or an empty list', async () => {
    answer = () => new ApiError(502, { code: 'upstream_error', message: 'ChatGPT unreachable / 无法连接 ChatGPT' })
    const w = await mountTab()
    expect(w.text()).toContain('ChatGPT unreachable / 无法连接 ChatGPT')
    expect(w.text()).not.toContain('reset.emptyTitle')
    expect(w.find('.cx-reset-list').exists()).toBe(false)
  })
})
