import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Account, AccountType } from '@/api/types'
import AccountEditor from './AccountEditor.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import CCGatewayAccountAuth from '@/views/ccgateway/CCGatewayAccountAuth.vue'
import AccountFeatureSettings from '@/views/ccgateway/AccountFeatureSettings.vue'
import ModelTagSelect from '@/components/models/ModelTagSelect.vue'
import AccountModelsCard from './AccountModelsCard.vue'
import ModelLimitsEditor from './ModelLimitsEditor.vue'
import { SSwitch } from '@sub2api/ui'
import AccountEditorNav from './AccountEditorNav.vue'
import AccountUsageLimitCard from './AccountUsageLimitCard.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), list: vi.fn().mockResolvedValue({ items: [] }), toast: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...await original<object>(), api: mocks }))
vi.mock('@sub2api/ui', async (original) => ({ ...await original<typeof import('@sub2api/ui')>(), toast: mocks.toast }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ plugin: () => null, component: () => null }), assetURL: () => '' }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/composables/useOwnership', async original => ({ ...await original<typeof import('@/composables/useOwnership')>(), useOwnership: () => ({ can: () => true }) }))
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), useProxiesLookup: () => ({}) }))

enableAutoUnmount(afterEach)
const accountType = { plugin_key: 'ccgateway', type: 'apikey', creation_group: 'ccgateway', form: { mode: 'schema' }, platforms: [], default_models: [], default_model_mapping: {} } as unknown as AccountType
const location = { ip: '8.8.8.8', country_code: 'US', timezone: 'America/Los_Angeles' }

