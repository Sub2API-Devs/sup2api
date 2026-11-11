import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref } from 'vue'
import { useUsageSummary } from './useUsageSummary'

const get = vi.hoisted(() => vi.fn(async (..._args: unknown[]): Promise<unknown> => []))
vi.mock('@sub2api/host', async original => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get } }))

describe('useUsageSummary', () => {
  beforeEach(() => get.mockClear())

  it('asks again when the query it sends changes, not for a filter its extra parameters override', async () => {
    const filters = reactive<Record<string, string>>({ from: '2026-11-01T00:00:00Z', model_contains: '' })
    const scope = effectScope()
    // the model picker's options: the models under the search, whatever model is picked
    scope.run(() => useUsageSummary('/usage/summary', filters, 'model', true, () => ({ model: '', model_contains: '' })))
    expect(get).toHaveBeenCalledTimes(1)
    Object.assign(filters, { model: 'gpt-4o', model_contains: '' })
    await nextTick()
    filters.model_contains = 'gpt'
    await nextTick()
    // an empty parameter is not sent: setting one asks nothing new
    filters.user_id = ''
    await nextTick()
    expect(get).toHaveBeenCalledTimes(1)
    filters.user_id = '7'
    await nextTick()
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenLastCalledWith('/usage/summary', expect.objectContaining({ user_id: '7', model: '', model_contains: '', group_by: 'model' }))
    scope.stop()
  })

  it('costs no query while disabled, asks once enabled, and again on reload', async () => {
    const filters = reactive<Record<string, string>>({ client_ip: '' })
    const enabled = ref(false)
    const scope = effectScope()
    const summary = scope.run(() => useUsageSummary('/usage/summary', filters, 'ip', enabled))!
    filters.client_ip = '192.0.2.7'
    await nextTick()
    expect(get).not.toHaveBeenCalled()
    enabled.value = true
    await nextTick()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenLastCalledWith('/usage/summary', expect.objectContaining({ client_ip: '192.0.2.7', group_by: 'ip' }))
    await summary.reload()
    expect(get).toHaveBeenCalledTimes(2)
    scope.stop()
  })
})
