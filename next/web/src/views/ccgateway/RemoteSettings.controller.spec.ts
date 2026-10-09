import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import zh from '@/i18n/locales/zh/ccgateway'
import en from '@/i18n/locales/en/ccgateway'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), config: null as Record<string, unknown> | null, runtime: null as Record<string, unknown> | null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<object>()), confirm: mocks.confirm, toast: mocks.toast }))

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIQ\n-----END CERTIFICATE-----'
const FP = 'ab'.repeat(32)
const SSH_FP = 'SHA256:' + 'A'.repeat(43)
const SSH_KEYS = ['ssh', 'user', 'auth_mode', 'host_key_fingerprint', 'password', 'private_key', 'passphrase', 'api_key']
const common = { has_password: false, has_private_key: false, has_passphrase: false, has_api_key: false, request_policy: defaultRequestPolicy(), images: null, network: { pool: '10.0.0.0/8', allocation: 'random' } }
const unconfigured = () => ({ ...common, account_runtimes: false, mode: 'disabled', host: '', port: 22, user: '', auth_mode: '', host_key_fingerprint: '', has_admin_key: false })
const legacySsh = () => ({ ...common, account_runtimes: true, mode: 'ssh', host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'password', host_key_fingerprint: SSH_FP, has_password: true, has_admin_key: true })
const controller = (over: Record<string, unknown> = {}) => ({ ...common, account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '', has_admin_key: true, has_controller_ca: true, controller_ca_fingerprint: FP, ...over })
const reasonError = (details: Record<string, unknown>) => Object.assign(new Error('failed'), { details })

async function render(config: Record<string, unknown>) {
  mocks.config = config
  const w = mount(RemoteSettings, { attachTo: document.body, global: { plugins: [i18n, createPinia()] } })
  await flushPromises()
  return w
}
const input = (w: VueWrapper, id: string) => w.get<HTMLInputElement>(`[data-testid="${id}"]`).element
async function submit(w: VueWrapper) {
  await w.get('form').trigger('submit')
  await flushPromises()
}
async function fillSsh(w: VueWrapper) {
  await w.get('[data-testid="install-ssh-host"]').setValue('198.51.100.4')
  await w.get('[data-testid="install-ssh-user"]').setValue('deploy')
  await w.get('[data-testid="install-ssh-password"]').setValue('ssh-secret')
  await w.get('[data-testid="install-ssh-fingerprint"]').setValue(SSH_FP)
}
async function clickInstall(w: VueWrapper) {
  await w.get('[data-testid="controller-install-submit"]').trigger('click')
  await flushPromises()
}
/** Unfolds "advanced: self-signed root certificate". */
async function openCa(w: VueWrapper) {
  await w.get('[data-testid="controller-ca-toggle"]').trigger('click')
}

beforeEach(() => {
  vi.clearAllMocks()
  i18n.global.locale.value = 'zh'
  mocks.confirm.mockResolvedValue(true)
  mocks.runtime = { expected: { app: '', egress: '', controller: '' }, installed: { controller_image: 'c', app_image: 'a', egress_image: 'e', version: '0.3.0' }, up_to_date: true }
  mocks.get.mockImplementation(async (url: string) => url === '/system/ccgateway/remote-config' ? mocks.config : mocks.runtime)
})

