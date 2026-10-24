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
import { defaultRequestPolicy, mergeFeaturePolicy, normalizeRequestPolicy, type FeatureGroup, type RequestPolicy } from './requestPolicy'

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
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), useProxiesLookup: () => ({}) }))
enableAutoUnmount(afterEach)

const jsonCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
interface Saved { request_policy: Partial<RequestPolicy>; cc_feature_groups: Record<string, unknown>; feature_revision: number }
const savedConfig = (groups: Record<string, unknown>, policy: Partial<RequestPolicy> = defaultRequestPolicy()): Saved => ({ request_policy: policy, cc_feature_groups: groups, feature_revision: 5 })
const remoteConfig = (saved: Saved) => ({
  account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
  has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
  images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }, ...jsonCopy(saved),
})
const account = { id: 9, name: 'Account 9', group_ids: [3], proxy_id: 1, settings: { locale: 'en-US', timezone: 'UTC' }, models: [], model_mapping: {}, credentials: {} } as unknown as Account
const accountType = { plugin_key: 'ccgateway', type: 'apikey', form: { mode: 'schema' }, platforms: [], default_models: [], default_model_mapping: {} } as unknown as AccountType
// The account preview inherits group 3 over the global policy, as the core resolves it.
function inheritedForGroup3(): RequestPolicy {
  const global = normalizeRequestPolicy(saved.request_policy)
  const group = saved.cc_feature_groups[3] as FeatureGroup | undefined
  return group?.enabled ? mergeFeaturePolicy(global, group.overrides) : global
}
const preview = (draft: unknown) => ({ cc_feature_policy: jsonCopy(draft), effective: inheritedForGroup3(), inherited: inheritedForGroup3(), groups: [{ id: 3, name: 'Group 3' }], sources: {}, editable: true, disabled_reason: '', policy_revision: '5:3:8' })

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
    AccountFeatureSettings: false, RequestPolicySettings: false, BillingLayerCard: false, EnvironmentLayerCard: false, PromptLayerCard: false, SDisclosure: false, SSelect: false, SSegmented: false, SOptionMatrix: false, SChip: false, SSwitch: false,
    SSettingsGroup: { template: '<section><slot name="actions" /><slot /></section>' }, SSettingRow: { template: '<div><slot /></div>' },
    SCard: { template: '<div><slot name="title" /><slot name="actions" /><slot /></div>' }, SField: { template: '<div><slot /></div>' }, SHint: { template: '<p><slot /></p>' },
    SInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    SchemaForm: { template: '<div />', methods: { validate: () => true } },
  } } })
  await settle(); return w
}
// Radio groups (the level and billing segments, the folded field matrix): a
// field's cells follow its column order. `change` so a checked cell still counts.
async function pick(w: VueWrapper, testId: string, index: number) {
  if (testId.startsWith('build-attachment-') && !w.find(`[data-testid="${testId}"]`).exists()) await w.get('[data-testid="environment-convert-edit"] button').trigger('click')
  await w.get(`[data-testid="${testId}"]`).findAll('input')[index]!.trigger('change')
}
const level = (w: VueWrapper, value: string) => w.get(`[data-testid="request-level"] input[value="${value}"]`).trigger('change')
// Attachments and tools are toggle chips; the system prompt a switch.
const toggle = (w: VueWrapper, testId: string) => w.get(`[data-testid="${testId}"] button`).trigger('click')
// A group or an account follows or customizes each layer as a whole.
const layerMode = (w: VueWrapper, layer: string, mode: 'follow' | 'custom') => w.get(`[data-testid="layer-mode-${layer}"] input[value="${mode}"]`).trigger('change')
async function submit(w: VueWrapper) { await w.get('form').trigger('submit'); await flushPromises(); expect(submitted.length).toBeGreaterThan(0); return submitted.at(-1)! }
const clientEverywhere = { platform_name: 'client', os_version: 'client', shell: 'client', primary_directory: 'client', additional_directories: 'client', git_repository: 'client', worktree: 'client', scratchpad_directory: 'client', github_cli: 'client', agent_proxy: 'client' }

