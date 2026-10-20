import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import type { Account, AccountType } from '@/api/types'
import RemoteSettings from './RemoteSettings.vue'
import AccountEditor from '../accounts/AccountEditor.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

// Explicit audit matrix, intentionally independent from the production field list.
const rows = [
  ['build_billing_sources', 'cc_version', 'billing-cc_version', ['client', 'worker']],
  ['build_billing_sources', 'cc_entrypoint', 'billing-cc_entrypoint', ['client', 'worker']],
  ['build_attachment_sources', 'platform_name', 'build-attachment-platform_name', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'os_version', 'build-attachment-os_version', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'shell', 'build-attachment-shell', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'primary_directory', 'build-attachment-primary_directory', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'additional_directories', 'build-attachment-additional_directories', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'git_repository', 'build-attachment-git_repository', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'worktree', 'build-attachment-worktree', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'scratchpad_directory', 'build-attachment-scratchpad_directory', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'github_cli', 'build-attachment-github_cli', ['client', 'worker', 'erase']],
  ['build_attachment_sources', 'agent_proxy', 'build-attachment-agent_proxy', ['client', 'worker', 'erase']],
] as const
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ plugin: () => null, component: () => null }), assetURL: () => '' }))
vi.mock('@/composables/useOwnership', async original => ({ ...await original<typeof import('@/composables/useOwnership')>(), useOwnership: () => ({ can: () => true }) }))
vi.mock('@/composables/lookups', () => ({ useProxiesLookup: () => ({}) }))
enableAutoUnmount(afterEach)
const jsonCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const allWorker = () => ({ build_attachment_sources: Object.fromEntries(rows.filter(row => row[0] === 'build_attachment_sources').map(row => [row[1], 'worker'])), build_billing_sources: { cc_version: 'worker' as const, cc_entrypoint: 'worker' as const } })
const config = () => ({
  account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
  has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
  request_policy: defaultRequestPolicy(), images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }, feature_revision: 5,
  cc_feature_groups: { 3: { enabled: true, allow_account_override: true, overrides: allWorker() } },
})
const saved = { id: 9, name: 'Account 9', group_ids: [3], proxy_id: 1, settings: { locale: 'en-US', timezone: 'UTC' }, models: [], model_mapping: {}, credentials: {} } as unknown as Account
const accountType = { plugin_key: 'ccgateway', type: 'apikey', form: { mode: 'schema' }, platforms: [], default_models: [], default_model_mapping: {} } as unknown as AccountType
const savedAccountPolicy = () => ({ mode: 'custom', overrides: allWorker(), revision: 8 })
function preview(draft = savedAccountPolicy(), effective: RequestPolicy = { ...defaultRequestPolicy(), ...draft.overrides }) {
  return { cc_feature_policy: jsonCopy(draft), effective, inherited: defaultRequestPolicy(), groups: [{ id: 3, name: 'Group 3' }], sources: {}, editable: true, disabled_reason: '', policy_revision: '5:3:8' }
}
let stored: ReturnType<typeof config>
let submitted: Record<string, any>[]
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); i18n.global.locale.value = 'zh'
  stored = config(); submitted = []
  mocks.get.mockImplementation(async (path: string) => {
    if (path === '/system/ccgateway/remote-config') return jsonCopy(stored)
    if (path.endsWith('/cc-features')) return preview()
    if (path === '/accounts/auto-disable') return { enabled: true }
    if (path.endsWith('/form')) return { schema: { type: 'object' } }
    return { expected: {}, installed: { version: 'fixture' } }
  })
  mocks.list.mockResolvedValue({ items: [{ id: 3, name: 'Group 3' }], paged: false })
  mocks.put.mockImplementation(async (_path, body) => { submitted.push(jsonCopy(body)); stored = { ...stored, ...jsonCopy(body) }; return jsonCopy(stored) })
  mocks.post.mockImplementation(async (_path, body) => preview(body.cc_feature_policy))
  mocks.patch.mockImplementation(async (_path, body) => { submitted.push(jsonCopy(body)); return { ...saved, ...jsonCopy(body) } })
})
afterEach(() => vi.useRealTimers())
async function settlePreview() { await flushPromises(); await vi.advanceTimersByTimeAsync(200); await flushPromises() }
async function remote(layer: 'global' | 'group') {
  const w = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()] } }); await flushPromises()
  await w.findAll('[data-testid="settings-tabs"] [role="tab"]')[2].trigger('click')
  if (layer === 'group') { await w.get('[data-testid="feature-layer"] input[value="group"]').setValue(true); await flushPromises() }
  return w
}
async function account() {
  const w = shallowMount(AccountEditor, { props: { account: saved, accountType }, global: { plugins: [i18n], stubs: {
    AccountFeatureSettings: false, RequestPolicySettings: false, SDisclosure: false, SSelect: false, SSegmented: false,
    SSettingsGroup: { template: '<section><slot /></section>' }, SSettingRow: { template: '<div><slot /></div>' },
    SCard: { template: '<div><slot name="title" /><slot name="actions" /><slot /></div>' }, SField: { template: '<div><slot /></div>' }, SHint: { template: '<p><slot /></p>' },
    SInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    SchemaForm: { template: '<div />', methods: { validate: () => true } },
  } } })
  await settlePreview(); return w
}
async function submit(w: VueWrapper) { await w.get('form').trigger('submit'); await flushPromises(); expect(submitted.length).toBeGreaterThan(0); return submitted.at(-1)! }

