import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RuntimeInstall from './RuntimeInstall.vue'

// Runtime images bundled in the ccgateway plugin package (CONTRACTS §53.10).
const hex = 'a'.repeat(64)
const bundled = {
  version: '0.1.16',
  images: { app: 'ccgateway-app:0.1.16', egress: 'ccgateway-egress:0.1.16', controller: 'ccgateway-controller:0.1.16', gateway: 'caddy:2.11.7-alpine' }
}
const runtime = (over: Record<string, unknown> = {}) => ({
  expected: { app: 'ccgateway-app:0.1.16', egress: `ghcr.io/x/egress@sha256:${hex}`, controller: `ghcr.io/x/controller@sha256:${hex}` },
  installed: { controller_image: `ghcr.io/x/controller@sha256:${hex}`, app_image: 'ccgateway-app:0.1.16', egress_image: `ghcr.io/x/egress@sha256:${hex}`, version: '0.1.9' },
  up_to_date: false,
  bundled,
  ...over
})
const applied = () => runtime({
  expected: { app: bundled.images.app, egress: bundled.images.egress, controller: bundled.images.controller },
  installed: { controller_image: bundled.images.controller, app_image: bundled.images.app, egress_image: bundled.images.egress, version: '0.1.16' },
  up_to_date: true
})
const report = () => ({
  results: [
    { role: 'app', ref: bundled.images.app, status: 'present' },
    { role: 'egress', ref: bundled.images.egress, status: 'loaded' },
    { role: 'controller', ref: bundled.images.controller, status: 'failed', reason: 'controller_unhealthy' }
  ],
  workers: { image: bundled.images.app, results: [{ key: '21', account_id: 21, status: 'updated', previous_sha256: '1'.repeat(64), sha256: '2'.repeat(64) }] },
  runtime: applied()
})
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), manage: true }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post }, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (k: string) => k === 'settings:manage' ? mocks.manage : true }) }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<object>()), confirm: mocks.confirm, toast: mocks.toast }))

async function render(mode = 'controller') {
  const w = mount(RuntimeInstall, { props: { mode, accountRuntimes: true, hasAdminKey: true }, global: { plugins: [i18n] } })
  await flushPromises()
  return w
}
type W = Awaited<ReturnType<typeof render>>
const stateOf = (w: W, role: string) => w.get(`[data-testid="ccgateway-bundled"] tbody tr[data-role="${role}"]`)
const resultOf = (w: W, role: string) => w.get(`[data-testid="ccgateway-bundled-result"] tr[data-role="${role}"]`)

