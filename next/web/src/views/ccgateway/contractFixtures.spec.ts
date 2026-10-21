/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, shallowMount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { i18n } from '@/i18n'
import type { Account, AccountType } from '@/api/types'
import RemoteSettings from './RemoteSettings.vue'
import AccountEditor from '../accounts/AccountEditor.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

// Producer half of a cross-layer contract: what the actual editors send is
// recorded in a fixture that the core decodes with its own validator
// (server/internal/ccgateway contract_fixture_test.go). Each side only passes
// while the other accepts the same bytes. Regenerate with
// CCG_UPDATE_CONTRACT_FIXTURES=1 after an intended payload change.
// Vitest runs from next/web.
const fixturePath = resolve(process.cwd(), '../plugins/ccgateway/companions/contracts/testdata/web-policy-payloads.json')

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', () => ({ api: mocks, isApiError: () => false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ plugin: () => null, component: () => null }), assetURL: () => '' }))
vi.mock('@/composables/useOwnership', async original => ({ ...await original<typeof import('@/composables/useOwnership')>(), useOwnership: () => ({ can: () => true }) }))
vi.mock('@/composables/lookups', () => ({ useProxiesLookup: () => ({}) }))
enableAutoUnmount(afterEach)

const jsonCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
interface Saved { request_policy: RequestPolicy; cc_feature_groups: Record<string, unknown>; feature_revision: number }
const savedConfig = (groups: Record<string, unknown>): Saved => ({ request_policy: defaultRequestPolicy(), cc_feature_groups: groups, feature_revision: 5 })
const remoteConfig = (saved: Saved) => ({
  account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
  has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
  images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }, ...jsonCopy(saved),
})
const account = { id: 9, name: 'Account 9', group_ids: [3], proxy_id: 1, settings: { locale: 'en-US', timezone: 'UTC' }, models: [], model_mapping: {}, credentials: {} } as unknown as Account
const accountType = { plugin_key: 'ccgateway', type: 'apikey', form: { mode: 'schema' }, platforms: [], default_models: [], default_model_mapping: {} } as unknown as AccountType
const preview = (draft: unknown) => ({ cc_feature_policy: jsonCopy(draft), effective: defaultRequestPolicy(), inherited: defaultRequestPolicy(), groups: [{ id: 3, name: 'Group 3' }], sources: {}, editable: true, disabled_reason: '', policy_revision: '5:3:8' })

let saved: Saved
let submitted: Record<string, any>[]
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); i18n.global.locale.value = 'zh'
  saved = savedConfig({}); submitted = []
  mocks.get.mockImplementation(async (path: string) => {
    if (path === '/system/ccgateway/remote-config') return remoteConfig(saved)
    if (path.endsWith('/cc-features')) return preview({ mode: 'custom', overrides: {}, revision: 8 })
    if (path === '/accounts/auto-disable') return { enabled: true }
    if (path.endsWith('/form')) return { schema: { type: 'object' } }
    return { expected: {}, installed: { version: 'fixture' } }
  })
  mocks.list.mockResolvedValue({ items: [{ id: 3, name: 'Group 3' }], paged: false })
  mocks.put.mockImplementation(async (_path, body) => { submitted.push(jsonCopy(body)); return jsonCopy(body) })
  mocks.post.mockImplementation(async (_path, body) => preview(body.cc_feature_policy))
  mocks.patch.mockImplementation(async (_path, body) => { submitted.push(jsonCopy(body)); return { ...account, ...jsonCopy(body) } })
})
afterEach(() => vi.useRealTimers())