for (const layer of ['global', 'group'] as const) describe(`${layer} field payload matrix`, () => {
  it.each(rows)('%s.%s writes every allowed source and preserves other fields', async (section, field, testId, sources) => {
    const w = await remote(layer)
    const options = [...(layer === 'group' ? ['follow'] : []), ...sources]
    expect(w.get<HTMLSelectElement>(`[data-testid="${testId}"]`).element.options).toHaveLength(options.length)
    for (const source of [...sources, ...(layer === 'group' ? ['follow'] : [])]) {
      const before = jsonCopy(layer === 'global' ? stored.request_policy : stored.cc_feature_groups[3].overrides)
      await w.get(`[data-testid="${testId}"]`).setValue(String(options.indexOf(source)))
      const body = await submit(w)
      const sent = layer === 'global' ? body.request_policy : body.cc_feature_groups[3].overrides
      const expected = { ...(before[section] as Record<string, string>) }
      if (source === 'follow') delete expected[field]
      else expected[field] = source
      expect(sent[section]).toEqual(expected)
      const other = section === 'build_billing_sources' ? 'build_attachment_sources' : 'build_billing_sources'
      expect(sent[other]).toEqual(before[other])
      expect(body.feature_revision).toBe(5)
      if (layer === 'group') expect(body.request_policy).toEqual(defaultRequestPolicy())
    }
  })
})

