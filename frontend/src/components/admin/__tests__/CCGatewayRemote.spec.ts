import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CCGatewayRemote from '../CCGatewayRemote.vue'

const { get, post, put, stepUpRun } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), stepUpRun: vi.fn((action: () => Promise<unknown>) => action()) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/api/client', () => ({ apiClient: { get, post, put } }))
vi.mock('@/composables/useStepUp', () => ({ useStepUp: () => ({ run: stepUpRun }), isStepUpCancelled: () => false }))
vi.mock('@/components/auth/TotpStepUpDialog.vue', () => ({ default: { template: '<div />' } }))
const config = { mode: 'ssh', host: 'docker.example', port: 22, user: 'operator', auth_mode: 'password', host_key_fingerprint: 'SHA256:old', has_password: true, has_private_key: true, has_passphrase: true }
const render = async () => { const wrapper = mount(CCGatewayRemote); await flushPromises(); return wrapper }
describe('CCGateway remote management', () => {
  beforeEach(() => { vi.clearAllMocks(); get.mockResolvedValue({ data: { ...config } }); put.mockResolvedValue({ data: { ...config } }); post.mockResolvedValue({ data: { output: 'docker status: running' } }) })
  it('omits blank credentials when saving and uses step-up', async () => {
    const wrapper = await render()
    expect(wrapper.get<HTMLInputElement>('[data-testid="remote-password"]').element.value).toBe('')
    await wrapper.get('[data-testid="remote-fingerprint"]').setValue('SHA256:new')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(stepUpRun).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/remote', { mode:'ssh',host:'docker.example',port:22,user:'operator',auth_mode:'password',host_key_fingerprint:'SHA256:new' }, { timeout:55000 })
    expect(wrapper.text()).not.toContain('undefined')
  })
  it('requires fresh credentials after changing the target and blocks unsaved actions', async () => {
    const wrapper = await render()
    await wrapper.get('[data-testid="remote-host"]').setValue('another.example')
    expect(wrapper.get('[data-testid="remote-test"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(put).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('admin.plugins.ccRemote.newCredentials')
  })
  it('never automatically trusts a probed fingerprint', async () => {
    post.mockResolvedValue({ data: { fingerprint:'SHA256:discovered' } })
    const wrapper = await render()
    await wrapper.get('[data-testid="remote-probe"]').trigger('click'); await flushPromises()
    expect(post).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/remote/fingerprint',{host:'docker.example',port:22},{timeout:55000})
    expect(wrapper.get<HTMLInputElement>('[data-testid="remote-fingerprint"]').element.value).toBe('SHA256:old')
    expect(put).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="use-fingerprint"]').trigger('click')
    expect(wrapper.get<HTMLInputElement>('[data-testid="remote-fingerprint"]').element.value).toBe('SHA256:discovered')
  })
  it('confirms stop before invoking the saved remote action under step-up', async () => {
    const wrapper = await render()
    await wrapper.get('[data-testid="remote-stop"]').trigger('click')
    expect(post).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="remote-confirm"]').trigger('click'); await flushPromises()
    expect(stepUpRun).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/remote/action',{action:'stop'},{timeout:55000})
    expect(wrapper.get('[data-testid="remote-output"]').text()).toBe('docker status: running')
  })
  it('uses step-up for testing and shows output as text', async () => {
    post.mockResolvedValue({data:{output:'<script>not markup</script>'}})
    const wrapper = await render()
    await wrapper.get('[data-testid="remote-test"]').trigger('click'); await flushPromises()
    expect(stepUpRun).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/admin/plugins/builtin/ccgateway/remote/test',{}, {timeout:55000})
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('[data-testid="remote-output"]').text()).toContain('<script>')
  })
  it('disables remote operations in local mode and never reveals saved private keys', async () => {
    get.mockResolvedValue({data:{...config,mode:'local',auth_mode:'private_key'}})
    const wrapper = await render()
    expect(wrapper.get('[data-testid="remote-status"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="remote-mode"]').setValue('ssh')
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="remote-private-key"]').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('[data-testid="remote-passphrase"]').element.value).toBe('')
  })
})
