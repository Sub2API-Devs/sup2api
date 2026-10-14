import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n, LOCALES } from '@/i18n'
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

  it('shows native CC tools and unsupported-field handling without legacy attachment or beta controls', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    expect(w.get('[data-testid="request-policy"]').isVisible()).toBe(false)
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    const cc = w.get('[data-testid="request-policy"]')
    expect(cc.isVisible()).toBe(true)
    expect(cc.findAll(':scope > section').map(s => s.attributes('data-testid'))).toEqual(['cc-runtime-settings', 'unsupported-requests'])
    for (const id of ['tool-search', 'custom-tool-prefix', 'unknown-field-reject']) {
      expect(cc.get(`[data-testid="${id}"]`).isVisible()).toBe(true)
    }
    expect(cc.text()).toContain('工具与错误处理')
    expect(cc.text()).toContain('不支持的请求如何处理')
    expect(cc.text()).not.toContain('附件默认来源')
    // No switches for features the official API supports.
    for (const id of ['allow-fast', 'allow-effort']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    // One CC features heading and no feature catalog: what each feature supports is
    // documented in the Worker's catalog (user request 2026-10-11). The thinking
    // disabled compatibility is a switch.
    expect(mocks.get.mock.calls.map(call => call[0])).not.toContain('/system/ccgateway/features')
    expect(cc.findAll('h4').filter(h => h.text() === 'CC 特性')).toHaveLength(1)
    expect(cc.find('[data-testid="cc-feature-catalog"]').exists()).toBe(false)
    for (const id of ['F-SAFEGUARDS', 'F-RELAY-PASSTHROUGH', 'F-THINKING-DISABLED-COMPAT']) expect(cc.text()).not.toContain(id)
    expect(cc.get('[data-testid="thinking-disabled-compat"]').isVisible()).toBe(true)
    w.unmount()
  })

  it.each(LOCALES)('does not render legacy attachment or unknown-beta controls or their hints in %s', async locale => {
    i18n.global.locale.value = locale
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    const cc = w.get('[data-testid="request-policy"]')
    for (const id of ['cc-attachments', 'attachment-source', 'attachment-overrides', 'attachment-model', 'attachment-date', 'attachment-total_tokens_reminder', 'attachment-session_context', 'environment-workingDirectory', 'environment-platform', 'unknown-attachment-client', 'unknown-attachment-gateway', 'unknown-beta']) {
      expect(cc.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    const copy = locale === 'zh' ? zh : en
    expect(cc.text()).not.toContain(copy.features.ccHint)
    expect(cc.text()).not.toContain(copy.policy.ignoreHint)
    w.unmount()
  })

  it('saves the unsupported-request choices with the other settings', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    expect(w.get<HTMLInputElement>('[data-testid="unknown-field-reject"] input').element.checked).toBe(true)
    await w.get('[data-testid="unknown-field-ignore"] input').setValue(true)
    await w.get('[data-testid="settings-tab-network"]').trigger('click')
    await w.get('[data-testid="network-allocation"]').setValue('sequential')
    const next = { ...defaultRequestPolicy(), unknown_field: 'ignore' as const }
    mocks.put.mockResolvedValue({ ...config(next), network: { pool: '10.0.0.0/8', allocation: 'sequential' } })
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.put.mock.lastCall?.[1].request_policy).toEqual(next)
    expect(mocks.put.mock.lastCall?.[1].network).toEqual({ pool: '10.0.0.0/8', allocation: 'sequential' })
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('drops saved attachment settings and unknown-beta choices on repeated saves even when the core returns them', async () => {
    const obsolete = {
      attachment_source: 'gateway' as const,
      attachment_sources: { environment: 'gateway' as const, date: 'both' as const },
      environment_fields: { platform: 'client' as const },
      unknown_client_attachment: 'ignore' as const, unknown_gateway_attachment: 'pass' as const,
      unknown_beta: 'reject' as const
    }
    const active = { ...defaultRequestPolicy(), schema_version: 1, tool_search: 'auto:0', thinking_disabled_compat: 'omit' as const, unknown_field: 'ignore' as const }
    mocks.get.mockResolvedValue(config({ ...active, ...obsolete }))
    mocks.put.mockImplementation(async (_url: string, body: { request_policy: RequestPolicy }) => config({ ...body.request_policy, ...obsolete }))
    const w = await render()
    // Ignored historical data must not make an unchanged native form dirty.
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    expect(w.get<HTMLSelectElement>('[data-testid="tool-search"]').element.value).toBe('auto:0')
    for (const tool_search of ['false', 'true']) {
      await w.get('[data-testid="tool-search"]').setValue(tool_search)
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeUndefined()
      await w.get('form').trigger('submit')
      await flushPromises()
      const payload = mocks.put.mock.lastCall?.[1].request_policy
      expect(payload).toEqual({ ...active, tool_search })
      for (const key of Object.keys(obsolete)) expect(payload).not.toHaveProperty(key)
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
      expect(w.get<HTMLSelectElement>('[data-testid="tool-search"]').element.value).toBe(tool_search)
      expect(w.get<HTMLInputElement>('[data-testid="thinking-disabled-compat"]').element.checked).toBe(true)
    }
    expect(mocks.put).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('saves and reloads the custom tool prefix with a legacy default', async () => {
    mocks.get.mockResolvedValue(config({}))
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

describe('CCGateway native request policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(RemoteSettings, { attachTo: document.body, global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    return wrapper
  }

  it('thinking disabled compatibility defaults to off, has zh/en copy and saves omit', async () => {
    expect(defaultRequestPolicy().thinking_disabled_compat).toBe('pass')
    expect(zh.policy.thinkingDisabledCompatHint).toContain('默认关闭：与官方 API 一致返回 400')
    expect(zh.policy.thinkingDisabledCompatHint).toContain('仅在模型被改写、客户端仍发送 disabled 时使用')
    expect(en.policy.thinkingDisabledCompatHint).toContain('return 400')
    expect(zh.policy.thinkingDisabledCompatHint).toContain('原生 CLI 执行')
    expect(en.policy.thinkingDisabledCompatHint).toContain('native CLI execution')
    mocks.get.mockResolvedValue(config({}))
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
    w.unmount()
  })

  it('client attachment erasure defaults to none and saves the checked types in vocabulary order', async () => {
    expect(defaultRequestPolicy().erase_client_attachments).toEqual([])
    mocks.get.mockResolvedValue(config({}))
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), erase_client_attachments: ['date', 'session_context'] }))
    const w = await render()
    for (const type of ['environment', 'model', 'date', 'total_tokens_reminder', 'session_context']) {
      expect(w.get<HTMLInputElement>(`[data-testid="erase-${type}"]`).element.checked).toBe(false)
    }
    await w.get('[data-testid="erase-session_context"]').setValue(true)
    await w.get('[data-testid="erase-model"]').setValue(true)
    await w.get('[data-testid="erase-date"]').setValue(true)
    await w.get('[data-testid="erase-model"]').setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.erase_client_attachments).toEqual(['date', 'session_context'])
    expect(w.get<HTMLInputElement>('[data-testid="erase-date"]').element.checked).toBe(true)
    expect(w.get<HTMLInputElement>('[data-testid="erase-model"]').element.checked).toBe(false)
    w.unmount()
  })

  it.each(LOCALES)('removes relay controls and their unused copy in %s', async locale => {
    i18n.global.locale.value = locale
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    for (const id of ['relay-mode', 'relay-native-accounts', 'relay-passthrough-accounts', 'pass-upstream-errors']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    const copy = locale === 'zh' ? zh : en
    for (const key of ['relayMode', 'relayMode_legacy', 'relayMode_passthrough', 'relayMode_native', 'relayModeHint', 'relayNativeAccounts', 'relayNativeAccountsHint', 'relayPassthroughAccounts', 'relayPassthroughAccountsHint', 'passUpstreamErrors', 'passUpstreamErrorsHint']) {
      expect(copy.policy).not.toHaveProperty(key)
    }
    w.unmount()
  })

  it.each(['legacy', 'passthrough', 'native', undefined])('saves native only after loading historical mode %s and rollout lists', async relay_mode => {
    const historical = {
      relay_mode, pass_upstream_errors: true,
      relay_native_accounts: [24], relay_passthrough_accounts: [23]
    }
    mocks.get.mockResolvedValue(config(historical as Partial<RequestPolicy>))
    // An older core returning the same obsolete fields must not re-enable them either.
    mocks.put.mockImplementation(async (_url: string, body: { request_policy: RequestPolicy }) => config({
      ...historical, ...body.request_policy, relay_mode
    } as Partial<RequestPolicy>))
    const w = await render()
    await w.get('[data-testid="settings-tab-cc"]').trigger('click')
    for (const prefix of ['mytools', 'updatedtools']) {
      await w.get('[data-testid="custom-tool-prefix"]').setValue(prefix)
      await w.get('form').trigger('submit')
      await flushPromises()
      const payload = mocks.put.mock.lastCall?.[1].request_policy
      expect(payload).toEqual({ ...defaultRequestPolicy(), custom_tool_prefix: prefix })
      expect(payload.relay_mode).toBe('native')
      expect(payload).not.toHaveProperty('relay_native_accounts')
      expect(payload).not.toHaveProperty('relay_passthrough_accounts')
      expect(payload).not.toHaveProperty('pass_upstream_errors')
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    }
    expect(mocks.put).toHaveBeenCalledTimes(2)
    w.unmount()
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
    w.unmount()
  })
})