describe('account field payload matrix', () => {
  it.each(rows)('%s.%s flows through preview and the atomic account PATCH for all sources', async (section, field, testId, sources) => {
    const w = await account(), options = ['follow', ...sources]
    // Keep an independent explicit edit so selecting the original worker value
    // still participates in an actual PATCH rather than the unchanged-policy omission.
    await w.get('[data-testid="relay-mode"]').setValue('2'); await settlePreview()
    for (const source of [...sources, 'follow']) {
      await w.get(`[data-testid="${testId}"]`).setValue(String(options.indexOf(source))); await settlePreview()
      const draft = jsonCopy(mocks.post.mock.calls.at(-1)![1].cc_feature_policy)
      if (source === 'follow') expect(draft.overrides[section]).not.toHaveProperty(field)
      else expect(draft.overrides[section][field]).toBe(source)
      const body = await submit(w)
      expect(body.cc_feature_policy).toEqual(draft)
      expect(body.cc_feature_policy.revision).toBe(8)
      expect(body.name).toBe('Account 9')
      expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/9', expect.anything())
    }
  })

  it('switching to follow clears all twelve overrides in the actual account PATCH', async () => {
    const w = await account()
    await w.get('[data-testid="account-feature-mode"] input[value="follow"]').setValue(true); await settlePreview()
    expect((await submit(w)).cc_feature_policy).toEqual({ mode: 'follow', overrides: {}, revision: 8 })
  })

  it('direct keeps all source values in the saved draft and disables all twelve selectors', async () => {
    const w = await account()
    mocks.post.mockImplementation(async (_path, body) => preview(body.cc_feature_policy, { ...defaultRequestPolicy(), relay_mode: 'direct' }))
    await w.get('[data-testid="relay-mode"]').setValue('1'); await settlePreview()
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(true)
    const body = await submit(w)
    expect(body.cc_feature_policy.overrides).toEqual({ ...allWorker(), relay_mode: 'direct' })
  })

  it.each(['no_group', 'group_unconfigured', 'group_disabled', 'account_override_disabled'])('read-only %s shows the effective values and does not resubmit dormant overrides', async reason => {
    mocks.post.mockImplementation(async (_path, body) => ({ ...preview(body.cc_feature_policy, defaultRequestPolicy()), editable: false, disabled_reason: reason }))
    const w = await account()
    for (const row of rows) {
      const select = w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element
      expect(select.disabled).toBe(true)
      expect(select.selectedOptions[0].textContent).toBe('保留客户端')
    }
    expect((await submit(w)).cc_feature_policy).toBeUndefined()
    expect(mocks.post.mock.calls.at(-1)![1].cc_feature_policy.overrides).toEqual(allWorker())
  })
})

describe('group switches and inactive values', () => {
  it('global direct saves all twelve choices unchanged and restores them after returning to build', async () => {
    stored.request_policy = { ...defaultRequestPolicy(), ...allWorker() }
    const w = await remote('global')
    await w.get('[data-testid="relay-mode"]').setValue('0')
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(true)
    let body = await submit(w)
    expect(body.request_policy).toMatchObject({ relay_mode: 'direct', ...allWorker() })
    await w.get('[data-testid="relay-mode"]').setValue('1')
    for (const row of rows) {
      const select = w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element
      expect(select.disabled).toBe(false)
      expect(select.selectedOptions[0].textContent).toBe('使用服务端')
    }
    body = await submit(w)
    expect(body.request_policy).toMatchObject({ relay_mode: 'build', ...allWorker() })
  })
  it('both switches write independently and disabling group coverage keeps its whole draft', async () => {
    const w = await remote('group')
    await w.get('[data-testid="group-allow-account"]').setValue(false)
    let body = await submit(w)
    expect(body.cc_feature_groups[3]).toEqual({ enabled: true, allow_account_override: false, overrides: allWorker() })
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(false)
    await w.get('[data-testid="group-enabled"]').setValue(false)
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(true)
    body = await submit(w)
    expect(body.cc_feature_groups[3]).toEqual({ enabled: false, allow_account_override: false, overrides: allWorker() })
    expect(w.get<HTMLInputElement>('[data-testid="group-allow-account"]').element.disabled).toBe(true)
    await w.get('[data-testid="group-enabled"]').setValue(true)
    await w.get('[data-testid="group-allow-account"]').setValue(true)
    expect((await submit(w)).cc_feature_groups[3]).toEqual({ enabled: true, allow_account_override: true, overrides: allWorker() })
  })
  it('group direct retains all twelve choices and switching back restores their editability', async () => {
    const w = await remote('group')
    await w.get('[data-testid="relay-mode"]').setValue('1')
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(true)
    expect((await submit(w)).cc_feature_groups[3].overrides).toEqual({ ...allWorker(), relay_mode: 'direct' })
    await w.get('[data-testid="relay-mode"]').setValue('2')
    for (const row of rows) expect(w.get<HTMLSelectElement>(`[data-testid="${row[2]}"]`).element.disabled).toBe(false)
    expect((await submit(w)).cc_feature_groups[3].overrides).toEqual({ ...allWorker(), relay_mode: 'build' })
  })
})