function render(account?: Account, realSelect = false, type: AccountType = accountType) {
  return shallowMount(AccountEditor, { props: { accountType: type, account }, global: { plugins: [i18n], stubs: {
    // The models card is rendered (not stubbed) so its tag select is reachable.
    AccountModelsCard: false,
    SCard: { template: '<div><slot name="title" /><slot name="actions" /><slot /></div>' },
    SSettingRow: { template: '<div><slot /></div>' },
    SSettingsGroup: { template: '<div><slot /></div>' },
    SField: { props: ['error'], template: '<div><slot /><p v-if="error">{{ error }}</p><slot v-else name="hint" /></div>' },
    SHint: { template: '<p><slot /></p>' },
    SSegmented: false,
    SSelect: realSelect ? false : { props: ['modelValue', 'options', 'disabled', 'searchable'], emits: ['update:modelValue'], template: '<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    SInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    SchemaForm: { template: '<div />', methods: { validate: () => true } },
  } } })
}

function savedAccount(settings: Account['settings'] = { locale: 'ja-JP', timezone: 'Asia/Tokyo' }): Account {
  return { id: 1, name: 'saved', proxy_id: 10, settings, credentials: {}, group_ids: [], models: [], model_mapping: {} } as unknown as Account
}

async function chooseProxy(w: ReturnType<typeof render>, id: number | null) {
  w.getComponent(ProxyPicker).vm.$emit('update:modelValue', id)
  await flushPromises()
}

function value(w: ReturnType<typeof render>, field: string) {
  return (w.get(`[data-testid="container-${field}"]`).element as HTMLInputElement).value
}

describe('account container environment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.get.mockImplementation((path: string) => Promise.resolve(path === '/accounts/auto-disable' ? { enabled: true } : path.endsWith('/form') ? { schema: { type: 'object' } } : location))
    mocks.patch.mockResolvedValue(savedAccount())
    mocks.post.mockResolvedValue(savedAccount())
  })

  it('saves a feature draft atomically with account fields and omits unchanged policy', async () => {
    const w = render(savedAccount())
    await flushPromises()
    const features = w.getComponent(AccountFeatureSettings)
    const original = { mode: 'follow', overrides: {}, revision: 7 }
    features.vm.$emit('update:modelValue', original)
    features.vm.$emit('loaded', original)
    await flushPromises()
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('cc_feature_policy')
    const draft = { mode: 'custom', overrides: { build_billing_sources: { cc_version: 'worker' } }, revision: 7 }
    features.vm.$emit('update:modelValue', draft)
    await flushPromises()
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/1', expect.objectContaining({ name: 'saved', cc_feature_policy: draft }))
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('uses the declared preparation endpoint and locks the prepared environment', async () => {
    const w = render()
    await w.setProps({ accountType: { ...accountType, type: 'managed', lifecycle: { preparation: true, required: true } } })
    await chooseProxy(w, 10)
    const preparation = w.getComponent(CCGatewayAccountAuth)
    expect(preparation.props('preparationUrl')).toBe('/account-types/ccgateway/managed/preparations')
    expect(preparation.props('settings')).toEqual({ locale: 'en-US', timezone: location.timezone })
    expect(preparation.props('configurationReady')).toBe(true)
    preparation.vm.$emit('state', { key: 'd0123456789abcdef', authorized: false })
    await flushPromises()
    expect(w.get('[data-testid="container-locale"]').attributes('disabled')).toBeDefined()
    await chooseProxy(w, 11)
    expect(value(w, 'locale')).toBe('en-US')
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/location'))).toHaveLength(1)
  })

  it('shows deferred runtime configuration without claiming it has applied', async () => {
    const w = render({ ...savedAccount(), lifecycle_sync: { status: 'pending', code: 'environment_requires_new_runtime' } })
    await flushPromises()
    expect(w.get('[data-testid="account-lifecycle-status"]').text()).toContain('现有容器保持不变')
  })

  it('prefills a new account from the selected proxy and refills it when the proxy changes', async () => {
    const w = render()
    await chooseProxy(w, 20)
    expect(value(w, 'locale')).toBe('en-US')
    expect(value(w, 'timezone')).toBe('America/Los_Angeles')
    await w.get('[data-testid="container-locale"]').setValue('zh-CN')
    expect(value(w, 'locale')).toBe('zh-CN')
    await chooseProxy(w, 21)
    expect(value(w, 'locale')).toBe('en-US')
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/location'))).toHaveLength(2)
  })

  it('keeps the saved environment of an existing account when its proxy changes, and still accepts manual overrides', async () => {
    const w = render(savedAccount())
    await flushPromises()
    await chooseProxy(w, 20)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(w.get('[data-testid="container-location-status"]').text()).toContain('不会自动改写')
    await chooseProxy(w, null)
    expect(value(w, 'locale')).toBe('ja-JP')
    await chooseProxy(w, 21)
    await w.get('[data-testid="container-timezone"]').setValue('Asia/Shanghai')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: 'ja-JP', timezone: 'Asia/Shanghai' }, proxy_id: 21 }))
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('keeps the saved environment of an existing account when switching the proxy mode or testing a pasted proxy', async () => {
    const w = render(savedAccount(), false, { ...accountType, type: 'managed' })
    await flushPromises()
    await w.get('[data-testid="proxy-mode"] input[value="url"]').setValue(true)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(w.get('[data-testid="container-location-status"]').text()).toContain('不会自动改写')
    mocks.post.mockResolvedValueOnce({ ok: true, protocol: 'http', ip: '1.2.3.4', proxy_url: 'http://u:p@h:8443', proxy_id: 42, proxy_created: true, location, attempts: [] })
    await w.get('[data-testid="proxy-url"]').setValue('h:8443:u:p')
    await w.get('[data-testid="proxy-url"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(42)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    await w.get('[data-testid="proxy-mode"] input[value="existing"]').setValue(true)
    expect(value(w, 'locale')).toBe('ja-JP')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: 'ja-JP', timezone: 'Asia/Tokyo' }, proxy_id: 42 }))
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('does not overwrite a saved environment just by opening an account', async () => {
    const w = render(savedAccount())
    await flushPromises()
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('preserves a saved container default independently of the other field', async () => {
    const w = render(savedAccount({ locale: 'ja-JP' }))
    await flushPromises()
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('preserves reset defaults when reopening and saving unrelated changes', async () => {
    const w = render(savedAccount({}))
    await flushPromises()
    expect(value(w, 'locale')).toBe('')
    expect(value(w, 'timezone')).toBe('')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: '', timezone: '' } }))
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('does not refill when the same account and proxy are refreshed after a model update', async () => {
    const w = render(savedAccount())
    await flushPromises()
    await w.setProps({ account: { ...savedAccount(), models: ['updated-model'] } })
    await flushPromises()
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('refills the existing proxy when switching from pasted URL mode to OAuth', async () => {
    const w = render()
    await chooseProxy(w, 10)
    await w.get('[data-testid="proxy-mode"] input[value="url"]').setValue(true)
    await w.get('[data-testid="container-locale"]').setValue('ja-JP')
    await w.get('[data-testid="container-timezone"]').setValue('Asia/Tokyo')
    await w.setProps({ accountType: { ...accountType, type: 'managed' } })
    await flushPromises()
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(10)
    expect(value(w, 'locale')).toBe('en-US')
    expect(value(w, 'timezone')).toBe(location.timezone)
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/location'))).toHaveLength(2)
  })

  it('tests a pasted proxy for a new Claude Code account, then selects it and fills its location', async () => {
    const w = render()
    await w.setProps({ accountType: { ...accountType, type: 'managed' } })
    await flushPromises()
    const tokyo = { ip: '1.2.3.4', country_code: 'JP', timezone: 'Asia/Tokyo' }
    mocks.post.mockResolvedValueOnce({ ok: true, protocol: 'http', ip: '1.2.3.4', proxy_url: 'http://u___x:p@h:8443', proxy_id: 42, proxy_created: true, location: tokyo, attempts: [] })
    await w.get('[data-testid="proxy-mode"] input[value="url"]').setValue(true)
    await w.get('[data-testid="proxy-url"]').setValue('h:8443:u___x:p')
    await w.get('[data-testid="proxy-url"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/proxies/probe', { proxy_url: 'h:8443:u___x:p', save: true })
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(42)
    expect(w.getComponent(CCGatewayAccountAuth).props('proxyId')).toBe(42)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(w.get('[data-testid="proxy-probe-result"]').text()).toContain('#42')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('keeps a pasted proxy that does not work and lists every protocol tried', async () => {
    const w = render()
    mocks.post.mockResolvedValueOnce({ ok: false, attempts: [{ protocol: 'socks5', ok: false, latency_ms: 1, message: 'refused' }, { protocol: 'http', ok: false, latency_ms: 1, status: 407 }], proxy_created: false })
    await w.get('[data-testid="proxy-mode"] input[value="url"]').setValue(true)
    await w.get('[data-testid="proxy-url"]').setValue('h:1:u:p')
    await w.get('[data-testid="proxy-url"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.find('[data-testid="proxy-url"]').exists()).toBe(true)
    expect(w.text()).toContain('socks5: refused; http: 407')
  })

  it('restores saved values when a refresh discards an unsaved proxy change', async () => {
    const w = render(savedAccount())
    await chooseProxy(w, 20)
    expect(value(w, 'locale')).toBe('ja-JP')
    await w.get('[data-testid="container-locale"]').setValue('zh-CN')
    await w.setProps({ account: { ...savedAccount(), models: ['updated-model'] } })
    await flushPromises()
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(10)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('loads another account without copying the previous environment or querying its proxy', async () => {
    const w = render(savedAccount())
    await flushPromises()
    await w.setProps({ account: { ...savedAccount({}), id: 2 } })
    await flushPromises()
    expect(value(w, 'locale')).toBe('')
    expect(value(w, 'timezone')).toBe('')
    expect(mocks.get.mock.calls.some(([path]) => path.endsWith('/location'))).toBe(false)
  })

  it('waits for location lookup before allowing edits and ignores stale responses', async () => {
    const resolvers: Array<(v: typeof location) => void> = []
    mocks.get.mockImplementation((path: string) => path === '/accounts/auto-disable' ? Promise.resolve({ enabled: true }) : path.endsWith('/form') ? Promise.resolve({ schema: {} }) : new Promise(resolve => resolvers.push(resolve)))
    const w = render()
    await chooseProxy(w, 10)
    expect(w.get('[data-testid="container-locale"]').attributes('disabled')).toBeDefined()
    await chooseProxy(w, 11)
    resolvers[1]({ ip: '1.1.1.1', country_code: 'JP', timezone: 'Asia/Tokyo' })
    await flushPromises()
    expect(value(w, 'locale')).toBe('ja-JP')
    resolvers[0](location)
    await flushPromises()
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(w.get('[data-testid="container-locale"]').attributes('disabled')).toBeUndefined()
  })

  it('allows manual selection on failure and clears stale defaults when a proxy is removed', async () => {
    const w = render()
    mocks.get.mockRejectedValueOnce(new Error('unavailable'))
    await chooseProxy(w, 10)
    expect(w.get('[data-testid="container-location-status"]').text()).toContain('请手动选择')
    expect(w.get('[data-testid="container-locale"]').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="container-locale"]').setValue('zh-CN')
    await chooseProxy(w, null)
    expect(value(w, 'locale')).toBe('')
  })

  it('does not apply a pending lookup to another account with saved defaults', async () => {
    let resolveLocation!: (v: typeof location) => void
    mocks.get.mockImplementation((path: string) => path === '/accounts/auto-disable' ? Promise.resolve({ enabled: true }) : path.endsWith('/form') ? Promise.resolve({ schema: {} }) : new Promise(resolve => { resolveLocation = resolve }))
    const w = render()
    await chooseProxy(w, 10)
    await w.setProps({ account: savedAccount({}) })
    await flushPromises()
    resolveLocation(location)
    await flushPromises()
    expect(value(w, 'locale')).toBe('')
    expect(value(w, 'timezone')).toBe('')
    expect(w.get('[data-testid="container-locale"]').attributes('disabled')).toBeUndefined()
  })

  it('searches and submits the real dropdown without accepting search text as a locale', async () => {
    const w = render(savedAccount({}), true)
    await flushPromises()
    const select = w.get('[data-testid="container-locale"]')
    const input = select.get('input')
    await input.trigger('focus')
    await input.setValue('ZH-cn')
    // The list may be teleported to <body> (SSelect floats it when the field is in the document).
    expect(new Set([...select.element.querySelectorAll('[role="option"]'), ...document.querySelectorAll('[role="option"]')]).size).toBe(1)
    await input.trigger('keydown', { key: 'Enter' })
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: 'zh-CN', timezone: '' } }))
  })

  it('sends empty settings explicitly to reset previously saved overrides', async () => {
    const w = render(savedAccount())
    await flushPromises()
    await w.get('[data-testid="container-locale"]').setValue('')
    await w.get('[data-testid="container-timezone"]').setValue('')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: '', timezone: '' } }))
  })
})

