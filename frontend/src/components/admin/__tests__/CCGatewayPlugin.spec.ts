import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CCGatewayPlugin from '../CCGatewayPlugin.vue'

const { get, post, stepUpRun } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), stepUpRun: vi.fn((action: () => Promise<unknown>) => action())
}))
vi.mock('@/api/client', () => ({ apiClient: { get, post } }))
vi.mock('@/composables/useStepUp', () => ({ useStepUp: () => ({ run: stepUpRun }), isStepUpCancelled: () => false }))
vi.mock('@/components/auth/TotpStepUpDialog.vue', () => ({ default: { template: '<div />' } }))
const render = () => mount(CCGatewayPlugin, { global: { stubs: { RouterLink: true } } })

describe('CCGateway 授权', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: { healthy: true, logged_in: false } })
  })
  it('仅通过二次验证发起授权并拒绝非官方链接', async () => {
    post.mockResolvedValue({ data: { session_id: 'one', url: 'https://evil.example/auth', expires_at: new Date(Date.now() + 600000).toISOString() } })
    const wrapper = render(); await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === '获取授权链接')!.trigger('click'); await flushPromises()
    expect(stepUpRun).toHaveBeenCalledTimes(1)
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('授权链接无效')
  })
  it('回填绑定当前会话并在完成后清空授权码', async () => {
    post.mockResolvedValueOnce({ data: { session_id: 'one', url: 'https://claude.com/auth', expires_at: new Date(Date.now() + 600000).toISOString() } })
      .mockResolvedValueOnce({ data: { success: true } })
    const wrapper = render(); await flushPromises()
    await wrapper.findAll('button').find(b => b.text() === '获取授权链接')!.trigger('click'); await flushPromises()
    await wrapper.get('input[type="password"]').setValue('code#state')
    get.mockResolvedValue({ data: { healthy: true, logged_in: true, auth_method: 'claude.ai' } })
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(post).toHaveBeenLastCalledWith('/admin/plugins/builtin/ccgateway/auth/complete', { session_id: 'one', code: 'code#state' }, { timeout: 55000 })
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('接入账号调度')
  })
})
