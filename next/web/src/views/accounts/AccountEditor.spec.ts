import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Account, AccountType } from '@/api/types'
import AccountEditor from './AccountEditor.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import CCGatewayAccountAuth from '@/views/ccgateway/CCGatewayAccountAuth.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), list: vi.fn().mockResolvedValue({ items: [] }) }))
vi.mock('@sub2api/host', () => ({ api: mocks }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ plugin: () => null, component: () => null }), assetURL: () => '' }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/composables/useOwnership', async original => ({ ...await original<typeof import('@/composables/useOwnership')>(), useOwnership: () => ({ can: () => true }) }))
vi.mock('@/composables/lookups', () => ({ useProxiesLookup: () => ({}) }))

enableAutoUnmount(afterEach)
const accountType = { plugin_key: 'ccgateway', type: 'apikey', creation_group: 'ccgateway', form: { mode: 'schema' }, platforms: [], default_models: [], default_model_mapping: {} } as unknown as AccountType
const location = { ip: '8.8.8.8', country_code: 'US', timezone: 'America/Los_Angeles' }

function render(account?: Account, realSelect = false) {
  return shallowMount(AccountEditor, { props: { accountType, account }, global: { plugins: [i18n], stubs: {
    EditorCard: { template: '<div><slot /></div>' },
    SField: { template: '<div><slot /></div>' },
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

  it('prefills from the selected proxy, then allows manual overrides and submits them', async () => {
    const w = render(savedAccount())
    await chooseProxy(w, 20)
    expect(value(w, 'locale')).toBe('en-US')
    expect(value(w, 'timezone')).toBe('America/Los_Angeles')
    await w.get('[data-testid="container-locale"]').setValue('zh-CN')
    await w.get('[data-testid="container-timezone"]').setValue('Asia/Shanghai')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/accounts/1', expect.objectContaining({ settings: { locale: 'zh-CN', timezone: 'Asia/Shanghai' }, proxy_id: 20 }))
    await chooseProxy(w, 21)
    expect(value(w, 'locale')).toBe('en-US')
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
    await w.get('[data-testid="proxy-mode-url"]').trigger('click')
    await w.get('[data-testid="container-locale"]').setValue('ja-JP')
    await w.get('[data-testid="container-timezone"]').setValue('Asia/Tokyo')
    await w.setProps({ accountType: { ...accountType, type: 'managed' } })
    await flushPromises()
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(10)
    expect(value(w, 'locale')).toBe('en-US')
    expect(value(w, 'timezone')).toBe(location.timezone)
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/location'))).toHaveLength(2)
  })

  it('restores saved values without probing when a refresh discards an unsaved proxy change', async () => {
    const w = render(savedAccount())
    await chooseProxy(w, 20)
    expect(value(w, 'locale')).toBe('en-US')
    await w.setProps({ account: { ...savedAccount(), models: ['updated-model'] } })
    await flushPromises()
    expect(w.getComponent(ProxyPicker).props('modelValue')).toBe(10)
    expect(value(w, 'locale')).toBe('ja-JP')
    expect(value(w, 'timezone')).toBe('Asia/Tokyo')
    expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/location'))).toHaveLength(1)
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
    expect(select.findAll('[role="option"]')).toHaveLength(1)
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
