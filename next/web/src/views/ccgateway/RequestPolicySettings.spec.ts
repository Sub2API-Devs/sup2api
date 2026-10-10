import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import zh from '@/i18n/locales/zh/ccgateway'
import en from '@/i18n/locales/en/ccgateway'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/host', () => ({ api: mocks }))

// A connected controller (per-account containers are the only mode, CONTRACTS §53.9): saving
// other settings sends the endpoint back unchanged.
function config(policy: Partial<RequestPolicy> | undefined) {
  return {
    account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
    has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
    request_policy: policy, images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }
  }
}
// A policy saved before pass_upstream_errors and thinking_disabled_compat existed, as an older core returns it.
function legacyPolicy(): Partial<RequestPolicy> {
  const { pass_upstream_errors: _omit, thinking_disabled_compat: _compat, relay_mode: _relay, relay_passthrough_accounts: _accounts, ...rest } = defaultRequestPolicy()
  return rest
}

describe('CCGateway settings categories and CC features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })
  async function render(slots?: Record<string, string>) {
    const wrapper = mount(RemoteSettings, { attachTo: document.body, slots, global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    return wrapper
  }

  it('offers connection, network, CC features and deployment only', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    const tabs = w.findAll('[data-testid^="settings-tab-"]')
    expect(tabs.map(tab => tab.attributes('data-testid'))).toEqual(['settings-tab-connection', 'settings-tab-network', 'settings-tab-cc', 'settings-tab-deployment'])
    expect(tabs.map(tab => tab.text())).toEqual(['连接与授权', '网络配置', 'CC 特性', '部署与运行'])
    // The account containers and API features categories are gone.
    expect(w.find('[data-testid="settings-tab-accounts"]').exists()).toBe(false)
    expect(w.find('[data-testid="settings-tab-requests"]').exists()).toBe(false)
    expect(w.text()).not.toContain('通用 API 特性')
    expect('requests' in zh.settingsTabs || 'accounts' in zh.settingsTabs || 'requests' in en.settingsTabs || 'accounts' in en.settingsTabs).toBe(false)
    w.unmount()
  })

  it('shows the CC feature catalog, tools and error handling, attachments and unsupported requests', async () => {
    const features = { catalog_version: 'v', policy_schema_version: 1, runtime_verified: false, features: [
      { id: 'F-ADD-DIR', title: '额外目录访问', category: 'CC 执行上下文', scope: 'cc', status: 'supported', body_paths: ['additional_directories'], beta_headers: [], mechanisms: ['CLI --add-dir 参数传递'], reason: 'r' },
      { id: 'F-SAFEGUARDS', title: '工具安全审查', category: 'CC 执行上下文', scope: 'cc', status: 'partial', body_paths: ['safeguards'], beta_headers: [], mechanisms: ['主请求归属与上下文保真'], reason: 'r' },
      { id: 'F-STREAM', title: '流式响应', category: 'generation', scope: 'api', status: 'supported', body_paths: ['stream'], beta_headers: [], mechanisms: [], reason: 'r' }
    ] }
    mocks.get.mockImplementation(async (path: string) => path === '/system/ccgateway/features' ? features : config(defaultRequestPolicy()))
    const w = await render()
    expect(w.get('[data-testid="request-policy"]').isVisible()).toBe(false)
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    const cc = w.get('[data-testid="request-policy"]')
    expect(cc.isVisible()).toBe(true)
    expect(cc.findAll(':scope > section').map(s => s.attributes('data-testid'))).toEqual(['cc-runtime-settings', 'cc-attachments', 'unsupported-requests'])
    for (const id of ['tool-search', 'custom-tool-prefix', 'pass-upstream-errors', 'attachment-source', 'attachment-overrides', 'unknown-beta', 'unknown-field']) {
      expect(cc.get(`[data-testid="${id}"]`).isVisible()).toBe(true)
    }
    expect(cc.text()).toContain('工具与错误处理')
    expect(cc.text()).toContain('不支持的请求如何处理')
    // The attachment settings are back in CC features (user request 2026-10-10).
    expect(cc.text()).toContain('附件默认来源')
    // No switches for features the official API supports.
    for (const id of ['allow-fast', 'allow-effort']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    // The CC feature catalog is shown in full, not folded (user request 2026-10-10),
    // under one CC features heading; fully supported features stay in the Worker's
    // catalog only (user request 2026-10-11).
    expect(mocks.get.mock.calls.map(call => call[0])).toContain('/system/ccgateway/features')
    expect(cc.findAll('h4').filter(h => h.text() === 'CC 特性')).toHaveLength(1)
    const details = cc.get('[data-testid="cc-feature-catalog"]')
    expect(details.element.tagName).not.toBe('DETAILS')
    expect(details.find('[data-testid="feature-F-ADD-DIR"]').exists()).toBe(false)
    expect(details.find('[data-testid="feature-F-STREAM"]').exists()).toBe(false)
    expect(details.find('[data-testid="feature-F-SAFEGUARDS"]').exists()).toBe(true)
    expect(details.text()).toContain('主请求归属与上下文保真')
    w.unmount()
  })

  it('saves the attachment sources with the other settings', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), attachment_source: 'gateway', environment_fields: { workingDirectory: 'client' } }))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    expect(w.get<HTMLInputElement>('[data-testid="attachment-source"][value="gateway"]').element.checked).toBe(true)
    expect(w.get<HTMLSelectElement>('[data-testid="environment-workingDirectory"]').element.value).toBe('client')
    await w.get('[data-testid="attachment-source"][value="client"]').setValue(true)
    await w.get('[data-testid="attachment-date"]').setValue('gateway')
    const next = { ...defaultRequestPolicy(), attachment_source: 'client' as const, attachment_sources: { date: 'gateway' as const }, environment_fields: { workingDirectory: 'client' as const } }
    mocks.put.mockResolvedValue(config(next))
    await w.get('form').trigger('submit')
    await flushPromises()
    const body = mocks.put.mock.calls.at(-1)?.[1]
    expect(body.request_policy.attachment_source).toBe('client')
    expect(body.request_policy.attachment_sources).toEqual({ date: 'gateway' })
    expect(body.request_policy.environment_fields).toEqual({ workingDirectory: 'client' })
    w.unmount()
  })

  it('saves the unsupported-request choices with the other settings', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    expect(w.get<HTMLInputElement>('[data-testid="unknown-beta"][value="ignore"]').element.checked).toBe(true)
    expect(w.get<HTMLInputElement>('[data-testid="unknown-field"][value="reject"]').element.checked).toBe(true)
    await w.get('[data-testid="unknown-beta"][value="reject"]').setValue(true)
    await w.get('[data-testid="unknown-field"][value="ignore"]').setValue(true)
    await w.get('[data-testid="settings-tab-network"]').trigger('click')
    await w.get('[data-testid="network-allocation"]').setValue('sequential')
    const next = { ...defaultRequestPolicy(), unknown_beta: 'reject' as const, unknown_field: 'ignore' as const }
    mocks.put.mockResolvedValue({ ...config(next), network: { pool: '10.0.0.0/8', allocation: 'sequential' } })
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.put.mock.lastCall?.[1].request_policy).toEqual(next)
    expect(mocks.put.mock.lastCall?.[1].network).toEqual({ pool: '10.0.0.0/8', allocation: 'sequential' })
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('keeps saved attachment settings it no longer edits', async () => {
    const saved = { ...defaultRequestPolicy(), attachment_source: 'gateway' as const, attachment_sources: { date: 'client' as const }, environment_fields: { platform: 'client' as const }, unknown_client_attachment: 'ignore' as const, unknown_gateway_attachment: 'ignore' as const }
    mocks.get.mockResolvedValue(config(saved))
    const w = await render()
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    await w.get('[data-testid="custom-tool-prefix"]').setValue('mytools')
    mocks.put.mockResolvedValue(config({ ...saved, custom_tool_prefix: 'mytools' }))
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.lastCall?.[1].request_policy).toEqual({ ...saved, custom_tool_prefix: 'mytools' })
    w.unmount()
  })

  it('saves and reloads the custom tool prefix with a legacy default', async () => {
    const { custom_tool_prefix: _omit, ...legacy } = defaultRequestPolicy()
    mocks.get.mockResolvedValue(config(legacy))
    const w = await render()
    expect(w.get<HTMLInputElement>('[data-testid="custom-tool-prefix"]').element.value).toBe('ccgateway')
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), custom_tool_prefix: 'mytools' }))
    await w.get('[data-testid="custom-tool-prefix"]').setValue('mytools')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.lastCall?.[1].request_policy.custom_tool_prefix).toBe('mytools')
    expect(w.get<HTMLInputElement>('[data-testid="custom-tool-prefix"]').element.value).toBe('mytools')
    expect(w.text()).toContain('mcp__mytools__lookup')
    w.unmount()
  })

  it('shows account containers in deployment, after the runtime and outside the settings form', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render({ accounts: '<div data-testid="account-content">Accounts</div>' })
    expect(w.get('[data-testid="account-content"]').isVisible()).toBe(false)
    await w.get('[data-testid="settings-tab-deployment"]').trigger('click')
    const accounts = w.get('[data-testid="account-content"]')
    expect(accounts.isVisible()).toBe(true)
    expect(w.get('[data-testid="settings-card"]').isVisible()).toBe(true)
    expect(w.get('[data-testid="remote-images"]').isVisible()).toBe(true)
    expect(accounts.element.closest('form')).toBeNull()
    // Runtime and images (saved by the form) first, then the containers they run.
    const card = w.get('[data-testid="settings-card"]').element
    expect(card.compareDocumentPosition(accounts.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const tab of ['connection', 'network', 'cc'] as const) {
      await w.get(`[data-testid="settings-tab-${tab}"]`).trigger('click')
      expect(w.get('[data-testid="account-content"]').isVisible()).toBe(false)
    }
    w.unmount()
  })

  it('shows resolved deployment images separately from overrides', async () => {
    mocks.get.mockResolvedValue({ ...config(defaultRequestPolicy()), account_runtimes: true,
      images: { app: '', egress: '', controller: '' },
      effective_images: { app: 'ccgateway:legacy', egress: 'egress:test', controller: 'controller:test' } })
    const w = await render()
    expect(w.get<HTMLInputElement>('[data-testid="image-app"]').element.value).toBe('')
    expect(w.text()).toContain('当前保存配置解析出的镜像：ccgateway:legacy')
    expect(w.text()).toContain('不代表现有容器内程序的版本')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })
})

