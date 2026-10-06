import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AccountRuntimes from './AccountRuntimes.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), list: vi.fn(), manage: true }))
vi.mock('@sub2api/host', () => ({ api: mocks }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => key === 'settings:manage' ? mocks.manage : key === 'account:read', me: { id: 1 } }) }))

describe('account runtime debug log switches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }] })
    mocks.get.mockImplementation(async (path: string) => path.endsWith('/status') ? { status: 'ready', container: 'cc-25' } : path.endsWith('/health') ? { logged_in: true } : { enabled: true })
    mocks.put.mockResolvedValue({ enabled: false })
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(AccountRuntimes, { global: { plugins: [i18n], stubs: { RouterLink: true } } })
    await flushPromises()
    return wrapper
  }
  it('loads runtime state and disables logging using PUT without optimistic success', async () => {
    const w = await render()
    const toggle = w.get('[data-testid="request-logs-25"] button')
    expect(toggle.attributes('aria-checked')).toBe('true')
    await toggle.trigger('click')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { enabled: false })
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(w.text()).toContain('删除该账号的全部请求调试日志')
    w.unmount()
  })
  it('keeps the original state and shows an error when disabling fails', async () => {
    mocks.put.mockRejectedValue(new Error('unreachable'))
    const w = await render()
    const toggle = w.get('[data-testid="request-logs-25"] button')
    await toggle.trigger('click')
    await flushPromises()
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(w.text()).toContain('读取或更新日志开关失败')
    w.unmount()
  })
  it('allows readers to inspect the switch but not change it', async () => {
    mocks.manage = false
    const w = await render()
    expect(w.get('[data-testid="request-logs-25"] button').attributes('disabled')).toBeDefined()
    expect(mocks.put).not.toHaveBeenCalled()
    w.unmount()
  })
})
