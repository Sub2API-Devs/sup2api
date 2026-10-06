import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import zh from '@/i18n/locales/zh/ccgateway'
import en from '@/i18n/locales/en/ccgateway'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
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
    const wrapper = mount(RemoteSettings, { global: { plugins: [i18n] } })
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
})
