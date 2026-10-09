import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RuntimeInstall from './RuntimeInstall.vue'

// In-place worker update of existing account containers (CONTRACTS §53.7).
const hex = 'a'.repeat(64)
const runtime = () => ({
  expected: { app: 'ccgateway-worker:0.2.0', egress: `ghcr.io/x/egress@sha256:${hex}`, controller: `ghcr.io/x/controller@sha256:${hex}` },
  installed: { controller_image: `ghcr.io/x/controller@sha256:${hex}`, app_image: 'ccgateway-worker:0.2.0', egress_image: `ghcr.io/x/egress@sha256:${hex}`, version: '0.2.0' },
  up_to_date: true
})
const report = () => ({
  image: 'ccgateway-worker:0.2.0',
  results: [
    { key: '21', account_id: 21, status: 'updated', previous_sha256: '1'.repeat(64), sha256: '2'.repeat(64) },
    { key: '22', account_id: 22, status: 'unchanged', sha256: '2'.repeat(64) },
    { key: '23', account_id: 23, status: 'busy' },
    { key: '24', account_id: 24, status: 'not_running' },
    { key: '25', account_id: 25, status: 'rolled_back', reason: 'unhealthy' },
    { key: '26', account_id: 26, status: 'failed', reason: 'unsupported_container' },
    { key: 'd0123456789abcdef', status: 'failed', reason: 'some_new_code' }
  ]
})
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), transport: null as unknown, manage: true }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post }, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => k === 'settings:manage' ? mocks.manage : true }) }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<object>()), confirm: mocks.confirm, toast: mocks.toast }))
vi.mock('./imageUpload', async original => ({ ...(await original<object>()), createUploadTransport: () => mocks.transport }))

const ID = 'AbCdEfGhIjKlMnOpQrStUv'
function transport(workers?: unknown) {
  let received = 0
  return {
    create: vi.fn(async (size: number) => ({ upload_id: ID, offset: 0, size })),
    put: vi.fn(async (_id: string, _offset: number, chunk: Blob) => { received += chunk.size; return { offset: received, size: received } }),
    load: vi.fn(async () => ({ sha256: 'f'.repeat(64), images: [], ref: 'ccgateway-worker:0.2.0', runtime: runtime(), ...(workers ? { workers } : {}) })),
    remove: vi.fn(async () => undefined)
  }
}

async function render(props: Record<string, unknown>) {
  const w = mount(RuntimeInstall, { props, global: { plugins: [i18n] } })
  await flushPromises()
  return w
}
const configured = (mode: string) => ({ mode, accountRuntimes: true, hasAdminKey: true })
const rows = (w: Awaited<ReturnType<typeof render>>) => w.findAll('[data-testid="ccgateway-workers-result"] tbody tr')
const row = (w: Awaited<ReturnType<typeof render>>, key: string) => w.get(`[data-testid="ccgateway-workers-result"] tr[data-key="${key}"]`)