async function settle() { await flushPromises(); await vi.advanceTimersByTimeAsync(200); await flushPromises() }
async function remote(layer: 'global' | 'group') {
  const w = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()], stubs: { teleport: true } } }); await flushPromises()
  await w.findAll('[data-testid="settings-tabs"] [role="tab"]')[2].trigger('click')
  if (layer === 'group') {
    await w.get('[data-testid="feature-layer"] input[value="group"]').setValue(true); await flushPromises()
    await w.get('[data-testid="group-policy-3"] [data-testid="group-configure"]').trigger('click')
  }
  return w
}
async function accountEditor() {
  const w = shallowMount(AccountEditor, { props: { account, accountType }, global: { plugins: [i18n], stubs: {
    AccountFeatureSettings: false, RequestPolicySettings: false, SDisclosure: false, SSelect: false, SSegmented: false, SOptionMatrix: false,
    SSettingsGroup: { template: '<section><slot /></section>' }, SSettingRow: { template: '<div><slot /></div>' },
    SCard: { template: '<div><slot name="title" /><slot name="actions" /><slot /></div>' }, SField: { template: '<div><slot /></div>' }, SHint: { template: '<p><slot /></p>' },
    SInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    SchemaForm: { template: '<div />', methods: { validate: () => true } },
  } } })
  await settle(); return w
}
// Radio matrices: a field's cells follow its column order (layered editors
// start with follow). `change` so an already checked cell still counts.
const pick = (w: VueWrapper, testId: string, index: number) => w.get(`[data-testid="${testId}"]`).findAll('input')[index]!.trigger('change')
async function submit(w: VueWrapper) { await w.get('form').trigger('submit'); await flushPromises(); expect(submitted.length).toBeGreaterThan(0); return submitted.at(-1)! }

interface Case { name: string; layer: 'global' | 'group' | 'account'; group_id: number; saved: Saved; body: unknown; expect: Record<string, string> }
const cases: Case[] = []

describe('editor payloads for the core contract', () => {
  it('records what each editor sends', async () => {
    // Global, untouched: the default policy as the editor sends it back.
    let w = await remote('global')
    cases.push({ name: 'global-default', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { relay_mode: 'build', 'build_billing_sources.cc_version': 'client', 'build_attachment_sources.platform_name': 'client' } })
    w.unmount()

    // Global, every kind of source changed.
    w = await remote('global')
    await pick(w, 'billing-cc_version', 1)
    await pick(w, 'build-attachment-platform_name', 1)
    await pick(w, 'build-attachment-os_version', 2)
    cases.push({ name: 'global-sources', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { relay_mode: 'build', 'build_billing_sources.cc_version': 'worker', 'build_attachment_sources.platform_name': 'worker', 'build_attachment_sources.os_version': 'erase' } })
    w.unmount()

    // Global, switched to direct: a pure passthrough with nothing to set.
    w = await remote('global')
    await w.get('[data-testid="relay-mode"]').setValue('0')
    cases.push({ name: 'global-direct', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { relay_mode: 'direct' } })
    w.unmount()

    // Group 3 overrides billing over the default global policy.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: {} } })
    w = await remote('group')
    await pick(w, 'billing-cc_entrypoint', 2)
    cases.push({ name: 'group-sources', layer: 'group', group_id: 3, saved: jsonCopy(saved), body: await submit(w),
      expect: { 'build_billing_sources.cc_entrypoint': 'worker', 'build_billing_sources.cc_version': 'client' } })
    w.unmount()

    // Account 9 (in group 3) customizes billing over the group's.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { build_billing_sources: { cc_entrypoint: 'worker' } } } })
    const editor = await accountEditor()
    await pick(editor, 'billing-cc_version', 2); await settle()
    const body = await submit(editor)
    expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/9', expect.anything())
    expect(body.cc_feature_policy).toBeDefined()
    cases.push({ name: 'account-sources', layer: 'account', group_id: 3, saved: jsonCopy(saved), body: body.cc_feature_policy,
      expect: { 'build_billing_sources.cc_entrypoint': 'worker', 'build_billing_sources.cc_version': 'worker' } })

    const generated = JSON.stringify({ cases }, null, 2) + '\n'
    if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) writeFileSync(fixturePath, generated)
    expect(JSON.parse(readFileSync(fixturePath, 'utf8')), 'editor payloads changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1 and run the core contract test').toEqual(JSON.parse(generated))
  })
})
