import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
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
const TABS = ['connection', 'network', 'cc', 'deployment'] as const
const tab = (w: VueWrapper, key: (typeof TABS)[number]) => w.findAll('[data-testid="settings-tabs"] [role="tab"]')[TABS.indexOf(key)]
// SSelect option values are indexes into its options: request, false, true, auto, then a saved auto:N.
const SEARCH_MODES = ['request', 'false', 'true', 'auto']
const toolSearch = (w: VueWrapper) => {
  const el = w.get<HTMLSelectElement>('[data-testid="tool-search"]').element
  return Number(el.value) < SEARCH_MODES.length ? SEARCH_MODES[Number(el.value)] : el.options[el.selectedIndex].text
}
const SWITCH = '[data-testid="thinking-disabled-compat"] [role="switch"], [role="switch"][data-testid="thinking-disabled-compat"]'
const compatOn = (w: VueWrapper) => w.get(SWITCH).attributes('aria-checked') === 'true'

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
    const tabs = w.findAll('[data-testid="settings-tabs"] [role="tab"]')
    expect(tabs).toHaveLength(TABS.length)
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
    await tab(w, 'cc').trigger('click')
    const cc = w.get('[data-testid="request-policy"]')
    expect(cc.isVisible()).toBe(true)
    expect(cc.findAll(':scope > section').map(s => s.attributes('data-testid'))).toEqual(['cc-runtime-settings', 'client-attachments', 'unsupported-requests'])
    for (const id of ['tool-search', 'custom-tool-prefix', 'unknown-field']) {
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
    await tab(w, 'cc').trigger('click')
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
    await tab(w, 'cc').trigger('click')
    expect(w.get<HTMLInputElement>('[data-testid="unknown-field"] input[value="reject"]').element.checked).toBe(true)
    await w.get('[data-testid="unknown-field"] input[value="ignore"]').setValue(true)
    await tab(w, 'network').trigger('click')
    await w.get('[data-testid="network-allocation"] input[value="sequential"]').setValue(true)
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
    await tab(w, 'cc').trigger('click')
    expect(toolSearch(w)).toBe('auto:0')
    for (const tool_search of ['false', 'true']) {
      await w.get('[data-testid="tool-search"]').setValue(String(SEARCH_MODES.indexOf(tool_search)))
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeUndefined()
      await w.get('form').trigger('submit')
      await flushPromises()
      const payload = mocks.put.mock.lastCall?.[1].request_policy
      expect(payload).toEqual({ ...active, tool_search })
      for (const key of Object.keys(obsolete)) expect(payload).not.toHaveProperty(key)
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
      expect(toolSearch(w)).toBe(tool_search)
      expect(compatOn(w)).toBe(true)
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
    await tab(w, 'deployment').trigger('click')
    const accounts = w.get('[data-testid="account-content"]')
    expect(accounts.isVisible()).toBe(true)
    expect(w.get('[data-testid="settings-card"]').isVisible()).toBe(true)
    expect(w.get('[data-testid="remote-images"]').isVisible()).toBe(true)
    expect(accounts.element.closest('form')).toBeNull()
    // Runtime and images (saved by the form) first, then the containers they run.
    const card = w.get('[data-testid="settings-card"]').element
    expect(card.compareDocumentPosition(accounts.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const key of ['connection', 'network', 'cc'] as const) {
      await tab(w, key).trigger('click')
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

  it('expands every aggregate attachment, saves independent children and keeps actions outside the toggle', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    mocks.put.mockImplementation(async (_url: string, body: { request_policy: RequestPolicy }) => config(body.request_policy))
    const w = await render()
    await tab(w, 'cc').trigger('click')
    for (const group of ['working_directory', 'platform', 'model', 'date', 'session_context']) {
      const section = w.get(`[data-testid="attachment-group-${group}"]`)
      const toggle = section.get('button')
      expect(toggle.attributes('aria-expanded')).toBe('false')
      expect(toggle.find('input').exists()).toBe(false)
      await toggle.trigger('click')
      expect(toggle.attributes('aria-expanded')).toBe('true')
    }
    const platform = w.get('[data-testid="attachment-group-platform"]')
    await w.get('[data-testid="client-attachment-platform"] input[value="gateway"]').setValue(true)
    expect(platform.get('button').attributes('aria-expanded')).toBe('true')
    await w.get('[data-testid="client-attachment-shell"] input[value="keep"]').setValue(true)
    expect(platform.text()).toContain('分别配置')
    await platform.get('button').trigger('click')
    expect(w.find('[data-testid="client-attachment-shell"]').exists()).toBe(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.lastCall?.[1].request_policy.replace_client_attachments).toEqual(['platform_name', 'os_version'])
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    await platform.get('button').trigger('click')
    expect(w.get<HTMLInputElement>('[data-testid="client-attachment-shell"] input:checked').element.value).toBe('keep')
    expect(w.get<HTMLInputElement>('[data-testid="client-attachment-os_version"] input:checked').element.value).toBe('gateway')
    w.unmount()
  })

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
    expect(compatOn(w)).toBe(false)
    await w.get(SWITCH).trigger('click')
    expect(compatOn(w)).toBe(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.thinking_disabled_compat).toBe('omit')
    expect(compatOn(w)).toBe(true)
    w.unmount()
  })

  it('client attachments default to keep and save each type as kept, gateway or erased in vocabulary order', async () => {
    expect(defaultRequestPolicy().erase_client_attachments).toEqual([])
    expect(defaultRequestPolicy().replace_client_attachments).toEqual([])
    mocks.get.mockResolvedValue(config({}))
    mocks.put.mockImplementation(async (_url: string, body: { request_policy: RequestPolicy }) => config(body.request_policy))
    const w = await render()
    const choose = (type: string, action: string) => w.get(`[data-testid="client-attachment-${type}"] input[value="${action}"]`).setValue(true)
    const chosen = (type: string) => w.get<HTMLInputElement>(`[data-testid="client-attachment-${type}"] input:checked`).element.value
    for (const type of ['working_directory', 'platform', 'environment_update', 'model', 'date', 'total_tokens_reminder', 'session_context']) {
      expect(chosen(type)).toBe('keep')
    }
    // Every type offers client, server and erase.
    const options = (type: string) => w.get(`[data-testid="client-attachment-${type}"]`).findAll('label').map(o => o.text())
    for (const type of ['working_directory', 'platform', 'environment_update', 'model', 'date', 'total_tokens_reminder', 'session_context']) {
      expect(options(type)).toEqual(['客户端', '服务端', '擦除'])
    }
    await choose('session_context', 'gateway')
    await choose('session_context', 'erase')
    await choose('total_tokens_reminder', 'gateway')
    await choose('model', 'erase')
    await choose('working_directory', 'gateway')
    await choose('platform', 'erase')
    await choose('date', 'erase')
    // A type moves between the lists rather than appearing in both.
    await choose('model', 'gateway')
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.erase_client_attachments).toEqual(['platform', 'date', 'session_context'])
    expect(payload.request_policy.replace_client_attachments).toEqual(['working_directory', 'model', 'total_tokens_reminder'])
    expect(chosen('model')).toBe('gateway')
    expect(chosen('date')).toBe('erase')
    await choose('model', 'keep')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect((mocks.put.mock.lastCall![1] as { request_policy: RequestPolicy }).request_policy.replace_client_attachments).toEqual(['working_directory', 'total_tokens_reminder'])
    await choose('date', 'gateway')
    await w.get('form').trigger('submit')
    await flushPromises()
    const last = (mocks.put.mock.lastCall![1] as { request_policy: RequestPolicy }).request_policy
    expect(last.replace_client_attachments).toEqual(['working_directory', 'date', 'total_tokens_reminder'])
    expect(last.erase_client_attachments).toEqual(['platform', 'session_context'])
    expect(chosen('working_directory')).toBe('gateway')
    expect(chosen('platform')).toBe('erase')
    expect(chosen('environment_update')).toBe('keep')
    w.unmount()
  })

  it.each(LOCALES)('removes relay controls and their unused copy in %s', async locale => {
    i18n.global.locale.value = locale
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await tab(w, 'cc').trigger('click')
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
    await tab(w, 'cc').trigger('click')
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
    expect(compatOn(w)).toBe(true)
    await w.get(SWITCH).trigger('click')
    expect(compatOn(w)).toBe(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.put.mock.calls[0]![1] as { request_policy: RequestPolicy }
    expect(payload.request_policy.thinking_disabled_compat).toBe('pass')
    w.unmount()
  })
})