describe('CCGateway worker update in place', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
    mocks.get.mockResolvedValue(runtime())
    mocks.transport = transport(report())
  })

  it('shows the per-account results of an applied app upload', async () => {
    const w = await render(configured('controller'))
    expect(w.get('[data-testid="image-upload-app-hint"]').text()).toBe('上传后新账号使用新镜像，现有账号原地更新 worker 程序（不重建容器）。')
    const input = w.get<HTMLInputElement>('[data-testid="image-upload-file"]')
    Object.defineProperty(input.element, 'files', { value: [new File([new Uint8Array(10)], 'worker.tar')], configurable: true })
    await input.trigger('change')
    await w.get('[data-testid="image-upload-submit"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm.mock.calls[0]![0].message).toContain('不重建容器')
    expect(rows(w)).toHaveLength(7)
    const updated = row(w, '21')
    expect(updated.text()).toContain('#21')
    expect(updated.text()).toContain('已更新')
    expect(updated.text()).toContain('1'.repeat(12))
    expect(updated.text()).toContain('2'.repeat(12))
    expect(updated.text()).not.toContain('1'.repeat(13))
    expect(row(w, '22').text()).toContain('无需更新')
    expect(row(w, '23').text()).toContain('正在处理请求（稍后重试）')
    expect(row(w, '24').text()).toContain('容器未运行')
    expect(row(w, '25').text()).toContain('已回滚')
    expect(row(w, '25').text()).toContain('健康检查未通过')
    expect(row(w, '26').text()).toContain('失败')
    expect(row(w, '26').text()).toContain('启动命令无法识别')
    const draft = row(w, 'd0123456789abcdef').text()
    expect(draft).toContain('未保存的草稿')
    expect(draft).toContain('d0123456789abcdef')
    expect(draft).toContain('some_new_code')
    expect(w.get('[data-testid="ccgateway-workers-summary"]').text()).toBe('共 7 个：已更新 1，无需更新 1，其他 5')
    w.unmount()
  })

  it('says why no worker was updated when the runtimes could not be listed', async () => {
    mocks.transport = transport({ image: 'ccgateway-worker:0.2.0', results: [], reason: 'controller_unhealthy' })
    const w = await render(configured('controller'))
    const input = w.get<HTMLInputElement>('[data-testid="image-upload-file"]')
    Object.defineProperty(input.element, 'files', { value: [new File([new Uint8Array(10)], 'worker.tar')], configurable: true })
    await input.trigger('change')
    await w.get('[data-testid="image-upload-submit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="ccgateway-workers-list-failed"]').text()).toContain('控制器不健康')
    expect(rows(w)).toHaveLength(0)
    w.unmount()
  })

  it.each(['ssh', 'controller'])('updates the workers of existing accounts on request (%s)', async mode => {
    mocks.post.mockResolvedValue(report())
    const w = await render(configured(mode))
    await w.get('[data-testid="ccgateway-workers-update"]').trigger('click')
    await flushPromises()
    const asked = mocks.confirm.mock.calls[0]![0]
    expect(asked.message).toContain('不重建容器')
    expect(asked.message).toContain('不影响登录状态')
    expect(asked.message).toContain('2 分钟')
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtime/workers', {}, { signal: expect.any(AbortSignal) })
    expect(rows(w)).toHaveLength(7)
    expect(mocks.toast).toHaveBeenCalledWith('worker 更新已完成，请查看各账号结果', 'success')
    w.unmount()
  })

  it('sends nothing when the confirmation is declined', async () => {
    mocks.confirm.mockResolvedValue(false)
    const w = await render(configured('ssh'))
    await w.get('[data-testid="ccgateway-workers-update"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows the translated reason of a refused update', async () => {
    mocks.post.mockRejectedValue(Object.assign(new Error('conflict'), { details: { reason: 'install_in_progress' } }))
    const w = await render(configured('ssh'))
    await w.get('[data-testid="ccgateway-workers-update"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="ccgateway-workers-error"]').text()).toBe('运行环境正在安装，请稍后刷新状态')
    expect(w.find('[data-testid="ccgateway-workers-result"]').exists()).toBe(false)
    w.unmount()
  })

  it('offers the update only with settings:manage and a configured Docker connection', async () => {
    for (const props of [
      { mode: 'ssh', accountRuntimes: false, hasAdminKey: true },
      { mode: 'disabled', accountRuntimes: true, hasAdminKey: true },
      { mode: 'controller', accountRuntimes: true, hasAdminKey: false }
    ]) {
      const w = await render(props)
      expect(w.find('[data-testid="ccgateway-workers-update"]').exists()).toBe(false)
      w.unmount()
    }
    mocks.manage = false
    const w = await render(configured('ssh'))
    expect(w.find('[data-testid="ccgateway-workers-update"]').exists()).toBe(false)
    w.unmount()
  })
})