describe('CCGateway images bundled in the plugin package', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
    mocks.get.mockResolvedValue(runtime())
  })

  it('shows the bundled version and whether each role is already on the controller', async () => {
    const w = await render()
    expect(w.get('[data-testid="ccgateway-bundled-title"]').text()).toBe('插件内置镜像（版本 0.1.16）')
    expect(stateOf(w, 'app').attributes('data-state')).toBe('enabled')
    expect(stateOf(w, 'app').text()).toContain('ccgateway-app:0.1.16')
    expect(stateOf(w, 'app').text()).toContain('已启用')
    expect(stateOf(w, 'egress').attributes('data-state')).toBe('notEnabled')
    expect(stateOf(w, 'egress').text()).toContain('未启用')
    expect(stateOf(w, 'controller').attributes('data-state')).toBe('notEnabled')
    expect(stateOf(w, 'gateway').text()).toContain('caddy:2.11.7-alpine')
    expect(stateOf(w, 'gateway').text()).toContain('安装控制器时使用')
    expect(w.get('[data-testid="ccgateway-bundled-push"]').text()).toBe('推送并启用内置镜像')
    // The manual upload stays, folded away as an advanced option.
    const upload = w.get('[data-testid="ccgateway-image-upload"]')
    expect(upload.element.tagName).toBe('DETAILS')
    expect((upload.element as HTMLDetailsElement).open).toBe(false)
    expect(upload.get('summary').text()).toBe('高级：手动上传镜像')
    w.unmount()
  })

  it('says the package has no images when bundled is null', async () => {
    mocks.get.mockResolvedValue(runtime({ bundled: null }))
    const w = await render()
    expect(w.get('[data-testid="ccgateway-bundled-none"]').text()).toContain('插件包未包含镜像')
    expect(w.find('[data-testid="ccgateway-bundled-push"]').exists()).toBe(false)
    expect(w.find('[data-testid="ccgateway-image-upload"]').exists()).toBe(true)
    w.unmount()
  })

  it('shows nothing about bundled images for a core that does not report them, or outside controller mode', async () => {
    const { bundled: _omit, ...old } = runtime()
    mocks.get.mockResolvedValue(old)
    let w = await render()
    expect(w.find('[data-testid="ccgateway-bundled"]').exists()).toBe(false)
    w.unmount()
    mocks.get.mockResolvedValue(runtime())
    w = await render('ssh')
    expect(w.find('[data-testid="ccgateway-bundled"]').exists()).toBe(false)
    w.unmount()
  })

  it('reports the state as unknown when the controller state could not be read', async () => {
    mocks.get.mockResolvedValue(runtime({ installed: null, reason: 'controller_unhealthy' }))
    const w = await render()
    for (const role of ['app', 'egress', 'controller']) expect(stateOf(w, role).attributes('data-state')).toBe('unknown')
    w.unmount()
  })

  it('pushes after confirming, shows each role, the worker results and the refreshed state', async () => {
    mocks.post.mockResolvedValue(report())
    const w = await render()
    await w.get('[data-testid="ccgateway-bundled-push"]').trigger('click')
    await flushPromises()
    const asked = mocks.confirm.mock.calls[0]![0]
    expect(asked.message).toContain('不会重建')
    expect(asked.message).toContain('原地替换')
    expect(asked.message).toContain('自升级')
    expect(asked.message).toContain('短暂中断')
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtime/bundled', {}, { signal: expect.any(AbortSignal) })
    expect(resultOf(w, 'app').text()).toContain('控制器上已有（跳过）')
    expect(resultOf(w, 'egress').text()).toContain('已上传并启用')
    expect(resultOf(w, 'controller').text()).toContain('失败')
    expect(resultOf(w, 'controller').text()).toContain('容器控制器启动后未通过健康检查')
    // The in-place worker update reuses the worker results table.
    const worker = w.get('[data-testid="ccgateway-workers-result"] tr[data-key="21"]')
    expect(worker.text()).toContain('已更新')
    expect(mocks.toast).toHaveBeenCalledWith('部分内置镜像未能启用，请查看结果', 'warning')
    expect(w.emitted('changed')).toHaveLength(1)
    // The returned runtime replaces the table: every role is now in use.
    for (const role of ['app', 'egress', 'controller']) expect(stateOf(w, role).attributes('data-state')).toBe('enabled')
    expect(w.get('[data-testid="ccgateway-bundled-current"]').text()).toBe('控制器已在使用全部内置镜像')
    expect(mocks.get).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('reloads the state when the push returns no runtime, and toasts success when nothing failed', async () => {
    mocks.post.mockResolvedValue({ results: [{ role: 'app', ref: bundled.images.app, status: 'loaded' }] })
    const w = await render()
    await w.get('[data-testid="ccgateway-bundled-push"]').trigger('click')
    await flushPromises()
    expect(mocks.toast).toHaveBeenCalledWith('内置镜像已推送并启用', 'success')
    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(w.find('[data-testid="ccgateway-workers-result"]').exists()).toBe(false)
    w.unmount()
  })

  it('sends nothing when the confirmation is declined', async () => {
    mocks.confirm.mockResolvedValue(false)
    const w = await render()
    await w.get('[data-testid="ccgateway-bundled-push"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
    w.unmount()
  })

  it.each([
    ['install_in_progress', '运行环境正在安装，请稍后刷新状态'],
    ['no_bundled_images', '当前启用的 ccgateway 插件包没有内置镜像']
  ])('shows the translated reason of a refused push (%s)', async (reason, text) => {
    mocks.post.mockRejectedValue(Object.assign(new Error('refused'), { details: { reason } }))
    const w = await render()
    await w.get('[data-testid="ccgateway-bundled-push"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="ccgateway-bundled-error"]').text()).toBe(text)
    expect(w.find('[data-testid="ccgateway-bundled-result"]').exists()).toBe(false)
    w.unmount()
  })

  it('translates the reasons of a failed role', async () => {
    mocks.post.mockResolvedValue({ results: [
      { role: 'app', ref: bundled.images.app, status: 'failed', reason: 'bundle_invalid' },
      { role: 'egress', ref: bundled.images.egress, status: 'failed', reason: 'upload_failed' },
      { role: 'controller', ref: bundled.images.controller, status: 'failed', reason: 'some_new_code' }
    ] })
    const w = await render()
    await w.get('[data-testid="ccgateway-bundled-push"]').trigger('click')
    await flushPromises()
    expect(resultOf(w, 'app').text()).toContain('校验和不符')
    expect(resultOf(w, 'egress').text()).toContain('镜像上传到控制器失败')
    expect(resultOf(w, 'controller').text()).toContain('some_new_code')
    w.unmount()
  })

  it('lists the bundled images to readers but offers no push', async () => {
    mocks.manage = false
    const w = await render()
    expect(w.find('[data-testid="ccgateway-bundled-title"]').exists()).toBe(true)
    expect(w.find('[data-testid="ccgateway-bundled-push"]').exists()).toBe(false)
    w.unmount()
  })

  it('is translated in English', async () => {
    i18n.global.locale.value = 'en'
    mocks.get.mockResolvedValue(runtime({ bundled: null }))
    let w = await render()
    expect(w.get('[data-testid="ccgateway-bundled-none"]').text()).toContain('The plugin package carries no images')
    expect(w.get('[data-testid="ccgateway-image-upload"] summary').text()).toBe('Advanced: upload an image by hand')
    w.unmount()
    mocks.get.mockResolvedValue(runtime())
    w = await render()
    expect(w.get('[data-testid="ccgateway-bundled-title"]').text()).toBe('Images bundled with the plugin (version 0.1.16)')
    expect(w.get('[data-testid="ccgateway-bundled-push"]').text()).toBe('Push and apply the bundled images')
    w.unmount()
  })
})
