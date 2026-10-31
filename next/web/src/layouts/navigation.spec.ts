import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import { i18n } from '@/i18n'
import { useAppStore } from '@/stores/app'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import DeclarativeTable from '@/components/plugin/DeclarativeTable.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ me: { email: 'a@x', roles: [] }, balance: null, has: () => true }) }))
enableAutoUnmount(afterEach)

const Blank = defineComponent({ template: '<div />' })
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', component: Blank, meta: { title: 'nav.items.dashboard' } },
      { path: '/prices', component: Blank, meta: { title: 'nav.items.prices' } },
      { path: '/prices/sources', component: Blank, meta: { title: 'prices.sources.title', parent: '/prices' } },
      { path: '/prices/sources/:id/sync', component: Blank, meta: { title: 'prices.syncPrices', parent: '/prices/sources' } },
      { path: '/:p(.*)*', component: Blank }
    ]
  })
}

const item = (id: string, path: string) => ({ id, label: { zh: id }, icon: 'dashboard', path })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
  i18n.global.locale.value = 'zh'
})

describe('sidebar', () => {
  async function mountSidebar(sections: unknown[] | Error) {
    if (sections instanceof Error) api.get.mockRejectedValue(sections)
    else api.get.mockResolvedValue(sections)
    const router = makeRouter()
    await router.push('/dashboard')
    const app = useAppStore()
    await app.loadMenus()
    const wrapper = mount(AppSidebar, { global: { plugins: [i18n, router] } })
    return { wrapper, app }
  }
  const labels = (w: ReturnType<typeof mount>) => w.findAll('nav a').map(a => a.text())

  it('lists my account right after the dashboard for a user without operator sections', async () => {
    const { wrapper } = await mountSidebar([
      { section: 'overview', items: [item('dashboard', '/dashboard')] },
      { section: 'plugins', items: [item('info', '/p/guard/info')] },
      { section: 'me', items: [item('keys', '/me/api-keys'), item('usage', '/me/usage')] }
    ])
    expect(labels(wrapper)).toEqual(['dashboard', 'keys', 'usage', 'info'])
    expect(wrapper.text()).not.toContain('我的账户')
    expect(wrapper.text()).toContain('插件')
  })

  it('keeps the server order and labels the new core sections for operators', async () => {
    const { wrapper, app } = await mountSidebar([
      { section: 'overview', items: [item('dashboard', '/dashboard')] },
      { section: 'gateway', items: [item('groups', '/groups')] },
      { section: 'security', items: [item('guard', '/p/guard/dashboard')] },
      { section: 'users', items: [item('users', '/users')] },
      { section: 'me', items: [item('keys', '/me/api-keys')] }
    ])
    expect(labels(wrapper)).toEqual(['dashboard', 'groups', 'guard', 'users', 'keys'])
    expect(wrapper.text()).toContain('安全')
    expect(wrapper.text()).toContain('用户与权限')
    expect(wrapper.text()).toContain('我的账户')
    app.sidebarCollapsed = true
    await flushPromises()
    // Collapsed: no headers, a rule between every two groups.
    expect(wrapper.text()).not.toContain('安全')
    expect(wrapper.findAll('nav hr')).toHaveLength(4)
  })

  it('shows only the dashboard and a retry when the menu cannot load', async () => {
    const { wrapper, app } = await mountSidebar(new Error('down'))
    expect(app.menusError).toBe(true)
    expect(labels(wrapper)).toEqual(['仪表盘'])
    api.get.mockResolvedValue([{ section: 'overview', items: [item('dashboard', '/dashboard')] }, { section: 'gateway', items: [item('groups', '/groups')] }])
    await wrapper.get('[data-testid="menu-retry"]').trigger('click')
    await flushPromises()
    expect(app.menusError).toBe(false)
    expect(wrapper.find('[data-testid="menu-retry"]').exists()).toBe(false)
    expect(labels(wrapper)).toEqual(['dashboard', 'groups'])
  })
})

describe('top bar', () => {
  it('shows the parents of a nested page as breadcrumbs', async () => {
    const router = makeRouter()
    await router.push('/prices/sources/3/sync')
    const wrapper = mount(AppTopbar, { global: { plugins: [i18n, router], stubs: { ChangePasswordDialog: true } } })
    const crumbs = wrapper.get('[data-testid="breadcrumbs"]').findAll('a')
    expect(crumbs.map(a => [a.text(), a.attributes('href')])).toEqual([['模型价格', '/prices'], ['价格同步源', '/prices/sources']])
    expect(wrapper.get('h1').text()).toBe('同步价格')
    await router.push('/prices')
    await flushPromises()
    expect(wrapper.find('[data-testid="breadcrumbs"]').exists()).toBe(false)
  })
})

describe('declarative table', () => {
  const plugin = (create?: { page: string }) => ({
    key: 'volcengine',
    pages: {
      assets: { type: 'table', source: 'GET /assets', columns: [], create },
      new_asset: { type: 'form', title: { zh: '新建素材' } }
    }
  })

  it('opens the create form from a "New" button when the core sends the link', async () => {
    api.list.mockResolvedValue({ items: [], page: { total: 0 }, paged: false })
    const p = plugin({ page: 'new_asset' })
    const wrapper = mount(DeclarativeTable, { props: { plugin: p as never, page: p.pages.assets as never }, global: { plugins: [i18n, makeRouter()] } })
    await flushPromises()
    const btn = wrapper.get('[data-testid="table-create"]')
    expect(btn.text()).toBe('新建素材')
    expect(btn.attributes('href')).toBe('/p/volcengine/new_asset')
  })

  it('has no button without the link', async () => {
    api.list.mockResolvedValue({ items: [], page: { total: 0 }, paged: false })
    const p = plugin()
    const wrapper = mount(DeclarativeTable, { props: { plugin: p as never, page: p.pages.assets as never }, global: { plugins: [i18n, makeRouter()] } })
    await flushPromises()
    expect(wrapper.find('[data-testid="table-create"]').exists()).toBe(false)
  })
})
