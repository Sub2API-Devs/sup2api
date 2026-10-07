import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import WorkerCapabilities from './WorkerCapabilities.vue'

const mock = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mock }))

describe('Worker capability evidence', () => {
  async function inspect() {
    i18n.global.locale.value = 'zh'
    mock.list.mockResolvedValue({ items: [{ id: 22, name: 'test account' }] })
    const w = mount(WorkerCapabilities, { props: { featureId: 'F-FAST' }, global: { plugins: [i18n] } })
    expect(mock.get).not.toHaveBeenCalled()
    await w.get('button').trigger('click'); await flushPromises()
    await w.get('select').setValue('22')
    await w.get('[data-testid="capability-inspect"]').trigger('click'); await flushPromises()
    return w
  }
  it('separates code declaration and CLI observation from model verification', async () => {
    vi.clearAllMocks()
    mock.get.mockResolvedValue({ protocol_version: 1, build: { version: 'dev', revision: 'abc123', modified: false }, policy_schema_versions: [1], runtime_probes: [{ name: 'cli_version', status: 'observed', value: '2.1.292' }], model_provider_verification: 'not_run', code_catalog: { catalog_version: 'worker-source', policy_schema_version: 1, runtime_verified: false, features: [{ id: 'F-FAST', title: 'Fast', category: 'generation', scope: 'api', status: 'partial', body_paths: [], beta_headers: [], mechanisms: [], reason: 'Qualification still depends on upstream' }] } })
    const w = await inspect()
    expect(mock.get).toHaveBeenCalledWith('/system/ccgateway/accounts/22/features')
    expect(w.text()).toContain('abc123')
    expect(w.text()).toContain('2.1.292')
    expect(w.text()).toContain('未进行模型调用，未验证')
    expect(w.text()).toContain('Qualification still depends on upstream')
    await w.get('select').setValue('')
    expect(w.text()).not.toContain('abc123')
  })
  it('does not infer runtime support when an old Worker returns 404', async () => {
    vi.clearAllMocks(); mock.get.mockRejectedValue(new Error('404'))
    const w = await inspect()
    expect(w.get('[role="alert"]').text()).toContain('旧 Worker')
    expect(w.find('dl').exists()).toBe(false)
    expect(mock.get).toHaveBeenCalledTimes(1)
  })
  it('searches and paginates on the server while retaining only the current page and selection', async () => {
    vi.clearAllMocks()
    mock.list.mockResolvedValueOnce({ items: [{ id: 22, name: 'selected account' }], page: { total: 45 } })
      .mockResolvedValueOnce({ items: [{ id: 43, name: 'second page' }], page: { total: 45 } })
      .mockResolvedValueOnce({ items: [{ id: 78, name: 'matching name' }], page: { total: 1 } })
    const w = mount(WorkerCapabilities, { props: { featureId: 'F-FAST' }, global: { plugins: [i18n] } })
    await w.get('button').trigger('click'); await flushPromises()
    await w.get('select').setValue('22')
    await w.get('[data-testid="capability-next"]').trigger('click'); await flushPromises()
    expect(mock.list).toHaveBeenLastCalledWith('/accounts', { plugin_key: 'ccgateway', page: 2, page_size: 20, q: '' })
    expect(w.get('select').element.value).toBe('22')
    expect(w.text()).toContain('selected account')
    await w.get('[data-testid="capability-account-search"]').setValue('matching')
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mock.list).toHaveBeenLastCalledWith('/accounts', { plugin_key: 'ccgateway', page: 1, page_size: 20, q: 'matching' })
    expect(w.text()).not.toContain('second page')
    expect(w.get('select').element.value).toBe('22')
    expect(w.findAll('select option')).toHaveLength(3)
    expect(w.get('[data-testid="capability-next"]').attributes('disabled')).toBeDefined()
  })
})
