import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), config: null as Record<string, unknown> | null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<object>()), confirm: mocks.confirm, toast: mocks.toast }))

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIQ\n-----END CERTIFICATE-----'
const FP = 'ab'.repeat(32)
const ssh = () => ({
  account_runtimes: true, mode: 'ssh', host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'password', host_key_fingerprint: 'SHA256:abc',
  has_password: true, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
  request_policy: defaultRequestPolicy(), images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }
})
const controller = () => ({ ...ssh(), mode: 'controller', host: 'ccg.example.com', port: 443, user: '', host_key_fingerprint: '', has_password: false, has_controller_ca: true, controller_ca_fingerprint: FP })
const reasonError = (details: Record<string, unknown>) => Object.assign(new Error('failed'), { details })

async function render(config: Record<string, unknown>) {
  mocks.config = config
  const w = mount(RemoteSettings, { attachTo: document.body, global: { plugins: [i18n, createPinia()] } })
  await flushPromises()
  return w
}

describe('CCGateway control panel mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.confirm.mockResolvedValue(true)
    mocks.get.mockImplementation(async (url: string) => url === '/system/ccgateway/remote-config' ? mocks.config : { expected: { app: '', egress: '', controller: '' }, installed: null, up_to_date: false })
  })

  it('shows only the control panel fields, the pinned certificate and the test button', async () => {
    const w = await render(controller())
    expect(w.get<HTMLSelectElement>('[data-testid="remote-mode"]').element.value).toBe('controller')
    expect(w.get<HTMLInputElement>('[data-testid="controller-host"]').element.value).toBe('ccg.example.com')
    expect(w.get<HTMLInputElement>('[data-testid="controller-port"]').element.value).toBe('443')
    expect(w.get<HTMLInputElement>('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('已保存，留空保持不变')
    expect(w.get('[data-testid="controller-ca-fingerprint"]').text()).toContain(FP)
    for (const id of ['remote-host', 'remote-user', 'remote-password', 'remote-fingerprint', 'admin_key', 'controller-install']) expect(w.find(`[data-testid="${id}"]`).exists(), id).toBe(false)
    expect(w.get('[data-testid="remote-routing-hint"]').text()).toContain('控制面板模式经 HTTPS')
    expect(w.get('[data-testid="remote-routing-hint"]').text()).not.toContain('SSH 模式')
    expect(w.find('[data-testid="remote-status"]').exists()).toBe(false)
    expect(w.find('[data-testid="remote-start"]').exists()).toBe(false)
    mocks.post.mockResolvedValue({ output: 'controller 0.2.0' })
    await w.get('[data-testid="remote-test"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/remote-test', {}, expect.anything())
    expect(w.get('[data-testid="remote-output"]').text()).toBe('controller 0.2.0')
    w.unmount()
  })

  it('switches from SSH with the HTTPS default port and saves no SSH fields', async () => {
    const w = await render(ssh())
    await w.get('[data-testid="remote-mode"]').setValue('controller')
    await flushPromises()
    expect(w.get<HTMLInputElement>('[data-testid="controller-port"]').element.value).toBe('443')
    expect(w.find('[data-testid="remote-user"]').exists()).toBe(false)
    expect(w.get('[data-testid="remote-routing-hint"]').text()).toContain('只保存控制面板地址')
    await w.get('[data-testid="controller-host"]').setValue('https://ccg.example.com')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain('请填写有效的控制面板地址')
    await w.get('[data-testid="controller-host"]').setValue('ccg.example.com')
    await w.get('[data-testid="controller-ca"]').setValue(PEM)
    await w.get('form').trigger('submit')
    await flushPromises()
    // Switching by hand needs the key again even though one is saved (§53.2).
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain('请填写控制面板管理密钥')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller())
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledTimes(1)
    const [url, payload] = mocks.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/system/ccgateway/remote-config')
    expect(payload).toMatchObject({ account_runtimes: true, mode: 'controller', host: 'ccg.example.com', port: 443, controller_ca: PEM, admin_key: 'k'.repeat(64) })
    for (const key of ['user', 'auth_mode', 'host_key_fingerprint', 'password', 'private_key', 'passphrase', 'api_key']) expect(payload, key).not.toHaveProperty(key)
    expect(w.text()).toContain('连接配置已保存。')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('requires per-account containers, an admin key and a PEM certificate', async () => {
    const w = await render({ ...ssh(), account_runtimes: false, has_admin_key: false })
    await w.get('[data-testid="remote-mode"]').setValue('controller')
    await w.get('[data-testid="controller-host"]').setValue('ccg.example.com')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('控制面板模式只服务一账号一容器')
    await w.get('input[type="checkbox"]').setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('请填写控制面板管理密钥')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    await w.get('[data-testid="controller-ca"]').setValue('not a certificate')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('根证书须为 PEM 格式')
    expect(mocks.put).not.toHaveBeenCalled()
    await w.get('[data-testid="controller-ca"]').setValue('')
    mocks.put.mockResolvedValue(controller())
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ mode: 'controller', admin_key: 'k'.repeat(64) })
    expect(mocks.put.mock.calls[0]![1]).not.toHaveProperty('controller_ca')
    w.unmount()
  })

  it('keeps the gateway image override when saving', async () => {
    const w = await render({ ...controller(), images: { app: '', egress: '', controller: '', gateway: 'caddy:2.8-alpine' } })
    await w.get('[data-testid="controller-port"]').setValue(8443)
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller())
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ port: 8443, images: { app: '', egress: '', controller: '', gateway: 'caddy:2.8-alpine' } })
    w.unmount()
  })

  it('keeps the saved key only for the same address and certificate', async () => {
    const w = await render(controller())
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('已保存，留空保持不变')
    await w.get('[data-testid="controller-ca"]').setValue(PEM)
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain('请填写控制面板管理密钥')
    w.unmount()
  })

  it('warns that a blank certificate means system roots once the address changes', async () => {
    const w = await render(controller())
    expect(w.find('[data-testid="controller-ca-reset"]').exists()).toBe(false)
    await w.get('[data-testid="controller-host"]').setValue('203.0.113.9')
    expect(w.find('[data-testid="controller-ca-reset"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('installing the control panel from SSH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.confirm.mockResolvedValue(true)
    mocks.get.mockImplementation(async (url: string) => url === '/system/ccgateway/remote-config' ? mocks.config : { expected: { app: '', egress: '', controller: '' }, installed: null, up_to_date: false })
  })

  it('offers the card only on a saved, unchanged SSH connection with per-account containers', async () => {
    let w = await render({ ...ssh(), account_runtimes: false })
    expect(w.find('[data-testid="controller-install"]').exists()).toBe(false)
    w.unmount()
    w = await render(ssh())
    expect(w.get<HTMLInputElement>('[data-testid="controller-install-host"]').element.value).toBe('203.0.113.7')
    expect(w.get<HTMLInputElement>('[data-testid="controller-install-port"]').element.value).toBe('443')
    expect(w.get('[data-testid="controller-install"]').text()).toContain('Let’s Encrypt')
    await w.get('[data-testid="remote-port"]').setValue(2222)
    expect(w.find('[data-testid="controller-install"]').exists()).toBe(false)
    w.unmount()
  })

  it('installs, then shows the control panel configuration', async () => {
    const w = await render(ssh())
    await w.get('[data-testid="controller-install-email"]').setValue('ops@example.com')
    mocks.post.mockResolvedValue({ ...controller(), host: '203.0.113.7' })
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    expect(mocks.confirm.mock.calls[0]![0].message).toContain('443')
    const [url, body, opts] = mocks.post.mock.calls[0] as [string, unknown, { signal: AbortSignal }]
    expect(url).toBe('/system/ccgateway/controller/install')
    expect(body).toEqual({ host: '203.0.113.7', port: 443, email: 'ops@example.com' })
    expect(opts.signal).toBeInstanceOf(AbortSignal)
    expect(w.get<HTMLSelectElement>('[data-testid="remote-mode"]').element.value).toBe('controller')
    expect(w.text()).toContain('控制面板已安装')
    expect(w.find('[data-testid="controller-install"]').exists()).toBe(false)
    expect(w.find('[data-testid="remote-user"]').exists()).toBe(false)
    w.unmount()
  })

  it('does nothing when the confirmation is declined or the input is invalid', async () => {
    const w = await render(ssh())
    mocks.confirm.mockResolvedValue(false)
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
    await w.get('[data-testid="controller-install-email"]').setValue('not-an-email')
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="controller-install-error"]').text()).toContain('请填写有效的地址')
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows the translated reason and the failed stage', async () => {
    const w = await render(ssh())
    mocks.post.mockRejectedValue(reasonError({ reason: 'gateway_unreachable', stage: 'tls' }))
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    const text = w.get('[data-testid="controller-install-error"]').text()
    expect(text).toContain('无法经 HTTPS 访问控制面板')
    expect(text).toContain('失败阶段：TLS 握手 / 证书校验')
    expect(w.get<HTMLSelectElement>('[data-testid="remote-mode"]').element.value).toBe('ssh')
    mocks.post.mockRejectedValue(reasonError({ reason: 'install_in_progress' }))
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="controller-install-error"]').text()).toBe('运行环境正在安装，请稍后刷新状态')
    w.unmount()
  })

  it('recognizes an install that finished after the request was cut off', async () => {
    const w = await render(ssh())
    mocks.post.mockRejectedValue(new TypeError('Failed to fetch'))
    mocks.config = controller()
    await w.get('[data-testid="controller-install-submit"]').trigger('click')
    await flushPromises()
    expect(w.get<HTMLSelectElement>('[data-testid="remote-mode"]').element.value).toBe('controller')
    expect(w.text()).toContain('配置已切换为控制面板模式')
    w.unmount()
  })
})
