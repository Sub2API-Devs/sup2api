import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AccountRuntimes from './AccountRuntimes.vue'

/** Toggles a switch: SSwitch is a checkbox (jsdom only activates connected ones on click), stubs are buttons. */
const flip = (el: Omit<DOMWrapper<Element>, 'exists'>) => (el.element instanceof HTMLInputElement ? el.setValue(!el.element.checked) : el.trigger('click'))

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), list: vi.fn(), confirm: vi.fn(), manage: true }))
vi.mock('@sub2api/host', () => ({ api: mocks }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<object>(), confirm: (...a: unknown[]) => mocks.confirm(...a), toast: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => key === 'settings:manage' ? mocks.manage : key === 'account:read', me: { id: 1 } }) }))

describe('account runtime debug log switches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
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
    const toggle = w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    await flip(toggle)
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { enabled: false })
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(w.text()).toContain('删除该账号的全部请求调试日志')
    w.unmount()
  })
  it('keeps the original state and shows an error when disabling fails', async () => {
    mocks.put.mockRejectedValue(new Error('unreachable'))
    const w = await render()
    const toggle = w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]')
    await flip(toggle)
    await flushPromises()
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(w.text()).toContain('读取或更新日志开关失败')
    w.unmount()
  })
  it('allows readers to inspect the switch but not change it', async () => {
    mocks.manage = false
    const w = await render()
    expect(w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]').attributes('disabled')).toBeDefined()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.find('[data-testid="ccgateway-cleanup"]').exists()).toBe(false)
    w.unmount()
  })
  it('starts authoritative cleanup without sending the paginated account rows', async () => {
    mocks.post.mockResolvedValue({ deleted: 2, failed: 0 })
    const w = await render()
    await w.get('[data-testid="ccgateway-cleanup"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/system/ccgateway/runtime/cleanup', {}, expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
    expect(w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]').attributes('aria-describedby')).toBe(id)
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
    await w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]').trigger('focusin')
    expect(tooltip()).not.toBeNull()
    await w.get('[data-testid="request-logs-25"] [role="switch"], [role="switch"][data-testid="request-logs-25"]').trigger('focusout')
    expect(tooltip()).toBeNull()
    w.unmount()
  })
})