interface Case { name: string; layer: 'global' | 'group' | 'account'; group_id: number; saved: Saved; body: unknown; expect: Record<string, string> }
const cases: Case[] = []

// Expect keys read the resolved policy (the core's matrixValue): level and
// relay_mode are the resolved scalars; a build_injection key is the stored
// choice ("false" when unset), not what the level adds.
describe('editor payloads for the core contract', () => {
  it('records what each editor sends', async () => {
    // Global, untouched: the default policy (the low level) as the editor sends it back.
    let w = await remote('global')
    cases.push({ name: 'global-default', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'low', relay_mode: 'build', 'build_billing_sources.cc_version': 'client', 'build_attachment_sources.platform_name': 'client', build_billing_entrypoint: 'sdk-cli' } })
    w.unmount()

    // Global at the default level, every kind of source changed.
    w = await remote('global')
    await pick(w, 'billing-cc_version', 1)
    await pick(w, 'build-attachment-platform_name', 1)
    await pick(w, 'build-attachment-os_version', 2)
    // Selects: an option's value is its index (cli).
    await w.get('[data-testid="billing-entrypoint-select"]').setValue('0')
    await toggle(w, 'injection-attachments-environment')
    cases.push({ name: 'global-sources', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'low', relay_mode: 'build', 'build_billing_sources.cc_version': 'worker', 'build_attachment_sources.platform_name': 'worker', 'build_attachment_sources.os_version': 'erase',
        build_billing_entrypoint: 'cli', 'build_injection.attachments.environment': 'false' } })
    w.unmount()

    // Global at level 0: the billing header alone, its sources still editable.
    w = await remote('global')
    await level(w, 'none')
    await pick(w, 'billing-cc_version', 1)
    cases.push({ name: 'global-none', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'none', relay_mode: 'direct', 'build_billing_sources.cc_version': 'worker' } })
    w.unmount()

    // Global at micro: the identity line has no settings.
    w = await remote('global')
    await level(w, 'micro')
    cases.push({ name: 'global-micro', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'micro', relay_mode: 'build' } })
    w.unmount()

    // Global lowered from high to low, dropping the date attachment.
    saved = savedConfig({}, { ...defaultRequestPolicy(), level: 'high' })
    w = await remote('global')
    await level(w, 'low')
    await toggle(w, 'injection-attachments-date')
    cases.push({ name: 'global-low', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'low', relay_mode: 'build', 'build_injection.attachments.date': 'false' } })
    w.unmount()

    // Global at high: the prompt off, Agent added and Bash not.
    saved = savedConfig({})
    w = await remote('global')
    await level(w, 'high')
    await w.get('[data-testid="injection-system_prompt"]').setValue(false)
    await toggle(w, 'injection-tools-Agent')
    await toggle(w, 'injection-tools-Bash')
    cases.push({ name: 'global-high', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'high', relay_mode: 'build', 'build_injection.system_prompt': 'false', 'build_injection.tools.Agent': 'true', 'build_injection.tools.Bash': 'false' } })
    w.unmount()

    // Saved with identity lines (retired 2026-10-23): the editor sends the policy without them.
    saved = savedConfig({}, { ...defaultRequestPolicy(), level: 'micro', build_identity_lines: { cli: 'none', 'claude-vscode': 'official_cli' } } as Partial<RequestPolicy>)
    w = await remote('global')
    const retired = await submit(w)
    expect(retired.request_policy).not.toHaveProperty('build_identity_lines')
    cases.push({ name: 'global-identity-lines-dropped', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: retired,
      expect: { level: 'micro', relay_mode: 'build' } })
    w.unmount()

    // Saved before levels with a relay mode only: the editor sends the level
    // features.LegacyLevel gives it, and no relay mode.
    saved = savedConfig({}, { relay_mode: 'direct' })
    w = await remote('global')
    const legacy = await submit(w)
    expect(legacy.request_policy).not.toHaveProperty('relay_mode')
    cases.push({ name: 'global-legacy-direct', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: legacy,
      expect: { level: 'none', relay_mode: 'direct' } })
    w.unmount()
    // Legacy build converting the platform is low, with the attachments it never added written as off.
    saved = savedConfig({}, { relay_mode: 'build', build_attachment_sources: { platform_name: 'worker' } })
    w = await remote('global')
    cases.push({ name: 'global-legacy-build', layer: 'global', group_id: 0, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'low', relay_mode: 'build', 'build_attachment_sources.platform_name': 'worker', 'build_injection.attachments.environment': 'false', 'build_injection.attachments.date': 'false' } })
    w.unmount()

    // Group 3 customizes the billing and environment layers over a global
    // that converts the platform: each customized layer is written whole.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: {} } }, { ...defaultRequestPolicy(), build_attachment_sources: { platform_name: 'worker' } })
    w = await remote('group')
    await layerMode(w, 'billing', 'custom')
    await pick(w, 'billing-cc_entrypoint', 1)
    await layerMode(w, 'environment', 'custom')
    await toggle(w, 'injection-attachments-date')
    let body = await submit(w)
    expect(body.cc_feature_groups[3].overrides).toEqual({
      build_billing_entrypoint: 'sdk-cli', build_billing_sources: { cc_version: 'client', cc_entrypoint: 'worker' },
      build_attachment_sources: { ...clientEverywhere, platform_name: 'worker' }, build_injection: { attachments: { environment: true, model: true, total_tokens: true, date: false } }
    })
    cases.push({ name: 'group-layers', layer: 'group', group_id: 3, saved: jsonCopy(saved), body,
      expect: { level: 'low', 'build_billing_sources.cc_entrypoint': 'worker', 'build_billing_sources.cc_version': 'client', build_billing_entrypoint: 'sdk-cli',
        'build_attachment_sources.platform_name': 'worker', 'build_attachment_sources.shell': 'client', 'build_injection.attachments.date': 'false', 'build_injection.attachments.model': 'true' } })
    w.unmount()

    // Group 3 raises its own level over the global low and customizes the
    // prompt layer: the default tools become explicit, Agent added.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: {} } })
    w = await remote('group')
    await layerMode(w, 'level', 'custom')
    await level(w, 'high')
    await layerMode(w, 'prompt', 'custom')
    await toggle(w, 'injection-tools-Agent')
    body = await submit(w)
    expect(body.cc_feature_groups[3].overrides).toEqual({ level: 'high', build_injection: { system_prompt: true, tools: { Bash: true, Read: true, Edit: true, Write: true, Agent: true, WebSearch: false, NotebookEdit: false } } })
    cases.push({ name: 'group-level', layer: 'group', group_id: 3, saved: jsonCopy(saved), body,
      expect: { level: 'high', relay_mode: 'build', 'build_injection.system_prompt': 'true', 'build_injection.tools.Agent': 'true', 'build_injection.tools.Bash': 'true', 'build_injection.tools.WebSearch': 'false' } })
    w.unmount()

    // Group 3 sets billing back to follow: only that layer's keys go, the
    // level and a saved identity line choice (retired) are handled on their own.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { level: 'high', build_billing_sources: { cc_version: 'worker' }, build_identity_lines: { cli: 'none' } } } })
    w = await remote('group')
    await layerMode(w, 'billing', 'follow')
    body = await submit(w)
    expect(body.cc_feature_groups[3].overrides).toEqual({ level: 'high' })
    cases.push({ name: 'group-follow-billing', layer: 'group', group_id: 3, saved: jsonCopy(saved), body,
      expect: { level: 'high', relay_mode: 'build', 'build_billing_sources.cc_version': 'client' } })
    w.unmount()

    // A group override saved before levels (relay mode only) goes back untouched
    // and resolves as the core migrates it; it counts as a customized level.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { relay_mode: 'direct' } } })
    w = await remote('group')
    expect(w.get<HTMLInputElement>('[data-testid="request-level"] input[value="none"]').element.checked).toBe(true)
    expect(w.get<HTMLInputElement>('[data-testid="layer-mode-level"] input[value="custom"]').element.checked).toBe(true)
    cases.push({ name: 'group-legacy-direct', layer: 'group', group_id: 3, saved: jsonCopy(saved), body: await submit(w),
      expect: { level: 'none', relay_mode: 'direct' } })
    w.unmount()

    // Account 9 (in group 3) customizes billing over the group's: the whole
    // layer is written, so the group's entrypoint source no longer applies
    // unless copied.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { build_billing_sources: { cc_entrypoint: 'worker' } } } })
    let editor = await accountEditor()
    await layerMode(editor, 'billing', 'custom'); await settle()
    await pick(editor, 'billing-cc_version', 1); await settle()
    await pick(editor, 'billing-cc_entrypoint', 0); await settle()
    await editor.get('[data-testid="billing-entrypoint-select"]').setValue('5'); await settle()
    body = await submit(editor)
    expect(mocks.patch).toHaveBeenLastCalledWith('/accounts/9', expect.anything())
    expect(body.cc_feature_policy.overrides).toEqual({ build_billing_entrypoint: 'claude-vscode', build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' } })
    cases.push({ name: 'account-billing', layer: 'account', group_id: 3, saved: jsonCopy(saved), body: body.cc_feature_policy,
      expect: { 'build_billing_sources.cc_entrypoint': 'client', 'build_billing_sources.cc_version': 'worker', build_billing_entrypoint: 'claude-vscode' } })
    editor.unmount()

    // Account 9 lowers its own level to micro under a group at high.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { level: 'high' } } })
    editor = await accountEditor()
    await layerMode(editor, 'level', 'custom'); await settle()
    await level(editor, 'micro'); await settle()
    body = await submit(editor)
    expect(body.cc_feature_policy.overrides).toEqual({ level: 'micro' })
    cases.push({ name: 'account-level', layer: 'account', group_id: 3, saved: jsonCopy(saved), body: body.cc_feature_policy,
      expect: { level: 'micro', relay_mode: 'build' } })
    editor.unmount()

    // Account 9 customizes the prompt layer under a group at high, dropping Bash.
    saved = savedConfig({ 3: { enabled: true, allow_account_override: true, overrides: { level: 'high' } } })
    editor = await accountEditor()
    await layerMode(editor, 'prompt', 'custom'); await settle()
    await toggle(editor, 'injection-tools-Bash'); await settle()
    body = await submit(editor)
    expect(body.cc_feature_policy.overrides).toEqual({ build_injection: { system_prompt: true, tools: { Bash: false, Read: true, Edit: true, Write: true, Agent: false, WebSearch: false, NotebookEdit: false } } })
    cases.push({ name: 'account-prompt', layer: 'account', group_id: 3, saved: jsonCopy(saved), body: body.cc_feature_policy,
      expect: { level: 'high', 'build_injection.system_prompt': 'true', 'build_injection.tools.Bash': 'false', 'build_injection.tools.Read': 'true' } })

    // No editor writes the retired identity lines any more.
    for (const c of cases) expect(JSON.stringify(c.body), c.name).not.toContain('build_identity_lines')

    const generated = JSON.stringify({ cases }, null, 2) + '\n'
    if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) writeFileSync(fixturePath, generated)
    expect(JSON.parse(readFileSync(fixturePath, 'utf8')), 'editor payloads changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1 and run the core contract test').toEqual(JSON.parse(generated))
  // Seventeen editor mounts in one test: past the 5 s default under a full parallel run.
  }, 60000)
})