describe('CCGateway pass upstream errors switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(RemoteSettings, { attachTo: document.body, global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    return wrapper
  }

  it('defaults to off and has zh/en copy', () => {
    expect(defaultRequestPolicy().pass_upstream_errors).toBe(false)
    expect(zh.policy.passUpstreamErrors).toBe('上游错误直接返回给客户端')
    expect(zh.policy.passUpstreamErrorsHint).toContain('401、429、529')
    expect(en.policy.passUpstreamErrors).toBeTruthy()
    expect(en.policy.passUpstreamErrorsHint).toContain('401, 429, 529')
  })

  it('shows a legacy policy as off and saves the enabled switch', async () => {
    mocks.get.mockResolvedValue(config(legacyPolicy()))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), pass_upstream_errors: true }))
    const w = await render()
    const box = w.get<HTMLInputElement>('[data-testid="pass-upstream-errors"]')
    expect(box.element.checked).toBe(false)
    expect(w.text()).toContain('上游错误直接返回给客户端')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()

    await box.setValue(true)
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeUndefined()
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.put).toHaveBeenCalledTimes(1)
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.pass_upstream_errors).toBe(true)
    expect(w.get<HTMLInputElement>('[data-testid="pass-upstream-errors"]').element.checked).toBe(true)
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
  })

  it('reads an enabled switch and saves it turned off', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), pass_upstream_errors: true }))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), pass_upstream_errors: false }))
    const w = await render()
    const box = w.get<HTMLInputElement>('[data-testid="pass-upstream-errors"]')
    expect(box.element.checked).toBe(true)

    await box.setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()

    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.pass_upstream_errors).toBe(false)
    expect(w.get<HTMLInputElement>('[data-testid="pass-upstream-errors"]').element.checked).toBe(false)
  })

  it('thinking disabled compatibility defaults to off, has zh/en copy and saves omit', async () => {
    expect(defaultRequestPolicy().thinking_disabled_compat).toBe('pass')
    expect(zh.policy.thinkingDisabledCompatHint).toContain('默认关闭：与官方 API 一致返回 400')
    expect(zh.policy.thinkingDisabledCompatHint).toContain('仅在模型被改写、客户端仍发送 disabled 时使用')
    expect(en.policy.thinkingDisabledCompatHint).toContain('return 400')
    mocks.get.mockResolvedValue(config(legacyPolicy()))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), thinking_disabled_compat: 'omit' }))
    const w = await render()
    const box = w.get<HTMLInputElement>('[data-testid="thinking-disabled-compat"]')
    expect(box.element.checked).toBe(false)
    await box.setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.thinking_disabled_compat).toBe('omit')
    expect(w.get<HTMLInputElement>('[data-testid="thinking-disabled-compat"]').element.checked).toBe(true)
  })

  it('relay mode defaults to legacy and saves passthrough accounts', async () => {
    expect(defaultRequestPolicy().relay_mode).toBe('legacy')
    expect(zh.policy.relayModeHint).toContain('中继不修改请求和响应')
    expect(en.policy.relayModeHint).toContain('changes neither requests nor responses')
    mocks.get.mockResolvedValue(config(legacyPolicy()))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), relay_passthrough_accounts: [23, 24] }))
    const w = await render()
    expect(w.get<HTMLSelectElement>('[data-testid="relay-mode"]').element.value).toBe('legacy')
    await w.get('[data-testid="relay-passthrough-accounts"]').setValue('23, 24 x 23 0')
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.relay_mode).toBe('legacy')
    expect(payload.request_policy.relay_passthrough_accounts).toEqual([23, 24])
  })

  it('saves full passthrough and hides the account list', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), relay_mode: 'passthrough' }))
    const w = await render()
    await w.get('[data-testid="relay-mode"]').setValue('passthrough')
    expect(w.find('[data-testid="relay-passthrough-accounts"]').exists()).toBe(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.relay_mode).toBe('passthrough')
  })

  it('saves the compatibility switch turned back off as pass', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), thinking_disabled_compat: 'omit' }))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), thinking_disabled_compat: 'pass' }))
    const w = await render()
    const box = w.get<HTMLInputElement>('[data-testid="thinking-disabled-compat"]')
    expect(box.element.checked).toBe(true)
    await box.setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.thinking_disabled_compat).toBe('pass')
  })
})
