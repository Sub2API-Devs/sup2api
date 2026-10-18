import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
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

describe('CCGateway single-request modes', () => {
  beforeEach(() => { vi.resetAllMocks(); i18n.global.locale.value = 'zh' })
  async function render() {
    const w = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    await tab(w, 'cc').trigger('click')
    return w
  }
  it('offers only direct and build, defaults to build and hides removed agent controls', async () => {
    mocks.get.mockResolvedValue(config(undefined))
    const w = await render()
    const select = w.get<HTMLSelectElement>('[data-testid="relay-mode"]').element
    expect(Array.from(select.options).filter(o => !o.disabled).map(o => o.textContent)).toHaveLength(2)
    expect(select.options[select.selectedIndex].textContent).toContain('build')
    expect(w.text()).not.toContain('native')
    for (const id of ['tool-search', 'client-attachments', 'custom-tool-prefix', 'thinking-disabled-compat', 'unknown-field']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    w.unmount()
  })
  it.each(['direct', 'build'] as const)('saves %s with a pinned CLI version', async mode => {
    mocks.get.mockResolvedValue(config(defaultRequestPolicy()))
    const w = await render()
    await w.get('[data-testid="relay-mode"]').setValue(mode === 'direct' ? '0' : '1')
    await w.get('[data-testid="cli-version"]').setValue('2.1.302')
    mocks.put.mockResolvedValue(config({...defaultRequestPolicy(), relay_mode: mode}))
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({request_policy:expect.objectContaining({relay_mode:mode,cli_version:'2.1.302'})}),expect.anything())
    w.unmount()
  })
  it.each(['native', 'legacy', 'passthrough', '', undefined])('migrates stored %s mode to build', async mode => {
    mocks.get.mockResolvedValue(config({...defaultRequestPolicy(), relay_mode:mode} as Partial<RequestPolicy>))
    const w = await render()
    const select = w.get<HTMLSelectElement>('[data-testid="relay-mode"]').element
    expect(select.options[select.selectedIndex].textContent).toContain('build')
    await w.get('[data-testid="cli-version"]').setValue('2.1.302')
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({request_policy:expect.objectContaining({relay_mode:'build'})}),expect.anything())
    w.unmount()
  })
})
