import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AccountRateModels } from '@/api/types'
import { i18n } from '@/i18n'
import AccountModelRates from './AccountModelRates.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get } }))

enableAutoUnmount(afterEach)
const answer = (): AccountRateModels => ({
  total: { in_use: 3, rpm: 129, tpm: 244_600, tpd: 189_900_000, sessions: 32 },
  models: [
    { model: 'claude-opus-5-5', in_use: 2, rpm: 93, tpm: 204_800, tpd: 131_900_000, sessions: 23 },
    { model: 'claude-haiku-5-5', in_use: 0, rpm: 0, tpm: 0, tpd: 7_800_000, sessions: 0 }
  ]
})
const render = () => mount(AccountModelRates, { props: { accountId: 7 }, global: { plugins: [i18n] } })
const cells = (w: ReturnType<typeof render>, sel: string) => w.findAll(sel).map(r => r.findAll('td').map(c => c.text()))

describe('AccountModelRates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.get.mockResolvedValue(answer())
    i18n.global.locale.value = 'zh'
  })
  afterEach(() => vi.useRealTimers())

  it('lists all models, then each model, with concurrency, RPM, TPM, TPD and sessions', async () => {
    const w = render()
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/accounts/7/rate-models', { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    expect(w.findAll('th').map(c => c.text())).toEqual(['模型', '并发', 'RPM', 'TPM', 'TPD', '会话'])
    expect(cells(w, '[data-testid="account-model-rates-total"]')).toEqual([['全部模型', '3', '129', '244.6K', '189.9M', '32']])
    expect(cells(w, '[data-testid="account-model-rates-row"]').map(r => r[0])).toEqual(['claude-opus-5-5', 'claude-haiku-5-5'])
  })

  it('reloads one request at a time while open and stops once closed', async () => {
    const w = render()
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(mocks.get).toHaveBeenCalledTimes(2)
    w.unmount()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })

  it('says so when there are no models or the figures cannot be loaded', async () => {
    mocks.get.mockResolvedValueOnce({ ...answer(), models: [] })
    const w = render()
    await flushPromises()
    expect(w.text()).toContain('近 1 小时和今日没有请求')
    mocks.get.mockRejectedValueOnce(new Error('down'))
    await vi.advanceTimersByTimeAsync(2000)
    expect(w.text()).toContain('按模型明细加载失败')
  })
})
