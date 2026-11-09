import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h, reactive } from 'vue'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import SettingsShell from '@/layouts/SettingsShell.vue'
import { useAppStore, type NavSection } from '@/stores/app'
import SettingsView from './SettingsView.vue'
import { emptyFailurePolicy } from './failurePolicy'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), list: vi.fn() }))
const permissions = vi.hoisted(() => ({ manage: true }))
const route = reactive<{ path: string; meta: object; query: { tab: string; sub?: string } }>({ path: '/settings', meta: {}, query: { tab: 'billing' } })
const router = {
  replace: vi.fn((to: { query: { tab: string } }) => { route.query.tab = to.query.tab }),
  push: vi.fn(),
  resolve: vi.fn(() => ({ meta: {} }))
}
vi.mock('vue-router', async original => ({ ...(await original<object>()), useRoute: () => route, useRouter: () => router }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => permissions.manage || key.endsWith(':read') }) }))
enableAutoUnmount(afterEach)

let pinia: Pinia

/** The settings page as the app shows it: inside the system settings shell. */
const mountSettings = (stubs: Record<string, boolean> = {}) =>
  mount(SettingsShell, { slots: { default: () => h(SettingsView) }, global: { plugins: [i18n, pinia], stubs } })

/** The navigation's groups, by header, as the keys of their entries. */
const navGroups = (wrapper: VueWrapper) => Object.fromEntries(
  wrapper.findAll('[data-testid="settings-nav"] > div').map(g => [
    g.get('.text-xxs').text(),
    g.findAll('button').map(b => b.attributes('data-testid')!.replace('settings-nav-', ''))
  ])
)

/** The "system" menu section: the settings page itself, core pages and a plugin page. */
const systemMenu = (): NavSection[] => [{
  key: 'system',
  items: [
    { id: 'settings', labelKey: 'nav.items.settings', icon: 'settings', path: '/settings' },
    { id: 'platforms', labelKey: 'nav.items.platforms', icon: 'platform', path: '/platforms' },
    { id: 'nodes', labelKey: 'nav.items.nodes', icon: 'server', path: '/nodes' },
    { id: 'dynweight:dynweight', label: { zh: '动态权重' }, icon: 'chart', path: '/p/dynweight/dashboard', pluginKey: 'dynweight' }
  ]
}]

beforeEach(() => {
  vi.clearAllMocks()
  permissions.manage = true
  route.path = '/settings'
  route.meta = {}
  route.query = { tab: 'billing' }
  pinia = createPinia()
  setActivePinia(pinia)
  i18n.global.locale.value = 'zh'
  api.list.mockResolvedValue({ items: [], total: 0 })
  api.put.mockImplementation((_path, body) => Promise.resolve(body))
  api.get.mockImplementation(path => Promise.resolve({
    '/settings/billing': { pre_consume_tokens: 500, missing_price_policy: 'reject', min_balance: '0', big_cost_warning_usd: '10' },
    '/settings/gateway': { max_attempts: 3, platform_call_timeout_ms: 30000, default_hook_timeout_ms: 30000, platform_hotpath_timeout_ms: 30000 },
    '/settings/sticky': { enabled: true, default_ttl_seconds: 3600, keep_on_account_disabled: false },
    '/sticky-rules/stats': [],
    '/system/offload': { enabled: false, cpu_threshold_percent: 90, nodes: [] },
    '/system/update-source': { repository: '' },
    '/settings/failure-policy': { configured: true, policy: emptyFailurePolicy() }
  }[path as string] ?? {}))
})

