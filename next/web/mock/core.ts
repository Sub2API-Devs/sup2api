import { fail, now, on } from './router'

// auth, me, menus

export const ALL_PERMISSIONS = [
  'user:read', 'user:create', 'user:update', 'user:delete',
  'role:read', 'role:manage',
  'apikey:self:manage', 'apikey:all:read', 'apikey:all:manage',
  'group:read', 'group:manage',
  'account:read', 'account:create', 'account:update', 'account:delete', 'account:test', 'account:credential:view',
  'proxy:read', 'proxy:manage',
  'price:read', 'price:manage',
  'balance:self:read', 'balance:all:read', 'balance:adjust',
  'usage:self:read', 'usage:all:read',
  'sticky:read', 'sticky:manage',
  'plugin:read', 'plugin:install', 'plugin:manage', 'plugin:uninstall', 'plugin:grant:high', 'plugin:grant:critical', 'plugin:egress:read', 'plugin:market:read',
  'publisher:read', 'publisher:manage',
  'node:read', 'gateway:use', 'settings:read', 'settings:manage',
  'plugin.guard:rules:read', 'plugin.guard:rules:manage', 'plugin.guard:stats:read',
  'plugin.anthropic:model_catalog:read'
]

export const me = {
  id: 1,
  email: 'admin@example.com',
  display_name: 'Admin',
  roles: ['super_admin'],
  permissions: ALL_PERMISSIONS,
  superuser: true
}

const tokens = () => ({ access_token: 'mock-access-' + Date.now(), refresh_token: 'mock-refresh', expires_in: 7200, user: me })

on('POST', '/auth/login', (req) => {
  if (!req.body?.email || req.body?.password !== 'admin') return fail(401, 'unauthenticated', 'invalid email or password (mock password: admin)')
  return tokens()
})
on('POST', '/auth/refresh', () => tokens())
on('POST', '/auth/logout', () => ({}))
on('POST', '/auth/step-up', (req) =>
  req.body?.password === 'admin' ? { step_up_token: 'mock-stepup', expires_in: 300 } : fail(401, 'unauthenticated', 'wrong password')
)
on('GET', '/me', () => me)
on('PUT', '/me/password', (req) => (req.body?.old_password === 'admin' ? {} : fail(400, 'invalid_argument', 'wrong password', { fields: [{ field: 'old_password', code: 'mismatch', message: 'Current password is wrong' }] })))

on('GET', '/me/menus', () => [
  { section: 'overview', items: [{ id: 'dashboard', label: { en: 'Overview', zh: '概览' }, icon: 'dashboard', path: '/dashboard' }] },
  {
    section: 'gateway',
    items: [
      { id: 'groups', label: { en: 'Groups', zh: '分组' }, icon: 'group', path: '/groups' },
      { id: 'accounts', label: { en: 'Accounts', zh: '账号' }, icon: 'account', path: '/accounts' },
      { id: 'proxies', label: { en: 'Proxies', zh: '代理' }, icon: 'proxy', path: '/proxies' },
      { id: 'prices', label: { en: 'Model prices', zh: '模型价格' }, icon: 'price', path: '/prices' },
      { id: 'usage', label: { en: 'Usage logs', zh: '使用记录' }, icon: 'usage', path: '/usage' },
      { id: 'sticky', label: { en: 'Sticky sessions', zh: '粘性会话' }, icon: 'sticky', path: '/sticky' }
    ]
  },
  { section: 'finance', items: [{ id: 'ledger', label: { en: 'Balance ledger', zh: '余额流水' }, icon: 'ledger', path: '/ledger' }] },
  {
    section: 'system',
    items: [
      { id: 'users', label: { en: 'Users', zh: '用户' }, icon: 'user', path: '/users' },
      { id: 'roles', label: { en: 'Roles & permissions', zh: '角色与权限' }, icon: 'role', path: '/roles' },
      { id: 'api-keys', label: { en: 'All API keys', zh: '全部 API Key' }, icon: 'key', path: '/api-keys' },
      { id: 'plugins', label: { en: 'Plugins', zh: '插件' }, icon: 'plugin', path: '/plugins' },
      { id: 'market', label: { en: 'Plugin market', zh: '插件市场' }, icon: 'market', path: '/market' },
      { id: 'publishers', label: { en: 'Publishers', zh: '发布者' }, icon: 'publisher', path: '/publishers' },
      { id: 'nodes', label: { en: 'Cluster nodes', zh: '集群节点' }, icon: 'node', path: '/nodes' },
      { id: 'settings', label: { en: 'Settings', zh: '设置' }, icon: 'settings', path: '/settings' }
    ]
  },
  {
    section: 'me',
    items: [
      { id: 'my-api-keys', label: { en: 'API keys', zh: 'API Key' }, icon: 'key', path: '/me/api-keys' },
      { id: 'my-usage', label: { en: 'My usage', zh: '我的用量' }, icon: 'chart', path: '/me/usage' },
      { id: 'my-balance', label: { en: 'My balance', zh: '我的余额' }, icon: 'balance', path: '/me/balance' }
    ]
  },
  {
    section: 'plugins',
    items: [
      { id: 'anthropic.models', label: { en: 'Model catalog', zh: '模型目录' }, icon: 'puzzle', path: '/p/anthropic/models', plugin_key: 'anthropic' },
      { id: 'guard.guard', label: { en: 'Request guard', zh: '请求守卫' }, icon: 'shield', path: '/p/guard/dashboard', plugin_key: 'guard' }
    ]
  }
])

on('GET', '/me/balance', () => ({ balance: '12.34000000', updated_at: now() }))
