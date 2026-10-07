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

function config(policy: Partial<RequestPolicy> | undefined) {
  return {
    account_runtimes: false, mode: 'local', host: '', port: 22, user: '', auth_mode: 'password', host_key_fingerprint: '',
    has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: true,
    request_policy: policy, images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }
  }
}
// A policy saved before pass_upstream_errors existed, as an older core returns it.
function legacyPolicy(): Partial<RequestPolicy> {
  const { pass_upstream_errors: _omit, ...rest } = defaultRequestPolicy()
  return rest
}

describe('CCGateway pass upstream errors switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    return wrapper
  }

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

  it('defaults to off and has zh/en copy', () => {
    expect(defaultRequestPolicy().pass_upstream_errors).toBe(false)
    expect(zh.policy.passUpstreamErrors).toBe('上游错误直接返回给客户端')
    expect(zh.policy.passUpstreamErrorsHint).toContain('401、429、529')
    expect(en.policy.passUpstreamErrors).toBeTruthy()
    expect(en.policy.passUpstreamErrorsHint).toContain('401, 429, 529')
  })

  it('saves and reloads attachment overrides and unknown policies', async () => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    const next = { ...defaultRequestPolicy(), attachment_sources: { environment: 'both' as const, date: 'gateway' as const }, environment_fields: { workingDirectory: 'client' as const, platform: 'gateway' as const }, unknown_client_attachment: 'ignore' as const, unknown_gateway_attachment: 'ignore' as const }
    mocks.put.mockResolvedValue(config(next))
    await w.get('[data-testid="attachment-environment"]').setValue('both')
    await w.get('[data-testid="attachment-date"]').setValue('gateway')
    await w.get('[data-testid="environment-workingDirectory"]').setValue('client')
    await w.get('[data-testid="environment-platform"]').setValue('gateway')
    await w.get('[data-testid="unknown-attachment-client"]').setValue('ignore')
    await w.get('[data-testid="unknown-attachment-gateway"]').setValue('ignore')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.lastCall?.[1].request_policy).toEqual(next)
    expect(w.get<HTMLSelectElement>('[data-testid="attachment-environment"]').element.value).toBe('both')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    // Editing the map after loading must not mutate the saved baseline.
    await w.get('[data-testid="attachment-date"]').setValue('client')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('defaults legacy attachment settings and saves each selection', async () => {
    const { attachment_source: _omit, ...legacy } = defaultRequestPolicy()
    mocks.get.mockResolvedValue(config(legacy))
    const w = await render()
    expect(w.get<HTMLInputElement>('[data-testid="attachment-source"][value="client"]').element.checked).toBe(true)
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    for (const source of ['gateway', 'both', 'client'] as const) {
      mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), attachment_source: source }))
      await w.get(`[data-testid="attachment-source"][value="${source}"]`).setValue(true)
      await w.get('form').trigger('submit')
      await flushPromises()
      expect(mocks.put.mock.lastCall?.[1].request_policy.attachment_source).toBe(source)
      expect(w.get<HTMLInputElement>(`[data-testid="attachment-source"][value="${source}"]`).element.checked).toBe(true)
      expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
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
})