describe('account runtime debug log levels', () => {
  const MIB = 1048576
  const leveled = (over: Record<string, unknown> = {}) => ({
    enabled: true, level: 'summary', full_until: null, levels: ['off', 'summary', 'full'],
    limits: {
      summary: { retention_hours: 168, storage_budget_bytes: 128 * MIB, per_request_limit_bytes: 262144 },
      full: { retention_hours: 24, storage_budget_bytes: 512 * MIB, per_request_limit_bytes: 64 * MIB },
    },
    usage: { summary_bytes: 2 * MIB, full_bytes: 0, requests: 3 },
    per_request_limit_bytes: 64 * MIB, retention_hours: 24, storage_budget_bytes: 512 * MIB, overflow_behavior: 'retain_partial_with_metadata',
    ...over,
  })
  function worker(state: Record<string, unknown>) {
    mocks.get.mockImplementation(async (path: string) => path.endsWith('/status') ? { status: 'ready', container: 'cc-25' } : path.endsWith('/health') ? { logged_in: true } : state)
  }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }] })
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(AccountRuntimes, { attachTo: document.body, global: { plugins: [i18n], stubs: { RouterLink: true } } })
    await flushPromises()
    return wrapper
  }
  const radio = (w: Awaited<ReturnType<typeof render>>, level: string) => w.get<HTMLInputElement>(`[data-testid="request-log-level-25"] input[value="${level}"]`)
  const dialog = () => document.body.querySelector('[data-testid="request-log-full-dialog"]')
  const click = async (testid: string) => {
    ;(document.body.querySelector(`[data-testid="${testid}"]`) as HTMLElement).click()
    await flushPromises()
  }

  it('shows the three levels instead of the switch, with both tiers in the details', async () => {
    worker(leveled())
    const w = await render()
    expect(w.find('[role="switch"]').exists()).toBe(false)
    expect(w.get('[data-testid="request-log-level-25"]').text().replace(/\s+/g, '')).toBe('关闭摘要完整')
    expect(radio(w, 'summary').element.checked).toBe(true)
    const details = w.get('[data-testid="request-log-limits-25"]').text()
    expect(details).toContain('摘要：保留 7 天；单请求 0.25 MiB；总预算 128 MiB。当前占用 2 MiB。')
    expect(details).toContain('完整：保留 24 小时；单请求 64 MiB；总预算 512 MiB。当前占用 0 MiB。')
    expect(details).toContain('共 3 个请求')
    expect(details).toContain('256 个字符')
    expect(w.get('[data-testid="request-log-level-25"]').attributes('aria-describedby')).toBe('request-log-limits-25')
    expect(w.find('[data-testid="request-log-full-25"]').exists()).toBe(false)
    expect(w.find('[data-testid="request-log-clear-full-25"]').exists()).toBe(false)
    expect(w.text()).toContain('摘要：只记元数据')
    w.unmount()
  })

  it('asks for a duration before turning the full level on', async () => {
    worker(leveled())
    mocks.put.mockResolvedValue(leveled({ level: 'full', full_until: new Date(Date.now() + 4 * 3600000).toISOString(), usage: { summary_bytes: 1, full_bytes: 0, requests: 3 } }))
    const w = await render()
    await radio(w, 'full').setValue(true)
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(dialog()?.textContent).toContain('完整级别会保存请求和响应正文（用户对话），到期自动回到摘要')
    expect(dialog()?.textContent?.replace(/\s+/g, '')).toContain('1小时4小时24小时')
    // The row keeps its level while the dialog is open.
    expect(radio(w, 'summary').element.checked).toBe(true)
    ;(document.body.querySelector('[data-testid="request-log-full-hours"] input[value="4"]') as HTMLInputElement).click()
    await flushPromises()
    await click('request-log-full-confirm')
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'full', full_for_hours: 4 })
    expect(dialog()).toBeNull()
    expect(radio(w, 'full').element.checked).toBe(true)
    expect(w.get('[data-testid="request-log-full-25"]').text()).toMatch(/^完整：剩余 (3 小时 59|4 小时 0) 分（到期回到摘要）$/)
    w.unmount()
  })

  it('sends nothing when the full dialog is cancelled', async () => {
    worker(leveled())
    const w = await render()
    await radio(w, 'full').setValue(true)
    await flushPromises()
    await click('request-log-full-cancel')
    expect(dialog()).toBeNull()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(radio(w, 'summary').element.checked).toBe(true)
    expect(radio(w, 'full').element.checked).toBe(false)
    w.unmount()
  })

  it('counts down the full level from full_until', async () => {
    for (const [ms, text] of [
      [(3 * 60 + 12) * 60000 - 5000, '完整：剩余 3 小时 12 分（到期回到摘要）'],
      [25 * 60000 - 5000, '完整：剩余 25 分（到期回到摘要）'],
      [-60000, '完整：已到期，下一个请求开始时回到摘要'],
    ] as const) {
      worker(leveled({ level: 'full', full_until: new Date(Date.now() + ms).toISOString() }))
      const w = await render()
      expect(w.get('[data-testid="request-log-full-25"]').text()).toBe(text)
      w.unmount()
    }
  })

  it('deletes the full content with clear_full after confirmation', async () => {
    worker(leveled({ usage: { summary_bytes: MIB, full_bytes: 3 * MIB, requests: 9 } }))
    mocks.put.mockResolvedValue(leveled({ usage: { summary_bytes: MIB, full_bytes: 0, requests: 9 } }))
    mocks.confirm.mockResolvedValueOnce(false)
    const w = await render()
    expect(w.find('[data-testid="request-log-full-25"]').exists()).toBe(false)
    await w.get('[data-testid="request-log-clear-full-25"]').trigger('click')
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    await w.get('[data-testid="request-log-clear-full-25"]').trigger('click')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { clear_full: true })
    expect(w.find('[data-testid="request-log-clear-full-25"]').exists()).toBe(false)
    w.unmount()
  })

  it('confirms before turning logs off, then sends the level', async () => {
    worker(leveled())
    mocks.put.mockResolvedValue(leveled({ enabled: false, level: 'off', usage: { summary_bytes: 0, full_bytes: 0, requests: 0 } }))
    mocks.confirm.mockResolvedValueOnce(false)
    const w = await render()
    await radio(w, 'off').setValue(true)
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(radio(w, 'summary').element.checked).toBe(true)
    await radio(w, 'off').setValue(true)
    await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }))
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'off' })
    expect(radio(w, 'off').element.checked).toBe(true)
    w.unmount()
  })

  it('sends summary without a confirmation and keeps the level on failure', async () => {
    worker(leveled({ level: 'full', full_until: new Date(Date.now() + 3600000).toISOString() }))
    mocks.put.mockRejectedValue(new Error('unreachable'))
    const w = await render()
    await radio(w, 'summary').setValue(true)
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'summary' })
    expect(radio(w, 'full').element.checked).toBe(true)
    expect(w.text()).toContain('读取或更新日志开关失败')
    w.unmount()
  })

  it('lets readers see the level but not change it or delete content', async () => {
    mocks.manage = false
    worker(leveled({ usage: { summary_bytes: 1, full_bytes: 5, requests: 1 } }))
    const w = await render()
    expect(radio(w, 'full').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="request-log-clear-full-25"]').exists()).toBe(false)
    w.unmount()
  })

  it('rejects a malformed level state instead of guessing', async () => {
    for (const bad of [
      leveled({ level: 'debug' }),
      leveled({ level: 'full', full_until: null }),
      leveled({ level: 'full', full_until: 'soon' }),
      leveled({ levels: ['off', 'summary'], level: 'full', full_until: new Date().toISOString() }),
      leveled({ levels: [] }),
    ]) {
      worker(bad)
      const w = await render()
      expect(w.find('[data-testid="request-log-level-25"]').exists()).toBe(false)
      expect(w.text()).toContain('读取或更新日志开关失败')
      w.unmount()
    }
  })
})

