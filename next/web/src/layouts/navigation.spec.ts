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
import { mountPinned } from '@sub2api/ui/testing'

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
const denied = vi.hoisted(() => new Set<string>())
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    me: { email: 'a@x', roles: [] },
    balance: null,
    has: (p?: string | string[]) => [p ?? []].flat().length === 0 || [p ?? []].flat().some(x => !denied.has(x))
  })
}))
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
      { path: '/settings', component: Blank, meta: { perm: ['settings:read', 'sticky:read'], title: 'nav.items.settings' } },
      { path: '/plugins', component: Blank, meta: { perm: 'plugin:read', title: 'nav.items.plugins' } },
      { path: '/plugins/:key/settings', component: Blank, meta: { title: 'nav.crumbs.pluginSettings', parent: '/settings' } },
      { path: '/:p(.*)*', component: Blank }
    ]
  })
}

const item = (id: string, path: string) => ({ id, label: { zh: id }, icon: 'dashboard', path })

beforeEach(() => {
  vi.clearAllMocks()
  denied.clear()
  localStorage.clear()
  setActivePinia(createPinia())
  i18n.global.locale.value = 'zh'
})

describe('sidebar', () => {
  async function mountSidebar(sections: unknown[] | Error, at = '/dashboard') {
    if (sections instanceof Error) api.get.mockRejectedValue(sections)
    else api.get.mockResolvedValue(sections)
    const router = makeRouter()
    await router.push(at)
    const app = useAppStore()
    await app.loadMenus()
    const wrapper = mount(AppSidebar, { global: { plugins: [i18n, router] } })
    return { wrapper, app }
  }
  const labels = (w: ReturnType<typeof mount>) => w.findAll('nav a').map(a => a.text())

  it('shows a user the console and personal groups, a public plugin page untitled after them', async () => {
    const { wrapper } = await mountSidebar([
      { section: 'overview', items: [item('dashboard', '/dashboard'), item('keys', '/me/api-keys')] },
      { section: 'plugins', items: [item('info', '/p/guard/info')] },
      { section: 'me', items: [item('wallet', '/me/wallet')] }
    ])
    expect(labels(wrapper)).toEqual(['dashboard', 'keys', 'wallet', 'info'])
    expect(wrapper.get('[data-testid="nav-group-overview"]').text()).toContain('控制台')
    expect(wrapper.get('[data-testid="nav-group-me"]').text()).toContain('个人中心')
    expect(wrapper.get('[data-testid="nav-group-admin"]').text()).toBe('info')
  })

  const operatorMenu = [
    { section: 'overview', items: [item('dashboard', '/dashboard')] },
    { section: 'gateway', items: [item('groups', '/groups'), item('accounts', '/accounts')] },
    { section: 'security', items: [item('guard', '/p/guard/dashboard')] },
    { section: 'users', items: [item('users', '/users'), item('roles', '/roles')] },
    { section: 'me', items: [item('wallet', '/me/wallet')] }
  ]

  it('folds the operator sections into admin submenus, a one-entry section stays a plain entry', async () => {
    const { wrapper, app } = await mountSidebar(operatorMenu)
    const admin = wrapper.get('[data-testid="nav-group-admin"]')
    expect(admin.text()).toContain('管理员')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'guard'])
    expect(admin.findAll('button').map(b => b.text())).toEqual(['网关', '用户与权限'])
    await wrapper.get('[data-testid="nav-submenu-gateway"]').trigger('click')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'groups', 'accounts', 'guard'])
    expect(wrapper.get('[data-testid="nav-submenu-gateway"]').attributes('aria-expanded')).toBe('true')
    expect(JSON.parse(localStorage.getItem('s2a.navOpen') || '[]')).toEqual(['gateway'])
    app.sidebarCollapsed = true
    await flushPromises()
    // Collapsed: no titles or submenus, every entry an icon, a rule between every two sections.
    expect(wrapper.text()).not.toContain('管理员')
    expect(wrapper.findAll('nav a')).toHaveLength(7)
    expect(wrapper.findAll('nav hr')).toHaveLength(4)
  })

  it('opens the submenu of the current page and remembers the ones opened before', async () => {
    localStorage.setItem('s2a.navOpen', JSON.stringify(['users']))
    const { wrapper } = await mountSidebar(operatorMenu, '/accounts')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'groups', 'accounts', 'guard', 'users', 'roles'])
    await wrapper.get('[data-testid="nav-submenu-gateway"]').trigger('click')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'guard', 'users', 'roles'])
  })

  it('lights up the menu entry of the page, else of its nearest parent page', async () => {
    const menu = [
      { section: 'overview', items: [item('dashboard', '/dashboard')] },
      { section: 'system', items: [item('plugins', '/plugins'), item('prices', '/prices'), item('settings', '/settings')] }
    ]
    const current = (w: ReturnType<typeof mount>) => w.findAll('nav a').filter(a => a.attributes('aria-current') === 'page').map(a => a.text())
    // Plugin settings are a child of Settings, not of the plugin list the path starts with.
    expect(current((await mountSidebar(menu, '/plugins/mailer/settings')).wrapper)).toEqual(['settings'])
    expect(current((await mountSidebar(menu, '/prices/sources/3/sync')).wrapper)).toEqual(['prices'])
    expect(current((await mountSidebar(menu, '/plugins/mailer')).wrapper)).toEqual(['plugins'])
  })

  it('keeps the labels in the mobile drawer when collapsed on desktop', async () => {
    const { wrapper, app } = await mountSidebar([{ section: 'overview', items: [item('dashboard', '/dashboard')] }])
    app.sidebarCollapsed = true
    await flushPromises()
    expect(labels(wrapper)).toEqual([''])
    app.mobileNavOpen = true
    await flushPromises()
    expect(labels(wrapper)).toEqual(['dashboard'])
  })

  it('closes the mobile drawer on any navigation', async () => {
    const { wrapper, app } = await mountSidebar([{ section: 'overview', items: [item('dashboard', '/dashboard')] }])
    app.mobileNavOpen = true
    await wrapper.vm.$router.push('/prices')
    await flushPromises()
    expect(app.mobileNavOpen).toBe(false)
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

  it('does not link a parent page the caller cannot open', async () => {
    denied.add('settings:read').add('sticky:read')
    const router = makeRouter()
    await router.push('/plugins/mailer/settings')
    const wrapper = mount(AppTopbar, { global: { plugins: [i18n, router], stubs: { ChangePasswordDialog: true } } })
    const nav = wrapper.get('[data-testid="breadcrumbs"]')
    expect(nav.findAll('a')).toHaveLength(0)
    expect(nav.text()).toContain('设置')
  })

  it('keeps the menu button, title and account menu on a phone, language and theme inside the menu', async () => {
    const router = makeRouter()
    await router.push('/dashboard')
    const wrapper = mountPinned(AppTopbar, { global: { plugins: [i18n, router], stubs: { ChangePasswordDialog: true } } })
    expect(wrapper.findAll('header > button, header > a').map(b => b.attributes('aria-label'))).toEqual(['打开导航菜单'])
    await wrapper.get('[aria-label="账号菜单"]').trigger('click')
    await flushPromises()
    const items = Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
    expect(items.map(i => i.textContent?.trim())).toEqual(['个人设置', '修改密码', '语言 · 中文', '深色模式', '退出登录'])
    items[2].click()
    await flushPromises()
    expect(i18n.global.locale.value).toBe('en')
  })

  it('every parent of the real routes is a page with a title', async () => {
    const { router } = await import('@/router')
    for (const r of router.getRoutes()) {
      if (!r.meta.parent) continue
      expect(router.resolve(r.meta.parent).meta.title, `${r.path} → ${r.meta.parent}`).toBeTruthy()
    }
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
