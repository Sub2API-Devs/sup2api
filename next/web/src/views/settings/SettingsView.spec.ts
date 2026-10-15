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
vi.mock('vue-router', async original => ({ ...(await original<object>()), useRoute: () => route }))
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
  it('does not repeat any active tab title while preserving distinct groups', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [i18n, createPinia()] } })
    for (const tab of ['billing', 'gateway', 'failure', 'sticky', 'offload', 'updates']) {
      route.query.tab = tab
      await flushPromises()
      const selected = wrapper.get('[role="tab"][aria-selected="true"]')
      const title = selected.text()
      const panel = wrapper.get('[role="tabpanel"]')
      expect(panel.findAll('h1,h2,h3,h4,h5,h6').map(el => el.text())).not.toContain(title)
      expect(panel.attributes('id')).toBe(selected.attributes('aria-controls'))
      if (tab === 'failure') expect(panel.findAll('h5').map(el => el.text())).toEqual(['自动重试', '自动禁用'])
    }
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
