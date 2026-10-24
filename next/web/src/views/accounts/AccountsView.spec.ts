import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, shallowMount, type DOMWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import type { Account, AccountType, QuotaSnapshot } from '@/api/types'
import { i18n } from '@/i18n'
import { SDropdown } from '@sub2api/ui'
import AccountsView from './AccountsView.vue'
import AccountModelTest from './AccountModelTest.vue'
import AccountEditor from './AccountEditor.vue'

/** Toggles a switch: SSwitch is a checkbox (jsdom only activates connected ones on click), stubs are buttons. */
const flip = (el: Omit<DOMWrapper<Element>, 'exists'>) => (el.element instanceof HTMLInputElement ? el.setValue(!el.element.checked) : el.trigger('click'))

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), findType: vi.fn(), confirm: vi.fn(), toast: vi.fn(), notifyError: vi.fn(), reload: vi.fn(), canUpdate: true }))
vi.mock('@sub2api/host', () => ({ api: { get: mocks.get, post: mocks.post, patch: mocks.patch, list: async () => ({ items: [] }) } }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), confirm: mocks.confirm, toast: mocks.toast }))
vi.mock('@/utils/errors', () => ({ notifyError: mocks.notifyError, errorMessage: String }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => false }) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ slotEntries: () => [], plugin: () => undefined, component: () => undefined }) }))
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), useGroupsLookup: () => ({ groups: ref([]) }), useProxiesLookup: () => ({ proxies: ref([]) }) }))
vi.mock('@/composables/useOwnership', async (original) => ({ ...await original<typeof import('@/composables/useOwnership')>(), useOwnership: () => ({ scopeOf: () => 'all', can: (_a: Account, keys: readonly string[]) => keys.includes('account:update') && mocks.canUpdate }) }))
vi.mock('./accountTypes', () => ({ typeKey: () => '', useAccountTypes: () => ({ load: vi.fn(), find: mocks.findType, grouped: ref([]), types: ref([]) }) }))
vi.mock('@/composables/useList', () => ({ useList: () => list }))

const list = { items: ref<Account[]>([]), total: ref(1), page: ref(1), pageSize: ref(20), loading: ref(false), error: ref(''), filters: {}, reload: mocks.reload }
enableAutoUnmount(afterEach)

function render() {
  return shallowMount(AccountsView, { global: { plugins: [i18n], stubs: {
    STable: { props: ['rows'], template: '<div><div v-for="row in rows" :key="row.id"><slot name="cell-status" :row="row" /><slot name="cell-actions" :row="row" /></div></div>' },
    SLink: { template: '<button><slot /></button>' },
    SBadge: { template: '<span><slot /></span>' },
    SHint: { template: '<span><slot /></span>' },
    SSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<button role="switch" :aria-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />' },
  } } })
}

