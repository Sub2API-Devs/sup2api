import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RuntimeInstall from './RuntimeInstall.vue'

const hex = 'a'.repeat(64)
const runtime = (over: Record<string, unknown> = {}) => ({
  expected: { app: 'ccgateway-worker:0.2.0', egress: `ghcr.io/x/egress@sha256:${hex}`, controller: `ghcr.io/x/controller@sha256:${hex}` },
  installed: { controller_image: `ghcr.io/x/controller@sha256:${hex}`, app_image: 'ccgateway-worker:0.1.0', egress_image: `ghcr.io/x/egress@sha256:${hex}`, version: '0.2.0' },
  up_to_date: false,
  ...over
})
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), transport: null as unknown, manage: true }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post }, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => k === 'settings:manage' ? mocks.manage : true }) }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<object>()), confirm: mocks.confirm, toast: mocks.toast }))
vi.mock('./imageUpload', async original => ({ ...(await original<object>()), createUploadTransport: () => mocks.transport }))

const ID = 'AbCdEfGhIjKlMnOpQrStUv'
function transport() {
  let received = 0
  return {
    create: vi.fn(async (size: number) => ({ upload_id: ID, offset: 0, size })),
    put: vi.fn(async (_id: string, _offset: number, chunk: Blob) => { received += chunk.size; return { offset: received, size: received } }),
    load: vi.fn(async () => ({ sha256: 'f'.repeat(64), images: [], ref: 'ccgateway-worker:0.2.0', runtime: runtime({ up_to_date: true }) })),
    remove: vi.fn(async () => undefined)
  }
}

async function render(mode: string) {
  const w = mount(RuntimeInstall, { props: { mode }, global: { plugins: [i18n] } })
  await flushPromises()
  return w
}
async function choose(w: Awaited<ReturnType<typeof render>>, name: string, size = 10) {
  const input = w.get<HTMLInputElement>('[data-testid="image-upload-file"]')
  const file = new File([new Uint8Array(size)], name)
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

describe('CCGateway runtime card in control panel mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
    mocks.get.mockResolvedValue(runtime())
    mocks.transport = transport()
  })

  it('has no upload outside control panel mode', async () => {
    const w = await render('ssh')
    expect(w.find('[data-testid="ccgateway-image-upload"]').exists()).toBe(false)
    w.unmount()
  })

  it('hides the upload from readers', async () => {
    mocks.manage = false
    const w = await render('controller')
    expect(w.find('[data-testid="ccgateway-image-upload"]').exists()).toBe(false)
    w.unmount()
  })

  it('uploads, loads with the chosen role, shows the reference and checksum and refreshes the state', async () => {
    const w = await render('controller')
    expect(w.text()).toContain('控制面板模式下，镜像经控制面板上传')
    expect(w.findAll('[data-testid="image-upload-role"] option').map(o => o.attributes('value'))).toEqual(['app', 'egress', 'controller'])
    await w.get('[data-testid="image-upload-role"]').setValue('controller')
    await choose(w, 'controller.tar.gz')
    await w.get('[data-testid="image-upload-submit"]').trigger('click')
    await flushPromises()
    const t = mocks.transport as ReturnType<typeof transport>
    expect(mocks.confirm.mock.calls[0]![0].message).toContain('自升级')
    expect(t.create).toHaveBeenCalledWith(10, expect.any(AbortSignal))
    expect(t.load).toHaveBeenCalledWith(ID, 'controller')
    const result = w.get('[data-testid="image-upload-result"]').text()
    expect(result).toContain('ccgateway-worker:0.2.0')
    expect(result).toContain('f'.repeat(64))
    expect(w.emitted('changed')).toHaveLength(1)
    expect(w.get('[data-testid="ccgateway-runtime-state"]').attributes('data-state')).toBe('upToDate')
    w.unmount()
  })

  it('refuses other file types before uploading', async () => {
    const w = await render('controller')
    await choose(w, 'image.zip')
    expect(w.text()).toContain('请选择 .tar、.tar.gz 或 .tgz 文件')
    expect(w.get('[data-testid="image-upload-submit"]').attributes('disabled')).toBeDefined()
    expect((mocks.transport as ReturnType<typeof transport>).create).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows the translated reason of a failed load', async () => {
    const t = mocks.transport as ReturnType<typeof transport>
    t.load.mockRejectedValue(Object.assign(new Error('load failed'), { details: { reason: 'load_failed' } }))
    const w = await render('controller')
    await choose(w, 'worker.tar')
    await w.get('[data-testid="image-upload-submit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="image-upload-error"]').text()).toContain('docker save')
    expect(w.emitted('changed')).toBeUndefined()
    w.unmount()
  })

  it('cancels an upload in progress and deletes it', async () => {
    const t = mocks.transport as ReturnType<typeof transport>
    let release: () => void = () => undefined
    t.put.mockImplementationOnce((_id: string, _offset: number, chunk: Blob, signal?: AbortSignal) => new Promise((resolve, reject) => {
      release = () => resolve({ offset: chunk.size, size: chunk.size })
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const w = await render('controller')
    await choose(w, 'worker.tar')
    await w.get('[data-testid="image-upload-submit"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="image-upload-progress"]').text()).toContain('0%')
    await w.get('[data-testid="image-upload-cancel"]').trigger('click')
    await flushPromises()
    release()
    expect(t.remove).toHaveBeenCalledWith(ID)
    expect(t.load).not.toHaveBeenCalled()
    expect(w.get('[data-testid="image-upload-error"]').text()).toBe('已取消上传')
    w.unmount()
  })

  it('upgrades through the control panel with its own confirmation', async () => {
    mocks.post.mockResolvedValue(runtime({ up_to_date: true }))
    const w = await render('controller')
    await w.get('[data-testid="ccgateway-runtime-install"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm.mock.calls[0]![0].message).toContain('经控制面板')
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtime/install', {}, expect.anything())
    w.unmount()
  })

  it('translates the control panel reasons of the runtime state', async () => {
    mocks.get.mockResolvedValue(runtime({ installed: null, reason: 'controller_not_configured' }))
    const w = await render('controller')
    expect(w.text()).toContain('尚未连接控制器')
    w.unmount()
  })
})