describe('automatic Claude Code models', () => {
  const maxModels = ['claude-fable-5', 'claude-opus-5', 'claude-sonnet-5']
  const proModels = ['claude-opus-5', 'claude-sonnet-5']
  const managed = { ...accountType, type: 'managed', default_models: maxModels, default_models_by_subscription: { pro: proModels } } as unknown as AccountType
  const subscribed = (subscription_type: string, extra: Partial<Account> = {}) =>
    ({ ...savedAccount(), models: ['custom-model'], subscription_type, ...extra }) as Account
  // The list lives inside the models card now: two levels down.
  const tags = (w: ReturnType<typeof render>) => w.getComponent(AccountModelsCard).getComponent(ModelTagSelect)

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.get.mockImplementation((path: string) => Promise.resolve(path === '/accounts/auto-disable' ? { enabled: true } : path.endsWith('/form') ? { schema: { type: 'object' } } : location))
    mocks.patch.mockResolvedValue(savedAccount())
  })

  it('shows the subscription preset read-only while on and submits auto_models', async () => {
    const w = render(subscribed('pro'), false, managed)
    await flushPromises()
    expect(w.getComponent(SSwitch).props('modelValue')).toBe(true)
    expect(tags(w).props('readonly')).toBe(true)
    expect(tags(w).props('modelValue')).toEqual(proModels)
    expect(w.find('[data-testid="models-clear"]').exists()).toBe(false)
    expect(w.find('[data-testid="models-fill-defaults"]').exists()).toBe(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ auto_models: true, models: proModels }))
  })

  it('fills the preset when turned off and then submits the edited list', async () => {
    const w = render(subscribed('max'), false, managed)
    await flushPromises()
    expect(tags(w).props('modelValue')).toEqual(maxModels)
    w.getComponent(SSwitch).vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(tags(w).props('readonly')).toBe(false)
    expect(tags(w).props('modelValue')).toEqual(maxModels)
    expect(w.find('[data-testid="models-clear"]').exists()).toBe(true)
    tags(w).vm.$emit('update:modelValue', ['claude-opus-5', 'my-model'])
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ auto_models: false, models: ['claude-opus-5', 'my-model'] }))
  })

  it('opens a manual account with its own list', async () => {
    const w = render(subscribed('pro', { auto_models: false, models: ['my-model'] }), false, managed)
    await flushPromises()
    expect(w.getComponent(SSwitch).props('modelValue')).toBe(false)
    expect(tags(w).props('readonly')).toBe(false)
    expect(tags(w).props('modelValue')).toEqual(['my-model'])
  })

  it('follows the subscription the authorization reports for a new account', async () => {
    const w = render(undefined, false, managed)
    await flushPromises()
    expect(tags(w).props('modelValue')).toEqual(maxModels)
    w.getComponent(CCGatewayAccountAuth).vm.$emit('state', { key: 'd0123456789abcdef', authorized: true, subscription_type: 'pro' })
    await flushPromises()
    expect(tags(w).props('modelValue')).toEqual(proModels)
    expect(tags(w).props('readonly')).toBe(true)
  })
})