describe('account request log settings of the core', () => {
  const MIB = 1048576
  const workerState = (over: Record<string, unknown> = {}) => ({
    enabled: true, level: 'summary', full_until: null, levels: ['off', 'summary', 'full'],
    limits: {
      summary: { retention_hours: 168, storage_budget_bytes: 128 * MIB, per_request_limit_bytes: 262144 },
      full: { retention_hours: 24, storage_budget_bytes: 512 * MIB, per_request_limit_bytes: 64 * MIB },
    },
    usage: { summary_bytes: 2 * MIB, full_bytes: 0, requests: 3 },
    viewer: true, viewer_search: true, clear_all: true,
    ...over,
  })
  const policy = (over: Record<string, unknown> = {}) => ({
    setting: { level: 'follow', full_until: null }, default: 'summary', effective: 'summary', worker: workerState(), ...over,
  })
  const fullFor = (ms: number, over: Record<string, unknown> = {}) => policy({ setting: { level: 'full', full_until: new Date(Date.now() + ms).toISOString() }, effective: 'full', ...over })
  /** answers: request-logs answer per account id; status: container status per account id (ready by default). */
  function core(answers: Record<number, unknown>, status: Record<number, string> = {}) {
    mocks.get.mockImplementation(async (path: string) => {
      const id = Number(path.split('/')[4])
      if (path.endsWith('/status')) return { status: status[id] ?? 'ready', container: `cc-${id}` }
      if (path.endsWith('/health')) return { logged_in: true }
      return answers[id]
    })
  }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.manage = true
    mocks.confirm.mockResolvedValue(true)
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }] })
    i18n.global.locale.value = 'zh'
  })
  async function render() {
    const wrapper = mount(AccountRuntimes, { attachTo: document.body, global: { plugins: [i18n], stubs: { RouterLink: true } } })
    await flushPromises()
    return wrapper
  }
  const radio = (w: Awaited<ReturnType<typeof render>>, value: string, id = 25) => w.get<HTMLInputElement>(`[data-testid="request-log-level-${id}"] input[value="${value}"]`)
  const lastOverrides = (w: Awaited<ReturnType<typeof render>>) => w.emitted('overrides')!.at(-1)![0]

  it('follows the default and names the level it follows', async () => {
    core({ 25: policy() })
    const w = await render()
    expect(w.get('[data-testid="request-log-level-25"]').text().replace(/\s+/g, '')).toBe('跟随默认（摘要）关闭摘要完整')
    expect(radio(w, 'follow').element.checked).toBe(true)
    expect(w.get('[data-testid="request-log-limits-25"]').text()).toContain('当前生效：摘要。')
    expect(w.get('[data-testid="request-log-view-25"]').text()).toBe('查看日志（3）')
    expect(w.find('[data-testid="request-log-full-25"]').exists()).toBe(false)
    expect(w.text()).toContain('级别由核心随每个请求下发给 Worker')
    expect(w.text()).toContain('关闭只停止记录，不删除已有日志')
    expect(w.find('[data-testid="request-log-legacy-hint"]').exists()).toBe(false)
    expect(lastOverrides(w)).toBe(0)
    w.unmount()
  })

  it('names an off default too', async () => {
    core({ 25: policy({ default: 'off', effective: 'off' }) })
    const w = await render()
    expect(radio(w, 'follow').element.parentElement!.textContent).toContain('跟随默认（关闭）')
    expect(w.get('[data-testid="request-log-limits-25"]').text()).toContain('当前生效：关闭。')
    w.unmount()
  })

  it('sets off, summary and follow without a confirmation, since off deletes nothing', async () => {
    core({ 25: policy() })
    mocks.put.mockResolvedValueOnce(policy({ setting: { level: 'off', full_until: null }, effective: 'off' }))
    const w = await render()
    await radio(w, 'off').setValue(true)
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.put).toHaveBeenLastCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'off' })
    expect(radio(w, 'off').element.checked).toBe(true)
    expect(lastOverrides(w)).toBe(1)
    mocks.put.mockResolvedValueOnce(policy())
    await radio(w, 'follow').setValue(true)
    await flushPromises()
    expect(mocks.put).toHaveBeenLastCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'follow' })
    expect(radio(w, 'follow').element.checked).toBe(true)
    expect(lastOverrides(w)).toBe(0)
    w.unmount()
  })

  it('keeps the setting and shows an error when saving fails', async () => {
    core({ 25: policy() })
    mocks.put.mockRejectedValue(new Error('unreachable'))
    const w = await render()
    await radio(w, 'summary').setValue(true)
    await flushPromises()
    expect(radio(w, 'follow').element.checked).toBe(true)
    expect(w.text()).toContain('读取或更新日志开关失败')
    w.unmount()
  })

  it('turns full on for a chosen duration and counts down to following the default', async () => {
    core({ 25: policy() })
    mocks.put.mockResolvedValue(fullFor(24 * 3600000))
    const w = await render()
    await radio(w, 'full').setValue(true)
    await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    const dialog = document.body.querySelector('[data-testid="request-log-full-dialog"]')
    expect(dialog?.textContent).toContain('到期回到跟随默认')
    ;(document.body.querySelector('[data-testid="request-log-full-hours"] input[value="24"]') as HTMLInputElement).click()
    await flushPromises()
    ;(document.body.querySelector('[data-testid="request-log-full-confirm"]') as HTMLElement).click()
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'full', full_for_hours: 24 })
    expect(radio(w, 'full').element.checked).toBe(true)
    expect(w.get('[data-testid="request-log-full-25"]').text()).toMatch(/^完整：剩余 (23 小时 59|24 小时 0) 分（到期回到跟随默认）$/)
    expect(lastOverrides(w)).toBe(1)
    w.unmount()
  })

  it('shows the remaining time of a full setting, and an expired one as following the default', async () => {
    for (const [ms, text] of [
      [(3 * 60 + 12) * 60000 - 5000, '完整：剩余 3 小时 12 分（到期回到跟随默认）'],
      [25 * 60000 - 5000, '完整：剩余 25 分（到期回到跟随默认）'],
    ] as const) {
      core({ 25: fullFor(ms) })
      const w = await render()
      expect(w.get('[data-testid="request-log-full-25"]').text()).toBe(text)
      w.unmount()
    }
    core({ 25: fullFor(-60000) })
    const w = await render()
    expect(radio(w, 'follow').element.checked).toBe(true)
    expect(w.find('[data-testid="request-log-full-25"]').exists()).toBe(false)
    expect(w.get('[data-testid="request-log-limits-25"]').text()).toContain('当前生效：摘要。')
    expect(lastOverrides(w)).toBe(0)
    w.unmount()
  })

  it('clears all logs or the full content only after confirmation', async () => {
    core({ 25: policy({ worker: workerState({ usage: { summary_bytes: MIB, full_bytes: 3 * MIB, requests: 9 } }) }) })
    mocks.confirm.mockResolvedValueOnce(false)
    mocks.put.mockResolvedValue(policy({ worker: workerState({ usage: { summary_bytes: 0, full_bytes: 0, requests: 0 } }) }))
    const w = await render()
    await w.get('[data-testid="request-log-clear-all-25"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ danger: true, title: '清空请求调试日志' }))
    expect(mocks.put).not.toHaveBeenCalled()
    await w.get('[data-testid="request-log-clear-all-25"]').trigger('click')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { clear_all: true })
    expect(w.get('[data-testid="request-log-view-25"]').text()).toBe('查看日志（0）')
    expect(w.find('[data-testid="request-log-clear-full-25"]').exists()).toBe(false)
    // The setting is kept.
    expect(radio(w, 'follow').element.checked).toBe(true)
    w.unmount()
  })

  it('still sets the level while the Worker cannot be reached, with usage and viewing unavailable', async () => {
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }, { id: 26, name: 'cc-new', type: 'managed', created_by: 1 }] })
    core({ 25: policy({ worker: null }), 26: policy({ setting: { level: 'off', full_until: null }, effective: 'off', worker: null }) }, { 26: 'creating' })
    mocks.put.mockResolvedValue(policy({ setting: { level: 'summary', full_until: null }, worker: null }))
    const w = await render()
    for (const id of [25, 26]) {
      expect(w.get(`[data-testid="request-log-view-${id}"]`).text()).toBe('查看日志（不可用）')
      expect(w.get(`[data-testid="request-log-view-${id}"]`).attributes('disabled')).toBeDefined()
      expect(w.find(`[data-testid="request-log-clear-all-${id}"]`).exists()).toBe(false)
      expect(w.get(`[data-testid="request-log-worker-unavailable-${id}"]`).text()).toContain('级别仍可设置')
      expect(w.get(`[data-testid="request-log-limits-${id}"]`).text()).toContain('Worker 暂时无法访问')
    }
    // A container that is not ready yet is asked too.
    expect(mocks.get).toHaveBeenCalledWith('/system/ccgateway/accounts/26/request-logs')
    expect(radio(w, 'off', 26).element.checked).toBe(true)
    expect(lastOverrides(w)).toBe(1)
    await radio(w, 'summary').setValue(true)
    await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith('/system/ccgateway/accounts/25/request-logs', { level: 'summary' })
    expect(radio(w, 'summary').element.checked).toBe(true)
    expect(lastOverrides(w)).toBe(2)
    expect(w.text()).not.toContain('读取或更新日志开关失败')
    w.unmount()
  })

  it('does not flag an older core that cannot answer for a container that is not ready', async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/status')) return { status: 'creating' }
      throw new Error('not_synchronized')
    })
    const w = await render()
    expect(w.text()).not.toContain('读取或更新日志开关失败')
    expect(w.find('[data-testid="request-log-level-25"]').exists()).toBe(false)
    expect(lastOverrides(w)).toBeNull()
    w.unmount()
  })

  it('shows the setting, not the Worker\'s own level, and hides clearing for a Worker without it', async () => {
    // The Worker's local level is off; the core says the account follows the default (summary).
    core({ 25: policy({ worker: workerState({ enabled: false, level: 'off', clear_all: undefined }) }) })
    const w = await render()
    expect(radio(w, 'follow').element.checked).toBe(true)
    expect(radio(w, 'off').element.checked).toBe(false)
    expect(w.get('[data-testid="request-log-limits-25"]').text()).toContain('当前生效：摘要。')
    // A local off no longer blocks reading (§3).
    expect(w.get('[data-testid="request-log-view-25"]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-testid="request-log-clear-all-25"]').exists()).toBe(false)
    w.unmount()
  })

  it('lets readers see the setting but not change it or delete logs', async () => {
    mocks.manage = false
    core({ 25: policy({ worker: workerState({ usage: { summary_bytes: 1, full_bytes: 5, requests: 1 } }) }) })
    const w = await render()
    expect(radio(w, 'full').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="request-log-clear-all-25"]').exists()).toBe(false)
    expect(w.find('[data-testid="request-log-clear-full-25"]').exists()).toBe(false)
    expect(w.get('[data-testid="request-log-view-25"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('rejects a malformed setting instead of guessing', async () => {
    for (const bad of [
      policy({ setting: { level: 'debug', full_until: null } }),
      policy({ setting: { level: 'full', full_until: null } }),
      policy({ setting: null }),
      policy({ default: 'full' }),
      policy({ effective: 'verbose' }),
      policy({ worker: 'down' }),
    ]) {
      core({ 25: bad })
      const w = await render()
      expect(w.find('[data-testid="request-log-level-25"]').exists()).toBe(false)
      expect(w.text()).toContain('读取或更新日志开关失败')
      w.unmount()
    }
  })

  it('keeps the older controls when the core answers with the Worker state', async () => {
    mocks.list.mockResolvedValue({ items: [{ id: 25, name: 'cc-main', type: 'managed', created_by: 1 }, { id: 26, name: 'cc-new', type: 'managed', created_by: 1 }] })
    core({ 25: workerState(), 26: policy() })
    const w = await render()
    // 25: the older core's three levels; 26: the current one's four settings.
    expect(w.get('[data-testid="request-log-level-25"]').text().replace(/\s+/g, '')).toBe('关闭摘要完整')
    expect(w.get('[data-testid="request-log-level-26"]').text().replace(/\s+/g, '')).toBe('跟随默认（摘要）关闭摘要完整')
    expect(w.get('[data-testid="request-log-legacy-hint"]').text()).toContain('关闭会停止记录并删除该账号的全部请求调试日志')
    expect(w.find('[data-testid="request-log-clear-all-25"]').exists()).toBe(false)
    expect(lastOverrides(w)).toBe(0)
    w.unmount()
  })
})
