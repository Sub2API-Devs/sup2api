import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AccountUsage, AccountUsageDetail } from '@/api/types'
import { i18n } from '@/i18n'
import AccountUsageCell from './AccountUsageCell.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get } }))

enableAutoUnmount(afterEach)
const figures = (cost: string, requests: number) => ({ cost, raw_cost: cost, requests, tokens: 1500 })
const usage = (over: Partial<AccountUsage> = {}): AccountUsage => ({ raw_cost_accounting: false, total: figures('12.5', 10), today: figures('1.25', 3), limit: null, limit_disabled: false, ...over })
const detail = (): AccountUsageDetail => ({ raw_cost_accounting: false, today: figures('1', 1234), last_7_days: figures('2', 2), last_30_days: figures('3', 3), total: figures('4', 4), limit: null })
const render = (props: { accountId: number; usage: AccountUsage }) => mount(AccountUsageCell, { props, global: { plugins: [i18n] }, attachTo: document.body })
const hover = async (w: ReturnType<typeof render>) => {
  await w.get('[data-testid="account-usage"]').trigger('focusin')
  await flushPromises()
}

describe('AccountUsageCell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue(detail())
    i18n.global.locale.value = 'zh'
  })

  it('shows the lifetime cost and today without a limit, the period figure with one', () => {
    const w = render({ accountId: 7, usage: usage() })
    expect(w.text()).toContain('$12.50')
    expect(w.text()).toContain('今日 $1.25 · 3 次')
    const limited = render({ accountId: 7, usage: usage({ limit: { amount: '200', used: '190', period: 'week', period_count: 2, window_start: null, window_end: null, waived: false } }) })
    const figure = limited.get('[data-testid="account-usage-limit"]')
    expect(figure.findAll('span').map((s) => s.text())).toEqual(['每 2 周', '$190.00 / $200.00'])
    expect(figure.findAll('span')[1].classes()).toContain('text-warning-700')
  })

  it('loads the details on the first hover only, in the browser time zone', async () => {
    const w = render({ accountId: 7, usage: usage() })
    expect(mocks.get).not.toHaveBeenCalled()
    await hover(w)
    await hover(w)
    expect(mocks.get).toHaveBeenCalledOnce()
    expect(mocks.get).toHaveBeenCalledWith('/accounts/7/usage', { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    const headers = [...document.body.querySelectorAll('th')].map((th) => th.textContent)
    expect(headers).toEqual(['时间', '原始费用', '计费后', '请求', 'Token'])
    expect(document.body.querySelector('tbody td:nth-child(4)')?.textContent).toBe('1,234')
  })

  it('loads again once the row or the account changes', async () => {
    const w = render({ accountId: 7, usage: usage() })
    await hover(w)
    await w.setProps({ usage: usage({ total: figures('13', 11) }) })
    await hover(w)
    expect(mocks.get).toHaveBeenCalledTimes(2)
    await w.setProps({ accountId: 8 })
    await hover(w)
    expect(mocks.get).toHaveBeenLastCalledWith('/accounts/8/usage', expect.anything())
  })

  it('keeps the open card through a reload that changed nothing', async () => {
    const w = render({ accountId: 7, usage: usage() })
    await hover(w)
    await w.setProps({ usage: usage() })
    await flushPromises()
    expect(document.body.querySelector('table')).not.toBeNull()
    await hover(w)
    expect(mocks.get).toHaveBeenCalledOnce()
  })

  it('drops details that arrive after the row changed', async () => {
    let resolve!: (d: AccountUsageDetail) => void
    mocks.get.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const w = render({ accountId: 7, usage: usage() })
    await hover(w)
    await w.setProps({ accountId: 8 })
    resolve(detail())
    await flushPromises()
    expect(document.body.querySelector('table')).toBeNull()
    await hover(w)
    expect(mocks.get).toHaveBeenLastCalledWith('/accounts/8/usage', expect.anything())
  })
})