describe('controller connection', () => {
  it('shows the connected endpoint with its version, and only the connection fields', async () => {
    const w = await render(controller({ port: 18443 }))
    const status = w.get('[data-testid="controller-status"]')
    expect(status.attributes('data-state')).toBe('connected')
    expect(status.text()).toContain('已连接：https://ccg.example.com:18443')
    expect(w.get('[data-testid="controller-version"]').text()).toBe('控制器版本：0.3.0')
    expect(mocks.get).toHaveBeenCalledWith('/system/ccgateway/runtime', undefined, expect.anything())
    // One endpoint input, then the access key.
    const endpoint = input(w, 'controller-endpoint')
    expect(endpoint.value).toBe('https://ccg.example.com:18443')
    expect(endpoint.placeholder).toBe('https://controller.example.com:18443/controller')
    expect(w.text()).toContain('控制器端点')
    expect(w.text()).toContain('访问密钥')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('已保存，留空保持不变')
    // No protocol / address / port fields, no connection mode list, no per-account switch, no shared container actions.
    for (const id of ['controller-host', 'controller-port', 'controller-scheme', 'remote-mode', 'remote-host', 'remote-user', 'admin_key', 'api_key', 'remote-status', 'remote-start', 'controller-http-warning']) expect(w.find(`[data-testid="${id}"]`).exists(), id).toBe(false)
    expect(w.text()).not.toContain('启用一账号一容器')
    expect(w.text()).not.toContain('连接方式：')
    // The self-signed certificate is folded away, the pinned fingerprint inside.
    expect(w.find('[data-testid="controller-ca"]').exists()).toBe(false)
    expect(w.get('[data-testid="controller-ca-toggle"]').text()).toContain('高级：自签名根证书（可选）')
    await openCa(w)
    expect(w.get('[data-testid="controller-ca-fingerprint"]').text()).toContain(FP)
    expect(w.get('[data-testid="controller-ca-panel"]').text()).toContain('域名使用正式证书时留空')
    // Connected: the install part is folded as "reinstall".
    expect(w.get('[data-testid="controller-install-toggle"]').text()).toContain('重新安装 / 安装到其他主机')
    expect(w.find('[data-testid="controller-install-form"]').exists()).toBe(false)
    mocks.post.mockResolvedValue({ output: 'controller 0.3.0' })
    await w.get('[data-testid="remote-test"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/remote-test', {}, expect.anything())
    expect(w.get('[data-testid="remote-output"]').text()).toBe('controller 0.3.0')
    w.unmount()
  })

  it('shows the default port of the scheme as an endpoint without port', async () => {
    let w = await render(controller())
    expect(input(w, 'controller-endpoint').value).toBe('https://ccg.example.com')
    expect(w.get('[data-testid="controller-status"]').text()).toContain('已连接：https://ccg.example.com')
    w.unmount()
    w = await render(controller({ scheme: '', host: '2001:db8::1', port: 18443 }))
    expect(input(w, 'controller-endpoint').value).toBe('https://[2001:db8::1]:18443')
    w.unmount()
    w = await render(controller({ scheme: 'http', port: 80, has_controller_ca: false }))
    expect(input(w, 'controller-endpoint').value).toBe('http://ccg.example.com')
    expect(w.get('[data-testid="controller-http-warning"]').text()).toContain('明文传输')
    expect(w.find('[data-testid="controller-ca-toggle"]').exists()).toBe(false)
    w.unmount()
  })

  it('says when the connected controller cannot be read', async () => {
    mocks.runtime = { expected: { app: '', egress: '', controller: '' }, installed: null, up_to_date: false, reason: 'controller_unhealthy' }
    const w = await render(controller())
    expect(w.get('[data-testid="controller-version"]').text()).toContain('暂时无法访问控制器：容器控制器启动后未通过健康检查')
    w.unmount()
  })

  it('warns about an HTTP endpoint, hides the certificate and needs the key again', async () => {
    const w = await render(controller())
    await openCa(w)
    await w.get('[data-testid="controller-ca"]').setValue(PEM)
    await w.get('[data-testid="controller-endpoint"]').setValue('http://ccg.example.com:18080')
    expect(w.get('[data-testid="controller-http-warning"]').text()).toContain('明文传输')
    expect(w.find('[data-testid="controller-ca-toggle"]').exists()).toBe(false)
    expect(w.find('[data-testid="controller-ca"]').exists()).toBe(false)
    // Changing the endpoint is a new target: the saved key is not kept (§53.9).
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await submit(w)
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain('请填写访问密钥')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller({ scheme: 'http', port: 18080, has_controller_ca: false, controller_ca_fingerprint: '' }))
    await submit(w)
    expect(mocks.put).toHaveBeenCalledTimes(1)
    const [url, payload] = mocks.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/system/ccgateway/remote-config')
    expect(payload).toMatchObject({ account_runtimes: true, mode: 'controller', scheme: 'http', host: 'ccg.example.com', port: 18080, admin_key: 'k'.repeat(64) })
    for (const key of ['controller_ca', 'endpoint', ...SSH_KEYS]) expect(payload, key).not.toHaveProperty(key)
    expect(w.get('[data-testid="controller-status"]').text()).toContain('http://ccg.example.com:18080')
    expect(input(w, 'controller-endpoint').value).toBe('http://ccg.example.com:18080')
    expect(w.text()).toContain('连接配置已保存。')
    w.unmount()
  })

  it('warns about HTTP while the endpoint is being typed', async () => {
    const w = await render(unconfigured())
    await w.get('[data-testid="controller-endpoint"]').setValue('http://')
    expect(w.find('[data-testid="controller-http-warning"]').exists()).toBe(true)
    await w.get('[data-testid="controller-endpoint"]').setValue('https://')
    expect(w.find('[data-testid="controller-http-warning"]').exists()).toBe(false)
    w.unmount()
  })

  it('keeps the saved key only for the same endpoint and certificate', async () => {
    const w = await render(controller())
    // Other settings alone: the endpoint is sent unchanged, without a key.
    await w.get('[data-testid="network-allocation"]').setValue('sequential')
    mocks.put.mockResolvedValue(controller())
    await submit(w)
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443 })
    expect(mocks.put.mock.calls[0]![1]).not.toHaveProperty('admin_key')
    // The same endpoint written differently (explicit default port, trailing slash) is not a change.
    await w.get('[data-testid="controller-endpoint"]').setValue('https://ccg.example.com:443/')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('已保存，留空保持不变')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    await openCa(w)
    await w.get('[data-testid="controller-ca"]').setValue(PEM)
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await submit(w)
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(w.get('[role="alert"]').text()).toContain('请填写访问密钥')
    await w.get('[data-testid="controller-ca"]').setValue('')
    await w.get('[data-testid="controller-endpoint"]').setValue('https://ccg.example.com:8443')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    w.unmount()
  })

  it('saves and shows a path prefix, which needs the key again when it changes', async () => {
    const w = await render(controller({ host: '15.204.107.38', port: 18443, base_path: '/controller' }))
    expect(input(w, 'controller-endpoint').value).toBe('https://15.204.107.38:18443/controller')
    expect(w.get('[data-testid="controller-status"]').text()).toContain('已连接：https://15.204.107.38:18443/controller')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('已保存，留空保持不变')
    // A trailing slash is the same endpoint.
    await w.get('[data-testid="controller-endpoint"]').setValue('https://15.204.107.38:18443/controller/')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    // Another prefix, or none, is a new target.
    await w.get('[data-testid="controller-endpoint"]').setValue('https://15.204.107.38:18443/ccg')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await w.get('[data-testid="controller-endpoint"]').setValue('https://15.204.107.38:18443')
    expect(w.get('[data-testid="controller-admin-key"]').attributes('placeholder')).toBe('')
    await submit(w)
    expect(w.get('[role="alert"]').text()).toContain('请填写访问密钥')
    await w.get('[data-testid="controller-endpoint"]').setValue('https://15.204.107.38/ccg/controller/')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller({ host: '15.204.107.38', port: 443, base_path: '/ccg/controller' }))
    await submit(w)
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ mode: 'controller', scheme: 'https', host: '15.204.107.38', port: 443, base_path: '/ccg/controller', admin_key: 'k'.repeat(64) })
    expect(input(w, 'controller-endpoint').value).toBe('https://15.204.107.38/ccg/controller')
    w.unmount()
  })

  it('sends an empty path prefix for an endpoint without one', async () => {
    const w = await render(controller({ base_path: '/old' }))
    await w.get('[data-testid="controller-endpoint"]').setValue('https://ccg.example.com')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller())
    await submit(w)
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ host: 'ccg.example.com', port: 443, base_path: '' })
    w.unmount()
  })

  it.each(['ccg.example.com', 'ftp://ccg.example.com', 'https://ccg.example.com/a/../b', 'https://ccg.example.com/a%20b', 'https://ccg.example.com//x', 'https://user@ccg.example.com', 'https://ccg.example.com?x=1', 'https://2001:db8::1'])('refuses the endpoint %s', async raw => {
    const w = await render(controller())
    await w.get('[data-testid="controller-endpoint"]').setValue(raw)
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    await submit(w)
    expect(w.get('[role="alert"]').text()).toContain('请填写有效的控制器端点')
    expect(mocks.put).not.toHaveBeenCalled()
    w.unmount()
  })

  it('checks the certificate before saving', async () => {
    const w = await render(controller())
    await openCa(w)
    await w.get('[data-testid="controller-ca"]').setValue('not a certificate')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    await submit(w)
    expect(w.get('[role="alert"]').text()).toContain('根证书须为 PEM 格式')
    expect(mocks.put).not.toHaveBeenCalled()
    w.unmount()
  })

  it('warns that a blank certificate means system roots once the endpoint changes', async () => {
    const w = await render(controller())
    expect(w.find('[data-testid="controller-ca-reset"]').exists()).toBe(false)
    await w.get('[data-testid="controller-endpoint"]').setValue('https://203.0.113.9:18443')
    expect(w.find('[data-testid="controller-ca-reset"]').exists()).toBe(true)
    w.unmount()
  })

  it('keeps the gateway image override when saving', async () => {
    const w = await render(controller({ images: { app: '', egress: '', controller: '', gateway: 'caddy:2.8-alpine' } }))
    await w.get('[data-testid="controller-endpoint"]').setValue('https://ccg.example.com:8443')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller())
    await submit(w)
    expect(mocks.put.mock.calls[0]![1]).toMatchObject({ port: 8443, images: { app: '', egress: '', controller: '', gateway: 'caddy:2.8-alpine' } })
    w.unmount()
  })

  it('starts unconfigured with the install open, and connects an existing controller', async () => {
    const w = await render(unconfigured())
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('unconfigured')
    expect(w.get('[data-testid="controller-status"]').text()).toContain('未配置')
    expect(w.get('[data-testid="controller-install-toggle"]').text()).toContain('还没有控制器？通过本机 Docker / SSH 安装')
    expect(w.find('[data-testid="controller-install-form"]').exists()).toBe(true)
    expect(input(w, 'controller-endpoint').value).toBe('')
    expect(w.get('[data-testid="remote-test"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="controller-status"]').text()).not.toContain('控制器版本')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    // Other settings cannot be saved without a connection.
    await w.get('[data-testid="network-allocation"]').setValue('sequential')
    await submit(w)
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain('尚未连接控制器')
    await w.get('[data-testid="controller-endpoint"]').setValue('https://15.204.107.38:18443')
    await submit(w)
    expect(w.get('[role="alert"]').text()).toContain('请填写访问密钥')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    await openCa(w)
    await w.get('[data-testid="controller-ca"]').setValue(PEM)
    mocks.put.mockResolvedValue(controller({ host: '15.204.107.38', port: 18443 }))
    await submit(w)
    const payload = mocks.put.mock.calls[0]![1] as Record<string, unknown>
    // Saved per-account containers are always on.
    expect(payload).toMatchObject({ account_runtimes: true, mode: 'controller', scheme: 'https', host: '15.204.107.38', port: 18443, admin_key: 'k'.repeat(64), controller_ca: PEM, network: { pool: '10.0.0.0/8', allocation: 'sequential' } })
    for (const key of SSH_KEYS) expect(payload, key).not.toHaveProperty(key)
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('connected')
    expect(input(w, 'controller-endpoint').value).toBe('https://15.204.107.38:18443')
    expect(w.find('[data-testid="controller-install-form"]').exists()).toBe(false)
    w.unmount()
  })

  it('shows a legacy SSH connection and saves it back unchanged with other settings', async () => {
    const w = await render(legacySsh())
    const status = w.get('[data-testid="controller-status"]')
    expect(status.attributes('data-state')).toBe('legacy')
    expect(status.text()).toContain('旧连接方式：远程 SSH')
    expect(status.text()).toContain('安装控制器')
    expect(w.find('[data-testid="controller-install-form"]').exists()).toBe(true)
    expect(w.get('[data-testid="controller-install-legacy"]').text()).toContain('SSH 凭据随之清除')
    expect(input(w, 'controller-endpoint').value).toBe('')
    expect(w.get('[data-testid="remote-save"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="network-allocation"]').setValue('sequential')
    mocks.put.mockResolvedValue(legacySsh())
    await submit(w)
    const payload = mocks.put.mock.calls[0]![1] as Record<string, unknown>
    expect(payload).toMatchObject({ account_runtimes: true, mode: 'ssh', host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'password', host_key_fingerprint: SSH_FP })
    for (const key of ['password', 'private_key', 'passphrase', 'admin_key', 'scheme']) expect(payload, key).not.toHaveProperty(key)
    w.unmount()
  })

  it('treats a legacy shared-container configuration as not configured', async () => {
    const w = await render({ ...legacySsh(), account_runtimes: false })
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('unconfigured')
    // Its saved SSH connection is not offered for the install: it never ran per-account containers.
    expect(w.find('[data-testid="install-use-saved"]').exists()).toBe(false)
    expect(w.find('[data-testid="install-ssh-host"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('installing the controller', () => {
  it('installs over SSH on an automatic port, then connects and forgets the SSH details', async () => {
    const w = await render(unconfigured())
    expect(w.get<HTMLInputElement>('[data-testid="install-method"][value="ssh"]').element.checked).toBe(true)
    await fillSsh(w)
    expect(input(w, 'install-host').placeholder).toBe('198.51.100.4')
    expect(input(w, 'install-port').value).toBe('')
    // An IP address gets Caddy's internal certificate: no ACME email.
    expect(w.find('[data-testid="install-email"]').exists()).toBe(false)
    mocks.post.mockResolvedValue(controller({ host: '198.51.100.4', port: 18443 }))
    await clickInstall(w)
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    const message = mocks.confirm.mock.calls[0]![0].message as string
    expect(message).toContain('将通过 SSH 在 deploy@198.51.100.4:22 上')
    expect(message).toContain('自动选择（从 18443 起）')
    expect(message).not.toContain('ssh-secret')
    const [url, body, opts] = mocks.post.mock.calls[0] as [string, Record<string, unknown>, { signal: AbortSignal }]
    expect(url).toBe('/system/ccgateway/controller/install')
    expect(body).toEqual({
      method: 'ssh', scheme: 'https', host: '198.51.100.4', port: 0,
      ssh: { host: '198.51.100.4', port: 22, user: 'deploy', auth_mode: 'password', password: 'ssh-secret', host_key_fingerprint: SSH_FP }
    })
    expect(opts.signal).toBeInstanceOf(AbortSignal)
    expect(mocks.put).not.toHaveBeenCalled()
    // The returned configuration fills the endpoint, with the port the core chose.
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('connected')
    expect(input(w, 'controller-endpoint').value).toBe('https://198.51.100.4:18443')
    expect(w.text()).toContain('控制器已安装并连接：https://198.51.100.4:18443（端口 18443）')
    expect(w.find('[data-testid="controller-install-form"]').exists()).toBe(false)
    await w.get('[data-testid="controller-install-toggle"]').trigger('click')
    for (const id of ['install-ssh-host', 'install-ssh-user', 'install-ssh-password', 'install-ssh-fingerprint', 'install-host', 'install-port']) expect(input(w, id).value, id).toBe('')
    w.unmount()
  })

  it('never puts the SSH details of the install into the saved configuration', async () => {
    const w = await render(unconfigured())
    await fillSsh(w)
    await w.get('[data-testid="controller-endpoint"]').setValue('https://ccg.example.com')
    await w.get('[data-testid="controller-admin-key"]').setValue('k'.repeat(64))
    mocks.put.mockResolvedValue(controller())
    await submit(w)
    const payload = mocks.put.mock.calls[0]![1] as Record<string, unknown>
    for (const key of SSH_KEYS) expect(payload, key).not.toHaveProperty(key)
    expect(JSON.stringify(payload)).not.toContain('ssh-secret')
    expect(JSON.stringify(payload)).not.toContain('198.51.100.4')
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it('installs on local Docker with a chosen port over HTTP', async () => {
    const w = await render(unconfigured())
    await w.get('[data-testid="install-method"][value="local"]').setValue(true)
    expect(w.find('[data-testid="install-ssh"]').exists()).toBe(false)
    expect(w.get('[data-testid="install-local-hint"]').text()).toContain('docker')
    expect(input(w, 'install-host').placeholder).toBe('127.0.0.1')
    await w.get('[data-testid="install-scheme"][value="http"]').setValue(true)
    expect(w.get('[data-testid="install-http-warning"]').text()).toContain('明文传输')
    await w.get('[data-testid="install-port"]').setValue(18080)
    mocks.post.mockResolvedValue(controller({ scheme: 'http', host: '127.0.0.1', port: 18080, has_controller_ca: false }))
    await clickInstall(w)
    expect(mocks.post.mock.calls[0]![1]).toEqual({ method: 'local', scheme: 'http', host: '127.0.0.1', port: 18080 })
    const message = mocks.confirm.mock.calls[0]![0].message as string
    expect(message).toContain('将在核心所在的机器上')
    expect(message).toContain('端口：18080')
    expect(message).toContain('明文传输')
    expect(w.get('[data-testid="controller-status"]').text()).toContain('http://127.0.0.1:18080')
    w.unmount()
  })

  it('asks for the ACME email with HTTPS on a domain name only', async () => {
    const w = await render(unconfigured())
    await w.get('[data-testid="install-method"][value="local"]').setValue(true)
    await w.get('[data-testid="install-host"]').setValue('ccg.example.com')
    await w.get('[data-testid="install-email"]').setValue('ops@example.com')
    await w.get('[data-testid="install-port"]').setValue(443)
    mocks.post.mockResolvedValue(controller())
    await clickInstall(w)
    expect(mocks.post.mock.calls[0]![1]).toEqual({ method: 'local', scheme: 'https', host: 'ccg.example.com', port: 443, email: 'ops@example.com' })
    w.unmount()
  })

  it('explains how the gateway gets its certificate', async () => {
    const w = await render(unconfigured())
    // Nothing to say before there is an address.
    expect(w.find('[data-testid="install-cert"]').exists()).toBe(false)
    await w.get('[data-testid="install-ssh-host"]').setValue('198.51.100.4')
    expect(w.get('[data-testid="install-cert"]').attributes('data-cert')).toBe('internal')
    expect(w.get('[data-testid="install-cert"]').text()).toBe('使用 Caddy 内置证书，安装后自动固定其根证书。')
    expect(w.find('[data-testid="install-email"]').exists()).toBe(false)
    await w.get('[data-testid="install-host"]').setValue('ccg.example.com')
    const acme = w.get('[data-testid="install-cert"]')
    expect(acme.attributes('data-cert')).toBe('acme')
    expect(acme.text()).toContain('自动申请并续期 Let’s Encrypt 证书，不需要也不保存证书')
    expect(acme.text()).toContain('80 或 443 端口未被占用并可从公网访问（控制面板本身可用任意端口）')
    expect(w.find('[data-testid="install-email"]').exists()).toBe(true)
    await w.get('[data-testid="install-scheme"][value="http"]').setValue(true)
    expect(w.find('[data-testid="install-cert"]').exists()).toBe(false)
    expect(w.find('[data-testid="install-email"]').exists()).toBe(false)
    w.unmount()
  })

  it('shows the DNS warning of a successful install', async () => {
    const w = await render(unconfigured())
    await fillSsh(w)
    await w.get('[data-testid="install-host"]').setValue('ccg.example.com')
    mocks.post.mockResolvedValue({ ...controller({ port: 18443, has_controller_ca: false, controller_ca_fingerprint: '' }), warnings: ['dns_mismatch'] })
    await clickInstall(w)
    expect(mocks.post.mock.calls[0]![1]).toMatchObject({ method: 'ssh', scheme: 'https', host: 'ccg.example.com', port: 0 })
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('connected')
    expect(w.get('[data-testid="controller-install-warning"]').text()).toContain('域名解析结果不是该主机。如未使用 CDN / NAT，请检查 DNS')
    // The warning goes with the next action.
    mocks.post.mockResolvedValue({ output: 'ok' })
    await w.get('[data-testid="remote-test"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="controller-install-warning"]').exists()).toBe(false)
    w.unmount()
  })

  it('migrates a legacy SSH connection with the saved credentials (no method)', async () => {
    const w = await render(legacySsh())
    expect(input(w, 'install-use-saved').checked).toBe(true)
    expect(w.get('[data-testid="install-use-saved"]').element.parentElement!.textContent).toContain('root@203.0.113.7:22')
    expect(w.find('[data-testid="install-ssh"]').exists()).toBe(false)
    expect(input(w, 'install-host').placeholder).toBe('203.0.113.7')
    mocks.post.mockResolvedValue(controller({ host: '203.0.113.7', port: 18443 }))
    await clickInstall(w)
    expect(mocks.post.mock.calls[0]![1]).toEqual({ scheme: 'https', host: '203.0.113.7', port: 0 })
    const message = mocks.confirm.mock.calls[0]![0].message as string
    expect(message).toContain('将通过已保存的 SSH 连接在 root@203.0.113.7:22 上')
    expect(message).toContain('旧连接方式及其已保存的 SSH 凭据会被清除')
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('connected')
    w.unmount()
  })

  it('can migrate a legacy connection with new SSH details instead', async () => {
    const w = await render(legacySsh())
    await w.get('[data-testid="install-use-saved"]').setValue(false)
    await fillSsh(w)
    mocks.post.mockResolvedValue(controller())
    await clickInstall(w)
    expect(mocks.post.mock.calls[0]![1]).toMatchObject({ method: 'ssh', host: '198.51.100.4', ssh: { host: '198.51.100.4', user: 'deploy' } })
    w.unmount()
  })

  it('reinstalls from a connected controller after confirming the replacement', async () => {
    const w = await render(controller())
    await w.get('[data-testid="controller-install-toggle"]').trigger('click')
    expect(w.find('[data-testid="install-use-saved"]').exists()).toBe(false)
    await fillSsh(w)
    mocks.confirm.mockResolvedValue(false)
    await clickInstall(w)
    expect(mocks.confirm.mock.calls[0]![0].message).toContain('当前的控制器连接会被替换')
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it('stops on invalid input before confirming', async () => {
    const w = await render(unconfigured())
    await clickInstall(w)
    expect(w.get('[data-testid="controller-install-error"]').text()).toContain('请填写有效的 SSH 主机、端口、用户和主机指纹')
    await fillSsh(w)
    await w.get('[data-testid="install-ssh-password"]').setValue('')
    await clickInstall(w)
    expect(w.get('[data-testid="controller-install-error"]').text()).toBe('请填写 SSH 密码或私钥。')
    await w.get('[data-testid="install-ssh-password"]').setValue('ssh-secret')
    await w.get('[data-testid="install-port"]').setValue(70000)
    await clickInstall(w)
    expect(w.get('[data-testid="controller-install-error"]').text()).toContain('端口须在 1–65535 之间')
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it('does not install over unsaved settings of other tabs', async () => {
    const w = await render(unconfigured())
    await w.get('[data-testid="network-pool"]').setValue('172.16.0.0/12')
    expect(w.get('[data-testid="controller-install-blocked"]').text()).toContain('请先保存')
    expect(w.get('[data-testid="controller-install-submit"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it.each([
    [{ reason: 'gateway_unreachable', stage: 'tls' }, ['安装后核心无法访问控制器网关', '失败阶段：TLS 握手 / 证书校验']],
    [{ reason: 'gateway_unreachable', stage: 'http' }, ['失败阶段：HTTP 健康检查']],
    [{ reason: 'port_in_use' }, ['指定的端口已被占用']],
    [{ reason: 'no_free_port' }, ['请手动指定端口']],
    [{ reason: 'invalid_ssh' }, ['SSH 连接信息无效']],
    [{ reason: 'docker_not_installed' }, ['找不到 docker 命令']],
    [{ reason: 'docker_not_running' }, ['Docker 服务未运行']],
    [{ reason: 'acme_ports_unavailable' }, ['80 和 443 端口都已被占用', '改用 IP 地址、改用 HTTP，或在已有的反向代理上为该域名配置转发']],
    [{ reason: 'install_in_progress' }, ['运行环境正在安装，请稍后刷新状态']],
    [{ reason: 'ssh_failed' }, ['无法通过 SSH 连接 Docker 主机']]
  ])('translates the failure %j', async (details, texts) => {
    const w = await render(unconfigured())
    await fillSsh(w)
    mocks.post.mockRejectedValue(reasonError(details))
    await clickInstall(w)
    const text = w.get('[data-testid="controller-install-error"]').text()
    for (const s of texts) expect(text).toContain(s)
    // Nothing changed: still unconfigured, the SSH details stay for a retry.
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('unconfigured')
    expect(input(w, 'install-ssh-password').value).toBe('ssh-secret')
    w.unmount()
  })

  it('recognizes an install that finished after the request was cut off', async () => {
    const w = await render(unconfigured())
    await fillSsh(w)
    mocks.post.mockRejectedValue(new TypeError('Failed to fetch'))
    mocks.config = controller({ host: '198.51.100.4', port: 18443 })
    await clickInstall(w)
    expect(w.get('[data-testid="controller-status"]').attributes('data-state')).toBe('connected')
    expect(w.text()).toContain('配置已指向 https://198.51.100.4:18443')
    w.unmount()
  })

  it('does not take another endpoint for a late success', async () => {
    const w = await render(controller())
    await w.get('[data-testid="controller-install-toggle"]').trigger('click')
    await fillSsh(w)
    mocks.post.mockRejectedValue(new TypeError('Failed to fetch'))
    await clickInstall(w)
    expect(w.get('[data-testid="controller-install-error"]').text()).toBeTruthy()
    expect(input(w, 'controller-endpoint').value).toBe('https://ccg.example.com')
    w.unmount()
  })

  it('probes the SSH host key of the install target', async () => {
    const w = await render(unconfigured())
    await w.get('[data-testid="install-ssh-host"]').setValue('198.51.100.4')
    await w.get('[data-testid="install-ssh-port"]').setValue(2222)
    mocks.post.mockResolvedValue({ fingerprint: SSH_FP })
    await w.get('[data-testid="install-ssh-probe"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/remote-fingerprint', { host: '198.51.100.4', port: 2222 }, expect.anything())
    await w.get('[data-testid="install-use-fingerprint"]').trigger('click')
    expect(input(w, 'install-ssh-fingerprint').value).toBe(SSH_FP)
    w.unmount()
  })
})

describe('connection and install copy', () => {
  const keys = (o: unknown, prefix = ''): string[] => Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort()
  it('has the same keys in zh and en', () => {
    for (const part of ['remote', 'controllerInstall', 'reason'] as const) expect(keys(en[part]), part).toEqual(keys(zh[part]))
    expect(keys(en.accountAuth.setup)).toEqual(['adminKey', 'docker'])
  })
})
