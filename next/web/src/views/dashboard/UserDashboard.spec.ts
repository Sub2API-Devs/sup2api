import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UserDashboard from './UserDashboard.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(async () => ({ items: [] })), perms: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get, list: mocks.list } }))
vi.mock('vue-router', () => ({ RouterLink: { props: ['to'], template: '<a><slot /></a>' } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ has: (p: string | string[]) => [p].flat().some((k) => mocks.perms.has(k)), balance: null, refreshBalance: vi.fn() })
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ theme: 'light', menus: [] }) }))
vi.mock('@/components/stats/UsageCharts.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/plugin/PluginSlot.vue', () => ({ default: { template: '<div />' } }))
enableAutoUnmount(afterEach)

describe('user dashboard accounts card (T81)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.get.mockImplementation(async (path: string) => (path === '/accounts/summary' ? { total: 4, available: 0, auto_disabled: 3, disabled: 1 } : null))
  })

  it('shows a supplier the accounts in its scope by status, without usage permissions', async () => {
    mocks.perms = new Set(['account:own:read'])
    const w = mount(UserDashboard, { global: { plugins: [i18n] } })
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/accounts/summary')
    const card = w.get('[data-testid="card-accounts"]')
    expect(card.text()).toContain('0/4')
    expect(card.text()).toContain(i18n.global.t('stats.admin.accountsSub', { auto: '3', disabled: '1' }))
  })

  it('has no accounts card without an account read permission', async () => {
    mocks.perms = new Set(['usage:self:read'])
    const w = mount(UserDashboard, { global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.find('[data-testid="card-accounts"]').exists()).toBe(false)
    expect(mocks.get).not.toHaveBeenCalledWith('/accounts/summary')
  })
})
