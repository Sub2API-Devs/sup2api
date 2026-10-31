import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import SettingsView from './SettingsView.vue'
import { emptyFailurePolicy } from './failurePolicy'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), list: vi.fn() }))
const permissions = vi.hoisted(() => ({ manage: true }))
const route = reactive({ query: { tab: 'billing' } })
const router = { replace: vi.fn((to: { query: { tab: string } }) => { route.query.tab = to.query.tab }) }
vi.mock('vue-router', async original => ({ ...(await original<object>()), useRoute: () => route, useRouter: () => router }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => permissions.manage || key.endsWith(':read') }) }))
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  permissions.manage = true
  route.query.tab = 'billing'
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
    const wrapper = mount(SettingsView, { global: { plugins: [i18n, createPinia()] } })
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

  it('groups the sections and lists enabled plugins with settings', async () => {
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation(path => path === '/plugins'
      ? Promise.resolve([
        { key: 'mailer', name: { zh: '邮件' }, status: 'enabled', has_settings: true },
        { key: 'guard', name: { zh: '请求守卫' }, status: 'disabled', has_settings: true },
        { key: 'relay', name: { zh: '中转' }, status: 'enabled', has_settings: false }
      ])
      : base(path))
    const wrapper = mount(SettingsView, { global: { plugins: [i18n, createPinia()], stubs: { PluginSettings: true } } })
    await flushPromises()
    const nav = wrapper.get('[data-testid="settings-nav"]')
    expect(nav.findAll('.text-xxs').map(el => el.text())).toEqual(['网关', '计费', '通知', '系统', '插件设置'])
    expect(wrapper.find('[data-testid="settings-nav-plugin:guard"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-nav-plugin:relay"]').exists()).toBe(false)
    await wrapper.get('[data-testid="settings-nav-plugin:mailer"]').trigger('click')
    await flushPromises()
    expect(router.replace).toHaveBeenCalledWith({ query: { tab: 'plugin:mailer' } })
    expect(wrapper.get('[data-testid="settings-panel"]').attributes('aria-label')).toBe('邮件')
  })

  it('retains saving and removes the empty billing header for read-only users', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="billing-settings"] input[type="number"]').setValue('501')
    await wrapper.get('[data-testid="settings-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/settings/billing', expect.objectContaining({ pre_consume_tokens: 501 }))
    wrapper.unmount()
    permissions.manage = false
    const readonly = mount(SettingsView, { global: { plugins: [i18n, createPinia()] } })
    await flushPromises()
    expect(readonly.find('[data-testid="billing-settings"] header').exists()).toBe(false)
    expect(readonly.find('[data-testid="settings-save"]').exists()).toBe(false)
  })
})
