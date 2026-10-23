import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CLISettings from './CLISettings.vue'

/** Toggles a switch: SSwitch is a checkbox (jsdom only activates connected ones on click), stubs are buttons. */
const flip = (el: Omit<DOMWrapper<Element>, 'exists'>) => (el.element instanceof HTMLInputElement ? el.setValue(!el.element.checked) : el.trigger('click'))

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), manage: true }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...await importOriginal<typeof import('@sub2api/host')>(), api: mocks }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => mocks.manage }) }))

const state = () => ({ catalog: { installed_version: '2.1.304', state: 'ready', checked_at: '', synced_at: '' }, auto_update: false, auto_update_mode: 'managed', channel: 'stable', latest_version: '', updating: false, update_state: 'idle', update_error: '' })

async function render() {
  const wrapper = mount(CLISettings, { props: { accountId: 22 }, global: { plugins: [i18n], stubs: { Teleport: true } } })
  await wrapper.get('[data-testid="cli-settings-22"]').trigger('click')
  await flushPromises()
  return wrapper
}

describe('CC CLI update controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.get.mockResolvedValue(state())
    mocks.post.mockResolvedValue({ ...state(), latest_version: '2.1.297' })
    mocks.put.mockResolvedValue({ ...state(), auto_update: true })
    i18n.global.locale.value = 'zh'
  })
  it('looking up the channel never requests installation', async () => {
    const wrapper = await render()
    expect(wrapper.findAll('button').some(button => button.text() === '手动更新 CC')).toBe(false)
    const check = wrapper.findAll('button').find(button => button.text() === '查看渠道版本')!
    await check.trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/cli/22', { action: 'check' }, expect.anything())
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('2.1.297')
    wrapper.unmount()
  })
  it('a pinned CLI keeps the channel lookup off', async () => {
    mocks.get.mockResolvedValue({ ...state(), pinned_version: '2.1.304' })
    const wrapper = await render()
    expect(wrapper.text()).toContain('2.1.304')
    expect(wrapper.get('[data-testid="cli-auto-update"] [role="switch"], [role="switch"][data-testid="cli-auto-update"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('a failed recheck shows why', async () => {
    mocks.post.mockResolvedValue({ ...state(), catalog: { ...state().catalog, state: 'failed', error: 'Claude Code changed from 2.1.304 to 2.1.305; reconcile the runtime' }, update_state: 'failed' })
    const wrapper = await render()
    await wrapper.findAll('button').find(button => button.text() === '重新检查本机 CC')!.trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/cli/22', { action: 'sync' }, expect.anything())
    expect(wrapper.text()).toContain('检查未通过')
    expect(wrapper.text()).toContain('2.1.305')
    wrapper.unmount()
  })
  it('keeps the original auto-update state when saving fails', async () => {
    mocks.put.mockRejectedValue(new Error('unreachable'))
    const wrapper = await render()
    const toggle = wrapper.get('[data-testid="cli-auto-update"] [role="switch"], [role="switch"][data-testid="cli-auto-update"]')
    await flip(toggle)
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/cli/22', { auto_update: true, channel: 'stable' }, expect.anything())
    expect(toggle.attributes('aria-checked')).toBe('false')
    wrapper.unmount()
  })
  it('read-only users cannot change update policy or start operations', async () => {
    mocks.manage = false
    const wrapper = await render()
    expect(wrapper.get('[data-testid="cli-auto-update"] [role="switch"], [role="switch"][data-testid="cli-auto-update"]').attributes('disabled')).toBeDefined()
    for (const title of ['查看渠道版本', '重新检查本机 CC']) {
      expect(wrapper.findAll('button').find(button => button.text() === title)!.attributes('disabled')).toBeDefined()
    }
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.put).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
