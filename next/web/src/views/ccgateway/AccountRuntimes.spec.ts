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

describe('account runtime list layout', () => {
  const limits = { enabled: false, retention_hours: 24, per_request_limit_bytes: 64 * 1048576, storage_budget_bytes: 512 * 1048576, overflow_behavior: 'retain_partial_with_metadata' }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }] })
    i18n.global.locale.value = 'zh'
  })
  function health(value: Record<string, unknown>) {
    mocks.get.mockImplementation(async (path: string) => path.endsWith('/status') ? { status: 'ready', container: 'cc-25' } : path.endsWith('/health') ? value : limits)
  }
  async function render() {
    const wrapper = mount(AccountRuntimes, { attachTo: document.body, global: { plugins: [i18n], stubs: { RouterLink: true } } })
    await flushPromises()
    return wrapper
  }

  it('shows the Claude Code version each container reports', async () => {
    health({ logged_in: true, cli_version: '2.1.292' })
    const w = await render()
    expect(w.get('thead').text()).toContain('CC 版本')
    expect(w.get('[data-testid="cli-version-25"]').text()).toBe('2.1.292')
    w.unmount()
  })

  it('shows a dash when the version is unknown or not a version', async () => {
    for (const value of [{ logged_in: true }, { logged_in: true, cli_version: '<b>2.1</b>' }, { logged_in: true, cli_version: 7 }]) {
      health(value)
      const w = await render()
      expect(w.get('[data-testid="cli-version-25"]').text()).toBe('—')
      w.unmount()
    }
  })

  it('reads the version of API key accounts without failing the row', async () => {
    mocks.list.mockResolvedValue({ items: [{ id: 26, name: 'cc-key', type: 'apikey', created_by: 1 }, { id: 27, name: 'cc-old', type: 'apikey', created_by: 1 }] })
    mocks.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/status')) return { status: 'ready', container: 'cc' }
      if (path.endsWith('/26/health')) return { logged_in: false, cli_version: '2.1.288' }
      if (path.endsWith('/27/health')) throw new Error('older worker')
      return limits
    })
    const w = await render()
    expect(w.get('[data-testid="cli-version-26"]').text()).toBe('2.1.288')
    expect(w.get('[data-testid="cli-version-27"]').text()).toBe('—')
    expect(w.text()).not.toContain('不可用')
    expect(w.text()).toContain('无需授权')
    w.unmount()
  })

  it('keeps the log switch on one line and shows the limits on hover or focus', async () => {
    health({ logged_in: true })
    const w = await render()
    const cell = w.get('[data-testid="request-log-cell-25"]')
    const description = w.get('[data-testid="request-log-limits-25"]')
    // The limits are no longer a paragraph under the switch: only a description for assistive technology.
    expect(cell.find('p').exists()).toBe(false)
    expect(description.classes()).toContain('sr-only')
    expect(description.text()).toContain('保留 24 小时；单请求内容 64 MiB；总存储软预算 512 MiB')
    expect(description.text()).toContain('超限保留已有内容并标记截断，不中断请求')
    const id = description.attributes('id')
    expect(w.get('[data-testid="request-logs-25"] button').attributes('aria-describedby')).toBe(id)
    expect(w.get('[data-testid="request-log-info-25"]').attributes('aria-describedby')).toBe(id)
    expect(w.get('[data-testid="request-log-info-25"]').attributes('aria-label')).toBe('日志保留与限额说明')

    const tooltip = () => document.body.querySelector('[data-testid="request-log-tooltip"]')
    expect(tooltip()).toBeNull()
    await cell.trigger('mouseenter')
    expect(tooltip()?.textContent).toBe(description.text())
    await cell.trigger('mouseleave')
    expect(tooltip()).toBeNull()
    await w.get('[data-testid="request-log-info-25"]').trigger('focusin')
    expect(tooltip()?.textContent).toContain('512 MiB')
    await cell.trigger('keydown', { key: 'Escape' })
    expect(tooltip()).toBeNull()
    await w.get('[data-testid="request-logs-25"] button').trigger('focusin')
    expect(tooltip()).not.toBeNull()
    await w.get('[data-testid="request-logs-25"] button').trigger('focusout')
    expect(tooltip()).toBeNull()
    w.unmount()
  })
})
