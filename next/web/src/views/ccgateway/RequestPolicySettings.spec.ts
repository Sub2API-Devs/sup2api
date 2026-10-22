import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), list: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/host', () => ({ api: mocks }))

// A connected controller (per-account containers are the only mode, CONTRACTS §53.9): saving
// other settings sends the endpoint back unchanged.
function config(policy: Partial<RequestPolicy> | undefined) {
  return {
    account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
    has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
    request_policy: policy, images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }
  }
}
const TABS = ['connection', 'network', 'cc', 'deployment'] as const
const tab = (w: VueWrapper, key: (typeof TABS)[number]) => w.findAll('[data-testid="settings-tabs"] [role="tab"]')[TABS.indexOf(key)]
// The source columns became one radio matrix: a row is a radiogroup keyed by the
// field, and its cells follow the column order (client, worker, erase).
const radios = (w: VueWrapper, sel: string) => w.get(sel).findAll('input')
const picked = (w: VueWrapper, sel: string) => radios(w, sel).findIndex(i => (i.element as HTMLInputElement).checked)
const pick = (w: VueWrapper, sel: string, index: number) => radios(w, sel)[index]!.setValue(true)

describe('CCGateway single-request modes', () => {
  beforeEach(() => { vi.resetAllMocks(); i18n.global.locale.value = 'zh' })
  async function render() {
    const w = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()], stubs: { teleport: true } } })
    await flushPromises()
    await tab(w, 'cc').trigger('click')
    return w
  }
  it('preserves disabled group drafts and sends revision with the settings transaction', async () => {
    const saved = { ...config(defaultRequestPolicy()), feature_revision: 12, cc_feature_groups: { 3: { enabled: true, allow_account_override: true, overrides: { build_billing_sources: { cc_version: 'worker' } } } } }
    mocks.get.mockResolvedValue(saved)
    mocks.list.mockResolvedValue({ items: [{ id: 3, name: 'Group 3' }], paged: false })
    mocks.put.mockResolvedValue(saved)
    const w = await render()
    await w.get('[data-testid="feature-layer"] input[value="group"]').setValue(true)
    await flushPromises()
    await w.get('[data-testid="group-policy-3"] [data-testid="group-configure"]').trigger('click')
    await w.get('[data-testid="group-enabled"]').setValue(false)
    expect(w.find('[data-testid="billing-cc_version"]').exists()).toBe(false)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ feature_revision: 12, cc_feature_groups: { 3: { enabled: false, allow_account_override: true, overrides: { build_billing_sources: { cc_version: 'worker' } } } } }), expect.anything())
    w.unmount()
  })
  it('offers only direct and build, defaults to build and hides removed agent controls', async () => {
    mocks.get.mockResolvedValue(config(undefined))
    const w = await render()
    const select = w.get<HTMLSelectElement>('[data-testid="relay-mode"]').element
    expect(Array.from(select.options).filter(o => !o.disabled).map(o => o.textContent)).toHaveLength(2)
    expect(select.options[select.selectedIndex].textContent).toContain('build')
    expect(w.get('[data-testid="cli-request-mode"]').text()).not.toContain('native')
    for (const id of ['tool-search', 'client-attachments', 'custom-tool-prefix', 'thinking-disabled-compat', 'unknown-field']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    w.unmount()
  })
  it.each(['direct', 'build'] as const)('saves %s with a pinned CLI version', async mode => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="relay-mode"]').setValue(mode === 'direct' ? '0' : '1')
    mocks.put.mockResolvedValue(config({...defaultRequestPolicy(), relay_mode: mode}))
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({request_policy:expect.objectContaining({relay_mode:mode,cli_version:'2.1.304'})}),expect.anything())
    w.unmount()
  })
  // The core accepts request policy schema 1 only (contracts/features
  // PolicySchemaVersion); an edited global policy must still decode there.
  it('never sends a request policy schema the core rejects', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), schema_version: 1 }))
    const w = await render()
    await pick(w, '[data-testid="billing-cc_version"]', 1)
    await w.get('[data-testid="relay-mode"]').setValue('0')
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    const sent = mocks.put.mock.calls[0]![1].request_policy
    expect([undefined, 1]).toContain(sent.schema_version)
    w.unmount()
  })
  // Direct fills only the billing header and the identity line by entrypoint;
  // build also replaces the user_id on its own, so the identity has no setting
  // in either mode (2026-10-21/22 decisions).
  it('shows what each mode does on its own and offers no identity setting', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), relay_mode: 'direct' }))
    const w = await render()
    expect(w.get('[data-testid="direct-hint"]').text()).toContain('只补缺的计费头')
    for (const id of ['billing-cc_version', 'build-attachments', 'identity-sources', 'auto-user-id', 'auto-prefix']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    for (const id of ['billing-entrypoint', 'identity-lines']) expect(w.find(`[data-testid="${id}"]`).exists()).toBe(true)
    await w.get('[data-testid="relay-mode"]').setValue('1')
    expect(w.find('[data-testid="direct-hint"]').exists()).toBe(false)
    expect(w.get('[data-testid="auto-user-id"]').text()).toContain('有就自动替换，没有不加')
    expect(w.get('[data-testid="auto-prefix"]').text()).toContain('按计费头入口补上')
    expect(w.find('[data-testid="identity-sources"]').exists()).toBe(false)
    const billing = w.get('[data-testid="billing-sources"]').text()
    expect(billing).toContain('计费头')
    expect(billing).toContain('客户端，没有用服务端')
    expect(picked(w, '[data-testid="billing-cc_version"]')).toBe(0)
    w.unmount()
  })
  // Each entrypoint offers only the lines real clients send with it, plus
  // none; defaults are what those clients send (2026-10-22).
  it('picks the server entrypoint and each entrypoint identity line from its own choices', async () => {
    let stored = config(defaultRequestPolicy())
    mocks.get.mockImplementation(async () => structuredClone(stored))
    mocks.put.mockImplementation(async (_url, body) => {
      stored = config(JSON.parse(JSON.stringify(body.request_policy)))
      return structuredClone(stored)
    })
    let w = await render()
    const select = (id: string) => w.get<HTMLSelectElement>(`[data-testid="${id}"]`).element
    const options = (id: string) => Array.from(select(id).options).filter(o => !o.disabled).map(o => o.textContent?.trim())
    const chosen = (id: string) => select(id).options[select(id).selectedIndex]?.textContent?.trim()
    expect(options('billing-entrypoint-select')).toEqual(['cli', 'sdk-cli', 'sdk-ts', 'sdk-py', 'claude-desktop', 'claude-vscode'])
    expect(chosen('billing-entrypoint-select')).toBe('sdk-cli')
    expect(options('identity-line-select-cli')).toEqual(['Claude Code CLI（终端）', '不补'])
    expect(options('identity-line-select-sdk-ts')).toEqual(['Claude Agent SDK', 'Claude Code + Agent SDK', '不补'])
    expect(options('identity-line-select-claude-vscode')).toEqual(['Claude Code + Agent SDK', 'Claude Agent SDK', '不补'])
    expect(chosen('identity-line-select-cli')).toBe('Claude Code CLI（终端）')
    expect(chosen('identity-line-select-sdk-cli')).toBe('Claude Agent SDK')
    expect(chosen('identity-line-select-claude-desktop')).toBe('Claude Code + Agent SDK')
    await w.get('[data-testid="billing-entrypoint-select"]').setValue('5')
    await w.get('[data-testid="identity-line-select-cli"]').setValue('1')
    await w.get('[data-testid="identity-line-select-claude-desktop"]').setValue('1')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(stored.request_policy?.build_billing_entrypoint).toBe('claude-vscode')
    expect(stored.request_policy?.build_identity_lines).toEqual({ cli: 'none', 'claude-desktop': 'agent_sdk' })
    w.unmount()
    w = await render()
    expect(chosen('billing-entrypoint-select')).toBe('claude-vscode')
    expect(chosen('identity-line-select-cli')).toBe('不补')
    expect(chosen('identity-line-select-claude-desktop')).toBe('Claude Agent SDK')
    expect(chosen('identity-line-select-claude-vscode')).toBe('Claude Code + Agent SDK')
    w.unmount()
  })
  it('saves independent attachment sources in plugin settings and restores them after reload', async () => {
    let stored = config(defaultRequestPolicy())
    mocks.get.mockImplementation(async () => structuredClone(stored))
    mocks.put.mockImplementation(async (_url, body) => {
      stored = config(JSON.parse(JSON.stringify(body.request_policy)))
      return structuredClone(stored)
    })
    let w = await render()
    const platform = '[data-testid="build-attachment-platform_name"]'
    const os = '[data-testid="build-attachment-os_version"]'
    expect(picked(w, platform)).toBe(0)
    await pick(w, platform, 1)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalled()
    expect(stored.request_policy?.build_attachment_sources).toEqual({ platform_name: 'worker' })
    w.unmount()
    w = await render()
    expect(picked(w, platform)).toBe(1)
    expect(picked(w, os)).toBe(0)
    await pick(w, os, 1)
    await w.get('[data-testid="relay-mode"]').setValue('0')
    expect(w.find(platform).exists()).toBe(false)
    expect(w.text()).toContain('只补缺的计费头')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(stored.request_policy?.build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker' })
    await w.get('[data-testid="relay-mode"]').setValue('1')
    await pick(w, platform, 0)
    await pick(w, os, 0)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(stored.request_policy?.build_attachment_sources).toEqual({ platform_name: 'client', os_version: 'client' })
    w.unmount()
  })
  it.each(['native', 'legacy', 'passthrough', '', undefined])('migrates stored %s mode to build', async mode => {
    mocks.get.mockResolvedValue(config({...defaultRequestPolicy(), relay_mode:mode} as Partial<RequestPolicy>))
    const w = await render()
    const select = w.get<HTMLSelectElement>('[data-testid="relay-mode"]').element
    expect(select.options[select.selectedIndex].textContent).toContain('build')
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({request_policy:expect.objectContaining({relay_mode:'build'})}),expect.anything())
    w.unmount()
  })
})