describe('account model limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.get.mockImplementation((path: string) => Promise.resolve(path === '/accounts/auto-disable' ? { enabled: true } : path.endsWith('/form') ? { schema: { type: 'object' } } : location))
    mocks.patch.mockResolvedValue(savedAccount())
  })

  const caps = { max_concurrency: 0, rpm_limit: 0, tpm_limit: 0, spm_limit: 0 }

  it('edits the saved lists as cards and submits one entry per list', async () => {
    const limits = [{ models: ['m-a'], ...caps, max_concurrency: 1, spm_limit: 2 }, { models: ['m-b'], ...caps, max_concurrency: 1, spm_limit: 2 }]
    const w = render({ ...savedAccount(), model_limits: limits } as Account)
    await flushPromises()
    const editor = w.getComponent(ModelLimitsEditor)
    expect(editor.props('modelValue')).toEqual([{ lists: [['m-a'], ['m-b']], ...caps, max_concurrency: 1, spm_limit: 2 }])
    editor.vm.$emit('update:modelValue', [{ lists: [['m-a', 'm-c'], []], ...caps, rpm_limit: 9, spm_limit: 3 }])
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ model_limits: [{ models: ['m-a', 'm-c'], ...caps, rpm_limit: 9, spm_limit: 3 }] }))
  })

  it('edits the sessions per minute of the account and of a model list', async () => {
    const w = render({ ...savedAccount(), spm_limit: 5 } as Account)
    await flushPromises()
    const input = w.get('input[data-testid="account-spm_limit"]')
    expect((input.element as HTMLInputElement).value).toBe('5')
    await input.setValue('7')
    w.getComponent(ModelLimitsEditor).vm.$emit('update:modelValue', [{ lists: [['m-a']], ...caps, spm_limit: 2 }])
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ spm_limit: 7, model_limits: [{ models: ['m-a'], ...caps, spm_limit: 2 }] }))
  })

  it('refuses to save a model listed twice', async () => {
    const w = render(savedAccount())
    await flushPromises()
    w.getComponent(ModelLimitsEditor).vm.$emit('update:modelValue', [{ lists: [['m-a'], ['m-a']], ...caps, rpm_limit: 1 }])
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(w.getComponent(ModelLimitsEditor).props('errors')).toEqual({ model_limits: 'm-a 已在另一个列表中' })
  })

  it('starts a new account from the limits its plugin suggests', async () => {
    const type = { ...accountType, default_limits: { priority: 3, spm_limit: 6, model_limits: [{ models: ['m-a'], ...caps, max_concurrency: 2 }] } } as AccountType
    const w = render(undefined, false, type)
    await flushPromises()
    expect(w.getComponent(ModelLimitsEditor).props('modelValue')).toEqual([{ lists: [['m-a']], ...caps, max_concurrency: 2 }])
    expect((w.get('input[data-testid="account-spm_limit"]').element as HTMLInputElement).value).toBe('6')
  })
})

