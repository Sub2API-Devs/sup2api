import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { session } from '@sub2api/host'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Required permission(s): any of them grants access. */
    perm?: string | string[]
    /** i18n key of the page title. */
    title?: string
    public?: boolean
  }
}

const children: RouteRecordRaw[] = [
  { path: '', redirect: '/dashboard' },
  { path: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: 'nav.items.dashboard' } },

  { path: 'users', component: () => import('@/views/users/UsersView.vue'), meta: { perm: 'user:read', title: 'nav.items.users' } },
  { path: 'roles', component: () => import('@/views/roles/RolesView.vue'), meta: { perm: 'role:read', title: 'nav.items.roles' } },
  { path: 'api-keys', component: () => import('@/views/keys/AllApiKeysView.vue'), meta: { perm: 'apikey:all:read', title: 'nav.items.apiKeysAll' } },
  { path: 'me/api-keys', component: () => import('@/views/keys/MyApiKeysView.vue'), meta: { perm: 'apikey:self:manage', title: 'nav.items.myApiKeys' } },
  { path: 'groups', component: () => import('@/views/groups/GroupsView.vue'), meta: { perm: 'group:read', title: 'nav.items.groups' } },
  { path: 'proxies', component: () => import('@/views/proxies/ProxiesView.vue'), meta: { perm: 'proxy:read', title: 'nav.items.proxies' } },
  { path: 'accounts', component: () => import('@/views/accounts/AccountsView.vue'), meta: { perm: 'account:read', title: 'nav.items.accounts' } },
  { path: 'platforms', component: () => import('@/views/platforms/PlatformsView.vue'), meta: { perm: 'account:read', title: 'nav.items.platforms' } },

  { path: 'prices', component: () => import('@/views/prices/PricesView.vue'), meta: { perm: 'price:read', title: 'nav.items.prices' } },
  { path: 'prices/new', component: () => import('@/views/prices/PriceEditView.vue'), meta: { perm: 'price:manage', title: 'nav.items.prices' } },
  { path: 'prices/sources', component: () => import('@/views/prices/PriceSourcesView.vue'), meta: { perm: 'price:read', title: 'nav.items.prices' } },
  { path: 'prices/sources/:id/sync', component: () => import('@/views/prices/PriceSyncView.vue'), meta: { perm: 'price:manage', title: 'nav.items.prices' } },
  { path: 'prices/:id', component: () => import('@/views/prices/PriceEditView.vue'), meta: { perm: 'price:read', title: 'nav.items.prices' } },
  { path: 'usage', component: () => import('@/views/usage/UsageView.vue'), meta: { perm: 'usage:all:read', title: 'nav.items.usage' } },
  { path: 'me/usage', component: () => import('@/views/usage/MyUsageView.vue'), meta: { perm: 'usage:self:read', title: 'nav.items.myUsage' } },
  { path: 'ledger', component: () => import('@/views/ledger/LedgerView.vue'), meta: { perm: 'balance:all:read', title: 'nav.items.ledger' } },
  { path: 'me/balance', component: () => import('@/views/ledger/MyBalanceView.vue'), meta: { perm: 'balance:self:read', title: 'nav.items.myBalance' } },
  { path: 'sticky', component: () => import('@/views/sticky/StickyView.vue'), meta: { perm: 'sticky:read', title: 'nav.items.sticky' } },
  { path: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { perm: ['settings:read', 'sticky:read'], title: 'nav.items.settings' } },

  { path: 'plugins', component: () => import('@/views/plugins/PluginsView.vue'), meta: { perm: 'plugin:read', title: 'nav.items.plugins' } },
  {
    path: 'plugins/:key/versions/:version/consent',
    component: () => import('@/views/plugins/ConsentView.vue'),
    meta: { perm: 'plugin:install', title: 'nav.items.plugins' }
  },
  { path: 'plugins/:key/rollout', component: () => import('@/views/plugins/RolloutView.vue'), meta: { perm: 'plugin:read', title: 'nav.items.plugins' } },
  { path: 'plugins/:key', component: () => import('@/views/plugins/PluginDetailView.vue'), meta: { perm: 'plugin:read', title: 'nav.items.plugins' } },
  { path: 'market', component: () => import('@/views/plugins/MarketView.vue'), meta: { perm: 'plugin:market:read', title: 'nav.items.market' } },
  { path: 'publishers', component: () => import('@/views/plugins/PublishersView.vue'), meta: { perm: 'publisher:read', title: 'nav.items.publishers' } },
  { path: 'nodes', component: () => import('@/views/nodes/NodesView.vue'), meta: { perm: 'node:read', title: 'nav.items.nodes' } },

  { path: 'p/:plugin/:page', component: () => import('@/views/plugin-host/PluginPageView.vue') },
  { path: 'forbidden', component: () => import('@/views/errors/ForbiddenView.vue') },
  { path: ':pathMatch(.*)*', component: () => import('@/views/errors/NotFoundView.vue') }
]

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true } },
  { path: '/', component: AppLayout, children }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && session.get()) return '/dashboard'
    return true
  }
  if (!session.get()) return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  if (!auth.me) {
    try {
      await auth.loadMe()
    } catch {
      if (!session.get()) return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.perm && !auth.has(to.meta.perm)) {
    const perm = Array.isArray(to.meta.perm) ? to.meta.perm.join(' / ') : to.meta.perm
    return { path: '/forbidden', query: { perm } }
  }
  return true
})