describe('account automatic disabling policy', () => {
  const account = { id: 23, name: 'test', auto_disable: true, models: [], model_mapping: {}, credentials: {} } as unknown as Account
  const accountType = { plugin_key: 'test', type: 'key', form: { mode: 'native' }, platforms: [], endpoints: [], default_models: [] } as unknown as AccountType
  const renderEditor = (saved: Account | null = account) => shallowMount(AccountEditor, { props: { account: saved, accountType }, global: { plugins: [i18n], stubs: {
    SCard: { template: '<section><slot /></section>' },
    SSettingsGroup: false,
    SSettingRow: false,
    SSwitch: false,
  } } })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockReset().mockResolvedValue({ enabled: true })
    mocks.patch.mockResolvedValue(account)
    i18n.global.locale.value = 'zh'
  })

  it.each([true, false])('locks the switch without clearing a saved %s preference when globally off', async (preference) => {
    mocks.get.mockResolvedValue({ enabled: false })
    const wrapper = renderEditor({ ...account, auto_disable: preference })
    await flushPromises()
    const toggle = wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]')
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(toggle.attributes('aria-checked')).toBe(String(preference))
    expect(wrapper.text()).toContain('全局自动禁用已关闭')
    await flip(toggle)
    expect(toggle.attributes('aria-checked')).toBe(String(preference))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalled()
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('auto_disable')
  })

  it('locks new accounts too and permits an individual opt-out when globally enabled', async () => {
    mocks.get.mockResolvedValueOnce({ enabled: false })
    const wrapper = renderEditor(null)
    await flushPromises()
    const toggle = wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]')
    expect(toggle.attributes('disabled')).toBeDefined()
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(toggle.attributes('disabled')).toBeUndefined()
    await flip(toggle)
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(mocks.get).toHaveBeenCalledWith('/accounts/auto-disable')
  })

  it('keeps the switch locked while loading and on failure, then recovers on focus', async () => {
    let reject!: (error: Error) => void
    mocks.get.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    const wrapper = renderEditor()
    const toggle = wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]')
    expect(toggle.attributes('disabled')).toBeDefined()
    reject(new Error('network unavailable'))
    await flushPromises()
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('暂时无法修改')
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(toggle.attributes('disabled')).toBeUndefined()
    await flip(toggle)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch.mock.calls[0][1]).toMatchObject({ auto_disable: false })
  })

  it('does not let an older enabled response overwrite a newer disabled policy', async () => {
    let resolve!: (policy: { enabled: boolean }) => void
    mocks.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = renderEditor()
    mocks.get.mockResolvedValue({ enabled: false })
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    resolve({ enabled: true })
    await flushPromises()
    expect(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]').attributes('disabled')).toBeDefined()
  })

  it('applies plugin defaults to new accounts and keeps existing read-only preferences', async () => {
    const controlledType: AccountType = { ...accountType, common_controls: {
      auto_disable: { configurable: false, default: false }, schedulable: { configurable: false, default: false },
    } }
    const wrapper = renderEditor(null)
    await wrapper.setProps({ accountType: controlledType })
    await flushPromises()
    for (const key of ['account-auto-disable', 'account-scheduling-control']) {
      const button = wrapper.get(`[data-testid="${key}"] [role="switch"], [role="switch"][data-testid="${key}"]`)
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('aria-checked')).toBe('false')
    }
    await wrapper.setProps({ account: { ...account, schedulable: true } })
    await flushPromises()
    expect(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-testid="account-scheduling-control"] [role="switch"], [role="switch"][data-testid="account-scheduling-control"]').attributes('aria-checked')).toBe('true')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('auto_disable')
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('schedulable')
  })

  it('updates untouched defaults when switching authentication variants', async () => {
    const wrapper = renderEditor(null)
    await wrapper.setProps({ accountType: { ...accountType, creation_group: 'test', common_controls: { auto_disable: { default: false } } } })
    await flushPromises()
    expect(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]').attributes('aria-checked')).toBe('false')
    await wrapper.setProps({ accountType: { ...accountType, type: 'other', creation_group: 'test', common_controls: { auto_disable: { default: true } } } })
    await flushPromises()
    expect(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]').attributes('aria-checked')).toBe('true')
  })

  it('rechecks the global gate before saving an edited preference', async () => {
    const wrapper = renderEditor()
    await flushPromises()
    await flip(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]'))
    mocks.get.mockResolvedValue({ enabled: false })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('auto_disable')
    expect(wrapper.get('[data-testid="account-auto-disable"] [role="switch"], [role="switch"][data-testid="account-auto-disable"]').attributes('disabled')).toBeDefined()
  })
})