describe('account usage limit', () => {
  const saved = { raw_cost_accounting: false, enabled: true, amount: '200', period: 'week', period_count: 1, anchor: null, timezone: 'UTC' }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  let limitGet: () => Promise<unknown>

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    limitGet = () => Promise.resolve(saved)
    mocks.get.mockImplementation((path: string) =>
      path.endsWith('/usage-limit') ? limitGet() : Promise.resolve(path === '/accounts/auto-disable' ? { enabled: true } : path.endsWith('/form') ? { schema: { type: 'object' } } : location)
    )
    mocks.patch.mockResolvedValue(savedAccount())
    mocks.put.mockResolvedValue({})
  })

  const card = (w: ReturnType<typeof render>) => w.getComponent(AccountUsageLimitCard)
  async function open() {
    const w = render(savedAccount())
    await flushPromises()
    w.getComponent(AccountEditorNav).vm.$emit('update:modelValue', 'scheduling')
    await flushPromises()
    return w
  }
  async function submit(w: ReturnType<typeof render>) {
    await w.get('form').trigger('submit')
    await flushPromises()
  }

  it('loads the limit when the section is shown and saves it after the account, in the browser time zone', async () => {
    const w = render(savedAccount())
    await flushPromises()
    expect(mocks.get).not.toHaveBeenCalledWith('/accounts/1/usage-limit')
    w.getComponent(AccountEditorNav).vm.$emit('update:modelValue', 'scheduling')
    await flushPromises()
    expect(card(w).props()).toMatchObject({ status: 'ready', modelValue: saved })
    expect(w.getComponent(AccountEditorNav).props('sections')[2].summary).toContain('用量限制 $200.00 每周')
    await submit(w)
    expect(mocks.patch).toHaveBeenCalledOnce()
    expect(mocks.put).not.toHaveBeenCalled()

    card(w).vm.$emit('update:modelValue', { ...saved, amount: '300', period_count: 2 })
    await flushPromises()
    expect(card(w).props('modelValue').timezone).toBe(zone)
    expect(w.getComponent(AccountEditorNav).props('sections')[2].summary).toContain('用量限制 $300.00 每 2 周')
    await submit(w)
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...saved, amount: '300', period_count: 2, timezone: zone })
    expect(mocks.patch.mock.invocationCallOrder[1]).toBeLessThan(mocks.put.mock.invocationCallOrder[0])
    expect(w.emitted('saved')).toHaveLength(2)
  })

  it('keeps the saved time zone unless the periods are edited', async () => {
    const chatham = { ...saved, timezone: 'Pacific/Chatham' }
    limitGet = () => Promise.resolve(chatham)
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...chatham, raw_cost_accounting: true })
    await flushPromises()
    await submit(w)
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...chatham, raw_cost_accounting: true })

    card(w).vm.$emit('update:modelValue', { ...chatham, raw_cost_accounting: true, period: 'month' })
    card(w).vm.$emit('update:modelValue', { ...chatham, raw_cost_accounting: true })
    await flushPromises()
    expect(card(w).props('modelValue').timezone).toBe(zone)
    await submit(w)
    expect(mocks.put).toHaveBeenCalledOnce()
  })

  it('keeps the card read-only and never saves a limit that did not load', async () => {
    limitGet = () => Promise.reject(new Error('network down'))
    const w = await open()
    expect(card(w).props()).toMatchObject({ status: 'failed', loadError: 'network down' })
    card(w).vm.$emit('update:modelValue', { ...saved, amount: '1' })
    await submit(w)
    expect(mocks.patch).toHaveBeenCalledOnce()
    expect(mocks.put).not.toHaveBeenCalled()

    limitGet = () => Promise.resolve(saved)
    card(w).vm.$emit('retry')
    await flushPromises()
    expect(card(w).props()).toMatchObject({ status: 'ready', modelValue: saved })
  })

  it('holds the card while the limit loads', async () => {
    let resolve!: (v: unknown) => void
    limitGet = () => new Promise((r) => (resolve = r))
    const w = await open()
    expect(card(w).props('status')).toBe('loading')
    await submit(w)
    expect(mocks.put).not.toHaveBeenCalled()
    resolve(saved)
    await flushPromises()
    expect(card(w).props()).toMatchObject({ status: 'ready', modelValue: saved })
  })

  it('reports a refused limit without failing the saved account', async () => {
    mocks.put.mockRejectedValue(new Error('period_count must be 1-12 for month'))
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...saved, amount: '300' })
    await submit(w)
    expect(mocks.toast).toHaveBeenCalledWith('账号已保存，但用量限制保存失败：period_count must be 1-12 for month', 'error')
    expect(w.emitted('saved')).toHaveLength(1)
  })

  it('checks the period length against its period before saving anything', async () => {
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...saved, period: 'month', period_count: 13 })
    await submit(w)
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(card(w).props('errors')).toEqual({ period_count: '周期长度必须为 1-12' })
    expect(w.getComponent(AccountEditorNav).props('errors').scheduling).toBe(true)
  })

  it.each([
    ['a newer core ("")', ''],
    ['an older core (UTC defaults)', 'UTC']
  ])('starts a limit the account never saved in the browser time zone: %s', async (_, timezone) => {
    const never = { raw_cost_accounting: false, enabled: false, amount: '0', period: 'month', period_count: 1, anchor: null, timezone }
    limitGet = () => Promise.resolve(never)
    const w = await open()
    expect(card(w).props('modelValue').timezone).toBe(zone)
    card(w).vm.$emit('update:modelValue', { ...card(w).props('modelValue'), enabled: true, amount: '50' })
    await submit(w)
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...never, enabled: true, amount: '50', timezone: zone })
  })

  it('saves a switched-off limit whose amount was cleared with the saved amount', async () => {
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...saved, enabled: false, amount: '' })
    await submit(w)
    expect(card(w).props('errors')).toEqual({})
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...saved, enabled: false, amount: '200' })
  })

  it('saves a lifetime limit whatever the hidden period length was', async () => {
    limitGet = () => Promise.resolve({ ...saved, period: 'month', period_count: 12 })
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...saved, period: 'none', period_count: 12 })
    await submit(w)
    expect(card(w).props('errors')).toEqual({})
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...saved, period: 'none', period_count: 1, timezone: zone })
  })

  it('saves an amount with more than 2 decimals (the card input takes step="any")', async () => {
    const w = await open()
    card(w).vm.$emit('update:modelValue', { ...saved, amount: '0.12345678' })
    await submit(w)
    expect(mocks.patch).toHaveBeenCalledOnce()
    expect(mocks.put).toHaveBeenCalledWith('/accounts/1/usage-limit', { ...saved, amount: '0.12345678' })
  })
})
