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
  it('does not invent limits or partial-retention guarantees for legacy Workers', async () => {
    const w = await render()
    const limits = w.get('[data-testid="request-log-limits-25"]').text()
    expect(limits).toContain('未报告完整日志限额')
    expect(limits).toContain('超限处理尚未报告')
    expect(limits).not.toContain('64 MiB')
    expect(limits).not.toContain('保留已有内容')
    w.unmount()
  })
  it('shows each Worker reported limit instead of fixed defaults', async () => {
    mocks.get.mockImplementation(async (path: string) => path.endsWith('/status') ? { status: 'ready' } : path.endsWith('/health') ? { logged_in: true } : {
      enabled: true, retention_hours: 12, per_request_limit_bytes: 32 * 1048576,
      storage_budget_bytes: 128 * 1048576, overflow_behavior: 'retain_partial_with_metadata',
    })
    const w = await render()
    const limits = w.get('[data-testid="request-log-limits-25"]').text()
    expect(limits).toContain('12 小时')
    expect(limits).toContain('32 MiB')
    expect(limits).toContain('128 MiB')
    expect(limits).toContain('保留已有内容')
    expect(limits).not.toContain('64 MiB')
    w.unmount()
  })
})
