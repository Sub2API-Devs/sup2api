import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import { i18n } from '@/i18n'
import { useAppStore } from '@/stores/app'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import AppLayout from './AppLayout.vue'
import DeclarativeTable from '@/components/plugin/DeclarativeTable.vue'
import { mountPinned } from '@sub2api/ui/testing'

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/plugins', () => ({ usePluginStore: () => ({ refresh: () => Promise.resolve() }) }))
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
    { section: 'gateway', items: [item('accounts', '/accounts'), item('groups', '/groups')] },
    { section: 'security', items: [item('guard', '/p/guard/dashboard')] },
    { section: 'users', items: [item('users', '/users')] },
    { section: 'vol:ark', label: { zh: '火山方舟' }, items: [item('assets', '/p/vol/assets'), item('sets', '/p/vol/sets')] },
    { section: 'system', items: [item('settings', '/settings'), item('nodes', '/nodes')] },
    { section: 'me', items: [item('wallet', '/me/wallet')] }
  ]

  it('lists the admin sections flat, folds a plugin section and ends with system settings', async () => {
    const { wrapper, app } = await mountSidebar(operatorMenu)
    const admin = wrapper.get('[data-testid="nav-group-admin"]')
    expect(admin.text()).toContain('管理员')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'accounts', 'groups', 'guard', 'users', '系统设置'])
    expect(admin.findAll('button').map(b => b.text())).toEqual(['火山方舟'])
    await wrapper.get('[data-testid="nav-submenu-vol:ark"]').trigger('click')
    expect(labels(wrapper)).toEqual(['dashboard', 'wallet', 'accounts', 'groups', 'guard', 'users', 'assets', 'sets', '系统设置'])
    expect(wrapper.get('[data-testid="nav-submenu-vol:ark"]').attributes('aria-expanded')).toBe('true')
    expect(JSON.parse(localStorage.getItem('s2a.navOpen') || '[]')).toEqual(['vol:ark'])
    app.sidebarCollapsed = true
    await flushPromises()
    // Collapsed: no titles or submenus, every entry an icon, a rule between every two groups.
    expect(wrapper.text()).not.toContain('管理员')
    expect(wrapper.findAll('nav a')).toHaveLength(9)
    expect(wrapper.findAll('nav hr')).toHaveLength(2)
  })

  it('opens the submenu of the current page and remembers the ones opened before', async () => {
    localStorage.setItem('s2a.navOpen', JSON.stringify(['other:x']))
    const { wrapper } = await mountSidebar(operatorMenu, '/p/vol/sets')
    expect(labels(wrapper)).toContain('sets')
    await wrapper.get('[data-testid="nav-submenu-vol:ark"]').trigger('click')
    expect(labels(wrapper)).not.toContain('sets')
    expect(JSON.parse(localStorage.getItem('s2a.navOpen') || '[]')).toEqual(['other:x'])
  })

  it("lights up system settings on a page reached from the settings page, such as a plugin's settings", async () => {
    const menu = [operatorMenu[0], { section: 'system', items: [item('settings', '/settings'), item('plugins', '/plugins')] }]
    const { wrapper } = await mountSidebar(menu, '/plugins/mailer/settings')
    expect(wrapper.findAll('nav a').filter(a => a.attributes('aria-current') === 'page').map(a => a.text())).toEqual(['系统设置'])
  })

  it('opens system settings on its first page and lights it up on every one of its pages', async () => {
    const vendor = [operatorMenu[0], { section: 'system', items: [item('proxies', '/proxies'), item('nodes', '/nodes')] }]
    const settings = (w: ReturnType<typeof mount>) => w.findAll('nav a').find(a => a.text() === '系统设置')!
    const { wrapper } = await mountSidebar(vendor, '/nodes')
    expect(settings(wrapper).attributes('href')).toBe('/proxies')
    expect(settings(wrapper).attributes('aria-current')).toBe('page')
  })

  it('lights up the menu entry of the page, else of its nearest parent page', async () => {
    const menu = [
      { section: 'overview', items: [item('dashboard', '/dashboard')] },
      { section: 'gateway', items: [item('plugins', '/plugins'), item('prices', '/prices'), item('settings', '/settings')] }
    ]
    const current = (w: ReturnType<typeof mount>) =>
      w
        .findAll('nav a')
        .filter(a => a.attributes('aria-current') === 'page')
        .map(a => a.text())
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
    api.get.mockResolvedValue([
      { section: 'overview', items: [item('dashboard', '/dashboard')] },
      { section: 'gateway', items: [item('groups', '/groups')] }
    ])
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
    expect(crumbs.map(a => [a.text(), a.attributes('href')])).toEqual([
      ['模型价格', '/prices'],
      ['价格同步源', '/prices/sources']
    ])
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
    const wrapper = mount(DeclarativeTable, {
      props: { plugin: p as never, page: p.pages.assets as never },
      global: { plugins: [i18n, makeRouter()] }
    })
    await flushPromises()
    const btn = wrapper.get('[data-testid="table-create"]')
    expect(btn.text()).toBe('新建素材')
    expect(btn.attributes('href')).toBe('/p/volcengine/new_asset')
  })

  it('has no button without the link', async () => {
    api.list.mockResolvedValue({ items: [], page: { total: 0 }, paged: false })
    const p = plugin()
    const wrapper = mount(DeclarativeTable, {
      props: { plugin: p as never, page: p.pages.assets as never },
      global: { plugins: [i18n, makeRouter()] }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="table-create"]').exists()).toBe(false)
  })
})

describe('layout', () => {
  it('opens a page of system settings inside its navigation at once, without remounting when the menu arrives', async () => {
    let menus!: (v: unknown) => void
    api.get.mockImplementation((path: string) => (path === '/me/menus' ? new Promise(r => (menus = r)) : Promise.resolve([])))
    let mounts = 0
    const Page = defineComponent({ mounted: () => void mounts++, render: () => h('div', { 'data-testid': 'page' }) })
    const router = makeRouter()
    router.addRoute({ path: '/nodes', component: Page, meta: { title: 'nav.items.nodes', parent: '/settings' } })
    await router.push('/nodes')
    const wrapper = mount(AppLayout, { global: { plugins: [i18n, router], stubs: { AppSidebar: true, AppTopbar: true } } })
    await flushPromises()
    expect(wrapper.find('[data-testid="page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-nav"]').exists()).toBe(true)
    menus([{ section: 'system', items: [item('settings', '/settings'), item('nodes', '/nodes')] }])
    await flushPromises()
    expect(mounts).toBe(1)
  })
})
