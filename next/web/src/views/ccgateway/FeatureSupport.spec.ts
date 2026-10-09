import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import FeatureSupport from './FeatureSupport.vue'
import { defaultRequestPolicy } from './requestPolicy'
import { isFeatureCatalog, type FeatureCatalog, type GatewayFeature } from './featureCatalog'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks }))
const feature = (id: string, status: GatewayFeature['status'] = 'supported'): GatewayFeature => ({
  id, title: id, scope: 'api', category: 'generation', status, body_paths: ['output_config'],
  beta_headers: ['example-beta'], mechanisms: ['cli_env'], reason: 'Source-level support only',
})
const catalog = (features: GatewayFeature[]): FeatureCatalog => ({ catalog_version: 'test-1', policy_schema_version: 1, runtime_verified: false, features })

describe('CCGateway feature catalog', () => {
  it('shows CC safeguards as source-level documentation without a disable switch', async () => {
    mocks.get.mockResolvedValue(catalog([feature('F-STREAM'), { ...feature('F-SAFEGUARDS', 'partial'), scope: 'cc', body_paths: ['safeguards'], beta_headers: ['dangerous-tool-use-2026-09-03'] }]))
    const w = mount(FeatureSupport, { props: { scope: 'cc' }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.find('[data-testid="feature-F-STREAM"]').exists()).toBe(false)
    await w.get('[data-testid="feature-F-SAFEGUARDS"] button').trigger('click')
    expect(w.text()).toContain('dangerous-tool-use-2026-09-03')
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  beforeEach(() => { vi.clearAllMocks(); i18n.global.locale.value = 'zh' })
  async function render() {
    const wrapper = mount(FeatureSupport, { global: { plugins: [i18n] } })
    await flushPromises()
    return wrapper
  }
  it('groups beta, parameters and mechanisms without inventing a feature switch', async () => {
    mocks.get.mockResolvedValue(catalog([feature('F-STREAM')]))
    const w = await render()
    expect(mocks.get).toHaveBeenCalledWith('/system/ccgateway/features')
    expect(w.text()).toContain('不代表当前账号、模型或 Worker')
    await w.get('[data-testid="feature-F-STREAM"] button').trigger('click')
    expect(w.text()).toContain('output_config')
    expect(w.text()).toContain('example-beta')
    expect(w.text()).toContain('cli_env')
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('keeps credit forms, beta and qualification in one read-only API feature', async () => {
    const source = catalog([{
      ...feature('F-FALLBACK', 'partial'), title: '模型回退与缓存信用',
      body_paths: ['fallback_credit_token.mode', 'usage.fallback_credit'],
      beta_headers: ['fallback-credit-2026-07-01'],
      mechanisms: ['同账号与 issuer 的信用托管'],
      reason: 'strict/best_effort 与 null；信用 SSE 有界缓冲，真实提供商退款未验证。',
    }, { ...feature('F-SAFEGUARDS', 'partial'), scope: 'cc' }])
    source.catalog_version = '2026-10-08.10'
    mocks.get.mockResolvedValue(source)
    const w = await render()
    expect(w.text()).toContain('通用 API 特性')
    expect(w.find('[data-testid="feature-F-SAFEGUARDS"]').exists()).toBe(false)
    await w.get('[data-testid="feature-search"]').setValue('best_effort')
    await w.get('[data-testid="feature-F-FALLBACK"] button').trigger('click')
    const detail = w.get('#feature-detail-F-FALLBACK')
    for (const text of ['fallback_credit_token.mode', 'usage.fallback_credit', 'fallback-credit-2026-07-01', 'issuer', '有界缓冲', '未验证']) {
      expect(detail.text()).toContain(text)
    }
    expect(w.text()).toContain('2026-10-08.10')
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('paginates and filters without editing policy, excluding CC-only entries', async () => {
    mocks.get.mockResolvedValue(catalog([
      ...Array.from({ length: 9 }, (_, index) => feature(`F-${index}`)),
      feature('F-NOT-SUPPORTED', 'unsupported'), { ...feature('CC-ONLY'), scope: 'cc' },
    ]))
    const w = await render()
    expect(w.findAll('[data-testid^="feature-F-"]')).toHaveLength(8)
    expect(w.text()).not.toContain('CC-ONLY')
    await w.get('[data-testid="feature-filter"]').setValue('unsupported')
    expect(w.findAll('[data-testid^="feature-F-"]')).toHaveLength(1)
    expect(w.text()).toContain('1 / 1')
    await w.get('[data-testid="feature-search"]').setValue('no matching term')
    expect(w.text()).toContain('没有匹配的特性')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('keeps conditional custody support within the existing task budget feature', async () => {
    const source = catalog([{ ...feature('F-TASK-BUDGET', 'partial'), body_paths: ['output_config.task_budget'], beta_headers: ['task-budgets-2026-03-13'], mechanisms: ['核心托管 / Worker 协议 v1'], reason: '核心启用托管且实际 Worker 声明 v1；JSON/SSE 有界缓冲，旧未知历史不能建立托管链。普通 custom inline 按历史锚点恢复，撤销不复活；真实云端组合尚未验收。' }])
    source.catalog_version = '2026-10-08.16'
    mocks.get.mockResolvedValue(source)
    const w = await render()
    await w.get('[data-testid="feature-F-TASK-BUDGET"] button').trigger('click')
    expect(w.text()).toContain('2026-10-08.16')
    expect(w.text()).toContain('output_config.task_budget')
    expect(w.text()).toContain('task-budgets-2026-03-13')
    expect(w.text()).toContain('旧未知历史')
    expect(w.text()).toContain('撤销不复活')
    expect(w.text()).toContain('真实云端组合尚未验收')
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('shows unavailable on old or failed API responses and can retry', async () => {
    mocks.get.mockResolvedValueOnce({ request_policy: defaultRequestPolicy() }).mockResolvedValueOnce(catalog([feature('F-OUTPUT')]))
    const w = await render()
    expect(w.get('[role="alert"]').text()).toContain('无法确认支持范围')
    expect(w.find('[data-testid="feature-filter"]').exists()).toBe(false)
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    await w.get('[data-testid="feature-F-OUTPUT"] button').trigger('click')
    // Effort and fast mode are official API features: always on, no switch (CONTRACTS §53.11).
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('separates API tool search support from CC runtime configuration', async () => {
    mocks.get.mockResolvedValue(catalog([feature('F-TOOL-SEARCH', 'partial')]))
    const w = await render()
    await w.get('[data-testid="feature-F-TOOL-SEARCH"] button').trigger('click')
    const ccLink = w.findAll('button').find(button => button.text() === '查看 CC 工具搜索运行配置')!
    await ccLink.trigger('click')
    expect(w.emitted('cc')).toHaveLength(1)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('rejects malformed statuses and runtime claims instead of showing false support', () => {
    expect(isFeatureCatalog(catalog([feature('F-STREAM')]))).toBe(true)
    expect(isFeatureCatalog({ ...catalog([]), runtime_verified: true })).toBe(false)
    expect(isFeatureCatalog(catalog([{ ...feature('F-STREAM'), status: 'new-value' as GatewayFeature['status'] }]))).toBe(false)
    expect(isFeatureCatalog(catalog([{ ...feature('F-STREAM'), beta_headers: null as unknown as string[] }]))).toBe(false)
  })
})
