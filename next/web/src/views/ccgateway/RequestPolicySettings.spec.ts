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
    await pick(w, '[data-testid="identity-user_id"]', 0)
    await w.get('[data-testid="relay-mode"]').setValue('0')
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    const sent = mocks.put.mock.calls[0]![1].request_policy
    expect([undefined, 1]).toContain(sent.schema_version)
    w.unmount()
  })
  // Identity is applied in direct as well, so it stays editable there; only the
  // content sources are build-only.
  it('keeps the identity source editable in direct mode', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), relay_mode: 'direct' }))
    const w = await render()
    expect(w.find('[data-testid="direct-hint"]').exists()).toBe(true)
    expect(w.find('[data-testid="billing-sources"]').exists()).toBe(false)
    expect(w.find('[data-testid="build-attachments"]').exists()).toBe(false)
    expect(picked(w, '[data-testid="identity-user_id"]')).toBe(2)
    await pick(w, '[data-testid="identity-user_id"]', 0)
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), relay_mode: 'direct' }))
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ request_policy: expect.objectContaining({ relay_mode: 'direct', request_identity_sources: { user_id: 'client' } }) }), expect.anything())
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
    expect(w.text()).toContain('direct 模式除身份标识外原样转发')
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