describe('account status recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.canUpdate = true
    mocks.findType.mockReset()
    mocks.confirm.mockResolvedValue(true)
    i18n.global.locale.value = 'zh'
    list.items.value = [{ id: 23, name: 'cc-test', status: 'disabled', status_reason: 'credentials rejected', schedulable: true, auto_disable: true, plugin_key: 'ccgateway', type: 'managed', orphaned: false, cooldown_until: null } as Account]
  })

  it('locks the list scheduling switch according to the plugin declaration', async () => {
    mocks.findType.mockReturnValue({ common_controls: { schedulable: { configurable: false } } })
    const wrapper = render()
    const toggle = wrapper.get('[data-testid="account-schedulable-switch"]')
    expect(toggle.attributes('disabled')).toBeDefined()
    await flip(toggle)
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it.each(['disabled', 'auto_disabled', 'error'])('offers a direct reset for %s without a cooldown', (status) => {
    list.items.value[0].status = status
    const w = render()
    expect(w.get('[data-testid="account-reset-status"]').text()).toBe('重置状态')
  })

  it('applies the confirmed server state immediately without changing manual scheduling', async () => {
    list.items.value[0].schedulable = false
    mocks.post.mockResolvedValue({ ...list.items.value[0], status: 'active', status_reason: '', cooldown_until: null })
    const w = render()
    await w.get('[data-testid="account-reset-status"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/accounts/23/reset-status')
    expect(list.items.value[0]).toMatchObject({ status: 'active', status_reason: '', schedulable: false })
    expect(w.find('[data-testid="account-reset-status"]').exists()).toBe(false)
    expect(mocks.reload).toHaveBeenCalledOnce()
    expect(mocks.toast).toHaveBeenCalledWith('账号状态已重置', 'success')
  })

  it('keeps the disabled state and does not report success if reset fails', async () => {
    const error = new Error('reset failed')
    mocks.post.mockRejectedValue(error)
    const w = render()
    await w.get('[data-testid="account-reset-status"]').trigger('click')
    await flushPromises()
    expect(list.items.value[0].status).toBe('disabled')
    expect(mocks.notifyError).toHaveBeenCalledWith(error)
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it('does not reset when confirmation is canceled', async () => {
    mocks.confirm.mockResolvedValue(false)
    const w = render()
    await w.get('[data-testid="account-reset-status"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('does not show recovery for readers or orphaned accounts', () => {
    mocks.canUpdate = false
    const reader = render()
    expect(reader.find('[data-testid="account-reset-status"]').exists()).toBe(false)
    mocks.canUpdate = true
    list.items.value[0].orphaned = true
    const orphaned = render()
    expect(orphaned.find('[data-testid="account-reset-status"]').exists()).toBe(false)
  })

  it('distinguishes automatic disable and displays its release time', () => {
    list.items.value[0].status = 'auto_disabled'
    list.items.value[0].auto_disabled_until = '2026-10-12T08:00:00Z'
    const w = render()
    expect(w.text()).toContain('自动禁用')
    expect(w.get('[data-testid="account-auto-release"]').text()).toContain('自动解除禁用')
    expect(w.get('[data-testid="account-schedulable-switch"]').attributes('aria-checked')).toBe('true')
  })

  it.each([
    { status: 0, error_code: 'proxy_unavailable', error_source: 'gateway' },
    { status: 401, error_code: 'token_revoked', error_source: 'response' },
    { status: 502, error_code: 'ECONNRESET', error_source: 'transport', message: '{"error":{"code":"ECONNRESET","message":"read ECONNRESET"}}' },
    { status: 504, error_code: 'cli_timeout', error_source: 'timeout', message: '{"error":{"code":"cli_timeout","message":"CC request timed out"}}' },
    { status: 429, error_code: 'rate_limit_error', error_source: 'response', message: '{"error":{"type":"rate_limit_error","message":"Error"}}', reason: 'rate limited until tomorrow (default)', effect: 'disable', test_mode: 'native_build', response_headers: { 'request-id': 'req-test-429' } },
  ])('shows diagnostic code without fabricating HTTP status: $error_code', async (diagnostic) => {
    mocks.post.mockResolvedValue({ ok: false, latency_ms: 0, message: 'failure', ...diagnostic })
    const w = shallowMount(AccountModelTest, { props: { open: false, account: { ...list.items.value[0], models: ['claude-test'] } }, global: { plugins: [i18n], stubs: {
      SModal: { template: '<div><slot /></div>' },
      STable: { props: ['rows'], template: '<div><div v-for="row in rows" :key="row.model"><slot name="cell-state" :row="row" /><slot name="cell-actions" :row="row" /></div></div>' },
      SButton: { template: '<button><slot /></button>' },
      SBadge: { template: '<span><slot /></span>' },
      SHint: { template: '<span><slot /></span>' },
    } } })
    await w.setProps({ open: true })
    await w.get('[data-testid="model-test-one"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="model-test-error-code"]').text()).toContain(diagnostic.error_code)
    expect(w.text().includes('401')).toBe(diagnostic.status === 401)
    expect(w.emitted('tested')?.[0]?.[1]).toMatchObject({ status: diagnostic.status, error_code: diagnostic.error_code, error_source: diagnostic.error_source })
    if (diagnostic.error_source === 'transport' || diagnostic.error_source === 'timeout') {
      expect(w.get('[data-testid="model-test-error-body"]').text()).toBe(diagnostic.message)
      expect(w.text()).toContain(diagnostic.error_source === 'transport' ? '传输链路' : 'CC 请求超时')
      expect(w.text()).not.toContain('代理故障')
      expect(w.text()).not.toContain('HTTP 响应')
    }
    if (diagnostic.status === 429) {
      expect(w.get('[data-testid="model-test-error-body"]').text()).toBe(diagnostic.message)
      expect(w.text()).not.toContain('rate limited until')
      expect(w.text()).not.toContain('原因尚不能确认')
      expect(w.get('[data-testid="model-test-request-id"]').text()).toContain('req-test-429')
      expect(w.text()).not.toContain('建议禁用')
    }
  })

  it('shows a successful model test like new-api: outcome and request time, request id only in the details', async () => {
    mocks.post.mockResolvedValue({ ok: true, status: 200, latency_ms: 3550, model: 'claude-test', message: 'ok', response_headers: { 'request-id': 'req_ok_1' } })
    const w = shallowMount(AccountModelTest, { props: { open: false, account: { ...list.items.value[0], models: ['claude-test'] } }, global: { plugins: [i18n], stubs: {
      SModal: { template: '<div><slot /></div>' },
      STable: { props: ['rows'], template: '<div><div v-for="row in rows" :key="row.model"><slot name="cell-state" :row="row" /><slot name="cell-actions" :row="row" /></div></div>' },
      SButton: { template: '<button><slot /></button>' },
      SBadge: { template: '<span><slot /></span>' },
      SHint: { template: '<span><slot /></span>' },
    } } })
    await w.setProps({ open: true })
    await w.get('[data-testid="model-test-one"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="model-test-duration"]').text()).toBe('请求时长 3.55 s')
    expect(w.find('[data-testid="model-test-request-id"]').exists()).toBe(false)
    expect(w.text()).not.toContain('req_ok_1')
  })

  it('shows an enabled unschedulable account as automatically disabled and restores it through manual off/on', async () => {
    Object.assign(list.items.value[0], { status: 'active', schedulable: false, status_reason: '' })
    mocks.patch.mockImplementation(async (_path: string, values: Partial<Account>) => ({ ...list.items.value[0], ...values, status_reason: '' }))
    const w = render()
    const toggle = w.get('[data-testid="account-schedulable-switch"]')
    expect(w.text()).toContain('自动禁用')
    expect(w.text()).not.toContain('不参与调度')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('禁用')
    await flip(toggle)
    await flushPromises()
    expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/23', { status: 'disabled', schedulable: false })
    expect(list.items.value[0].status).toBe('disabled')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(w.text()).not.toContain('自动禁用')
    await flip(toggle)
    await flushPromises()
    expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/23', { status: 'active', schedulable: true })
    expect(list.items.value[0]).toMatchObject({ status: 'active', schedulable: true })
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(w.text()).not.toContain('自动禁用')
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('keeps a manually disabled account off even when scheduling is on, and retains that state if enabling fails', async () => {
    const error = new Error('enable failed')
    mocks.patch.mockRejectedValueOnce(error)
    const w = render()
    const toggle = w.get('[data-testid="account-schedulable-switch"]')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe('启用')
    await flip(toggle)
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/23', { status: 'active', schedulable: true })
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(list.items.value[0].status).toBe('disabled')
    expect(mocks.notifyError).toHaveBeenCalledWith(error)
  })
})

describe('plugin account actions', () => {
  const refreshToken = { id: 'refresh_token', label: { en: 'Refresh token', zh: '刷新令牌' }, plugin_key: 'ccgateway', account_type: 'managed' }
  const reauthorize = { id: 'refresh_auth', label: { en: 'Refresh authorization', zh: '重新授权' }, plugin_key: 'ccgateway', account_type: 'managed' }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.canUpdate = true
    i18n.global.locale.value = 'zh'
    list.items.value = [{ id: 29, name: 'cc', status: 'active', schedulable: true, plugin_key: 'ccgateway', type: 'managed', orphaned: false, actions: [refreshToken, reauthorize] } as unknown as Account]
  })
  const dropdown = (w: ReturnType<typeof render>) => w.findComponent(SDropdown)

  it('lists the plugin actions and reports a refreshed token', async () => {
    mocks.post.mockResolvedValue({ refreshed: true, expires_at: '2026-10-15T20:04:00Z' })
    const w = render()
    const items = dropdown(w).props('actions') as Array<{ key: string; label: string; hidden?: boolean }>
    expect(items.filter((x) => x.key.startsWith('plugin:') && !x.hidden).map((x) => x.label)).toEqual(['刷新令牌', '重新授权'])
    dropdown(w).vm.$emit('select', 'plugin:ccgateway:refresh_token')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/accounts/29/actions/ccgateway/refresh_token', {}, expect.anything())
    expect(mocks.toast).toHaveBeenLastCalledWith(expect.stringContaining('令牌已刷新'), 'success')
  })

  it('translates a known refusal and hides actions from readers', async () => {
    mocks.post.mockRejectedValue(Object.assign(new Error('refused'), { details: { reason: 'token_revoked' } }))
    const w = render()
    dropdown(w).vm.$emit('select', 'plugin:ccgateway:refresh_token')
    await flushPromises()
    expect(mocks.toast).toHaveBeenLastCalledWith('令牌已失效且无法续期，请重新授权账号', 'error')
    expect(mocks.notifyError).not.toHaveBeenCalled()
    mocks.canUpdate = false
    const reader = render()
    expect((dropdown(reader).props('actions') as Array<{ key: string; hidden?: boolean }>).filter((x) => x.key.startsWith('plugin:') && !x.hidden)).toEqual([])
  })

  it.each([true, false])('requeries quota after a successful token action and replaces the stale error: refreshed=%s', async (refreshed) => {
    list.items.value[0].quota = { supported: true, source: 'active', updated_at: '2026-10-01T00:00:00Z', error: 'transient: token_expired: expired', refresh_status: 'error', windows: [] }
    const recovered = { supported: true, source: 'active', updated_at: new Date().toISOString(), error: '', refresh_status: 'ready', windows: [{ key: '5h', utilization: 7, status: 'allowed', resets_at: null }] }
    mocks.post.mockResolvedValue({ refreshed, expires_at: '2026-10-15T20:04:00Z' })
    mocks.get.mockResolvedValue(recovered)
    const w = render()
    dropdown(w).vm.$emit('select', 'plugin:ccgateway:refresh_token')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/accounts/29/quota', { force: true })
    expect(list.items.value[0].quota).toEqual(recovered)
  })

  it('names why a manual quota refresh cannot run instead of keeping the old snapshot silently', async () => {
    const stale: QuotaSnapshot = { supported: true, source: '', updated_at: null, error: '', refresh_status: 'pending', windows: [] }
    list.items.value[0].quota = stale
    mocks.post.mockResolvedValue({ refreshed: true, expires_at: '2026-10-15T20:04:00Z' })
    mocks.get.mockRejectedValueOnce(Object.assign(new Error('conflict'), { details: { reason: 'runtime_not_ready' } }))
    const w = render()
    dropdown(w).vm.$emit('select', 'plugin:ccgateway:refresh_token')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/accounts/29/quota', { force: true })
    expect(mocks.toast).toHaveBeenLastCalledWith('账号运行环境尚未同步完成，暂时无法查询额度，请稍后再试', 'error')
    expect(mocks.notifyError).not.toHaveBeenCalled()
    expect(list.items.value[0].quota).toEqual(stale)
    const unknown = Object.assign(new Error('conflict'), { details: { reason: 'something_else' } })
    mocks.get.mockRejectedValueOnce(unknown)
    dropdown(w).vm.$emit('select', 'plugin:ccgateway:refresh_token')
    await flushPromises()
    expect(mocks.notifyError).toHaveBeenCalledWith(unknown)
  })
})