describe('system settings use platform title ownership', () => {
  it('does not repeat any active section title while preserving distinct groups', async () => {
    const wrapper = mountSettings()
    for (const tab of ['billing', 'gateway', 'failure', 'sticky', 'offload', 'updates']) {
      route.query.tab = tab
      await flushPromises()
      const selected = wrapper.get(`[data-testid="settings-nav-${tab}"]`)
      expect(selected.attributes('aria-current')).toBe('page')
      const title = selected.text()
      const panel = wrapper.get('[data-testid="settings-panel"]')
      expect(panel.attributes('aria-label')).toBe(title)
      expect(panel.findAll('h1,h2,h3,h4,h5,h6').map(el => el.text())).not.toContain(title)
      if (tab === 'failure') expect(panel.findAll('h5').map(el => el.text())).toEqual(['自动重试', '自动禁用'])
    }
  })

  it('drops the scheduling page sub-tab when switching pages', async () => {
    route.query = { tab: 'failure', sub: 'balance' }
    const wrapper = mountSettings()
    await flushPromises()
    await wrapper.get('[data-testid="settings-nav-gateway"]').trigger('click')
    expect(router.replace.mock.calls[0][0].query).toStrictEqual({ tab: 'gateway', sub: undefined })
  })

  it('groups the sections and lists enabled plugins with settings', async () => {
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(path => path === '/plugins'
      ? Promise.resolve([
        { key: 'mailer', name: { zh: '邮件' }, status: 'enabled', has_settings: true },
        { key: 'guard', name: { zh: '请求守卫' }, status: 'disabled', has_settings: true },
        { key: 'relay', name: { zh: '中转' }, status: 'enabled', has_settings: false }
      ])
      : base(path))
    const wrapper = mountSettings({ PluginSettings: true })
    await flushPromises()
    expect(Object.keys(navGroups(wrapper))).toEqual(['网关', '计费与通知', '插件设置', '系统'])
    expect(wrapper.find('[data-testid="settings-nav-plugin:guard"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-nav-plugin:relay"]').exists()).toBe(false)
    await wrapper.get('[data-testid="settings-nav-plugin:mailer"]').trigger('click')
    await flushPromises()
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'plugin:mailer' } })
    expect(wrapper.get('[data-testid="settings-panel"]').attributes('aria-label')).toBe('邮件')
  })

  it('opens a linked plugin page once the plugin list arrives, without loading another page first', async () => {
    let release!: (v: unknown) => void
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(path => path === '/plugins'
      ? new Promise(r => { release = r })
      : base(path))
    route.query.tab = 'plugin:mailer'
    const wrapper = mountSettings({ PluginSettings: true })
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-waiting"]').exists()).toBe(true)
    expect(api.get).not.toHaveBeenCalledWith('/settings/gateway')
    release([{ key: 'mailer', name: { zh: '邮件' }, status: 'enabled', has_settings: true }])
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-waiting"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-missing"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="settings-panel"]').attributes('aria-label')).toBe('邮件')
  })

  it('follows plugins enabled while the navigation is open, not the first menu load', async () => {
    const base = api.get.getMockImplementation()!
    let installed: object[] = []
    api.get.mockImplementation(path => path === '/plugins' ? Promise.resolve(installed) : base(path))
    const wrapper = mountSettings({ PluginSettings: true })
    const app = useAppStore()
    app.menus = systemMenu()
    await flushPromises()
    expect(api.get.mock.calls.filter(([path]) => path === '/plugins')).toHaveLength(1)
    expect(wrapper.find('[data-testid="settings-nav-plugin:mailer"]').exists()).toBe(false)
    // Enabling a plugin refreshes the menu.
    installed = [{ key: 'mailer', name: { zh: '邮件' }, status: 'enabled', has_settings: true }]
    app.menus = systemMenu()
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-nav-plugin:mailer"]').exists()).toBe(true)
  })

  it("lights up a plugin's tab on that plugin's own settings page", async () => {
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(path => path === '/plugins'
      ? Promise.resolve([{ key: 'mailer', name: { zh: '邮件' }, status: 'enabled', has_settings: true }])
      : base(path))
    route.path = '/plugins/mailer/settings'
    route.meta = { parent: '/settings', settingsTab: () => 'plugin:mailer' }
    const wrapper = mount(SettingsShell, { slots: { default: () => h('div') }, global: { plugins: [i18n, pinia] } })
    await flushPromises()
    expect(wrapper.get('[data-testid="settings-nav-plugin:mailer"]').attributes('aria-current')).toBe('page')
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
  })

  it('says so when a linked page is not available', async () => {
    api.get.mockImplementation(path => path === '/plugins' ? Promise.resolve([]) : Promise.resolve({}))
    route.query.tab = 'plugin:gone'
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.find('[data-testid="settings-missing"]').exists()).toBe(true)
  })

  it('retains saving and removes the empty billing header for read-only users', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    await wrapper.get('[data-testid="billing-settings"] input[type="number"]').setValue('501')
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/settings/billing', expect.objectContaining({ pre_consume_tokens: 501 }))
    wrapper.unmount()
    permissions.manage = false
    const readonly = mountSettings()
    await flushPromises()
    expect(readonly.find('[data-testid="billing-settings"] header').exists()).toBe(false)
    expect(readonly.find('[data-testid="settings-save"]').exists()).toBe(false)
  })

  describe('with the pages of the system menu section', () => {
    beforeEach(() => { useAppStore().menus = systemMenu() })

    it('lists the system section pages in their groups, without the settings page itself', async () => {
      const wrapper = mountSettings()
      await flushPromises()
      expect(navGroups(wrapper)).toEqual({
        网关: ['gateway', 'failure', 'sticky', 'offload', 'page:platforms'],
        计费与通知: ['billing', 'notifications'],
        插件设置: ['page:dynweight:dynweight'],
        系统: ['page:nodes', 'updates', 'environment']
      })
      expect(wrapper.get('[data-testid="settings-nav-page:dynweight:dynweight"]').text()).toBe('动态权重')
    })

    it('opens a page entry at its own address', async () => {
      const wrapper = mountSettings()
      await flushPromises()
      await wrapper.get('[data-testid="settings-nav-page:platforms"]').trigger('click')
      expect(router.push).toHaveBeenCalledWith('/platforms')
      expect(router.replace).not.toHaveBeenCalled()
    })

    it('opens a settings tab from another page of the shell', async () => {
      route.path = '/nodes'
      const wrapper = mountSettings()
      await flushPromises()
      await wrapper.get('[data-testid="settings-nav-gateway"]').trigger('click')
      expect(router.push).toHaveBeenCalledWith({ path: '/settings', query: { tab: 'gateway' } })
      expect(router.replace).not.toHaveBeenCalled()
    })

    it('marks the open page, not the remembered tab, as current on another page', async () => {
      route.path = '/nodes'
      const wrapper = mountSettings()
      await flushPromises()
      const current = wrapper.findAll('[data-testid="settings-nav"] [aria-current="page"]')
      expect(current.map(b => b.attributes('data-testid'))).toEqual(['settings-nav-page:nodes'])
    })
  })
})
