import { fail, now, on, type MockRequest } from './router'

// auth, me, menus

export const ALL_PERMISSIONS = [
  'user:read', 'user:create', 'user:update', 'user:delete',
  'role:read', 'role:manage',
  'apikey:self:manage', 'apikey:all:read', 'apikey:all:manage',
  'group:read', 'group:manage',
  'account:read', 'account:create', 'account:update', 'account:delete', 'account:test', 'account:credential:view',
  // CONTRACTS §21.1: own-level keys act on rows the caller created; settings:custom lifts the base_url guard.
  'account:own:read', 'account:own:create', 'account:own:update', 'account:own:delete', 'account:own:test', 'account:own:credential:view',
  'account:settings:custom',
  'proxy:read', 'proxy:manage', 'proxy:own:read', 'proxy:own:manage',
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

export interface Identity {
  id: number
  email: string
  display_name: string
  roles: string[]
  permissions: string[]
  superuser: boolean
}

export const me: Identity = {
  id: 1,
  email: 'admin@example.com',
  display_name: 'Admin',
  roles: ['super_admin'],
  permissions: ALL_PERMISSIONS,
  superuser: true
}

/** Sign in as user@example.com (password admin) to get the built-in "user" role. */
const plainUser: Identity = {
  id: 1,
  email: 'user@example.com',
  display_name: 'User',
  roles: ['user'],
  permissions: ['apikey:self:manage', 'balance:self:read', 'usage:self:read', 'gateway:use'],
  superuser: false
}

/**
 * Sign in as vendor@example.com (password admin): the "vendor" role of
 * CONTRACTS §21.1 (own-level account and proxy keys, no settings:custom).
 * Sees and edits only the accounts / proxies it created.
 */
export const vendorUser: Identity = {
  id: 6,
  email: 'vendor@example.com',
  display_name: 'Vendor',
  roles: ['vendor'],
  permissions: [
    'account:own:read', 'account:own:create', 'account:own:update', 'account:own:delete', 'account:own:test', 'account:own:credential:view',
    'proxy:own:read', 'proxy:own:manage',
    'group:read', 'gateway:use'
  ],
  superuser: false
}

/** Sign in as readonly@example.com (password admin): sees every account and proxy, changes nothing, no credentials. */
export const readonlyUser: Identity = {
  id: 7,
  email: 'readonly@example.com',
  display_name: 'Read only',
  roles: ['readonly'],
  permissions: ['account:read', 'proxy:read', 'group:read', 'gateway:use'],
  superuser: false
}

const identities = [me, plainUser, vendorUser, readonlyUser]

/** Email of a (possibly deleted) user id, for created_by_email. */
export function userEmail(id: number | null | undefined): string | null {
  if (id == null) return null
  return identities.find((u) => u.id === id)?.email ?? KNOWN_EMAILS[id] ?? null
}
const KNOWN_EMAILS: Record<number, string> = { 2: 'ops@example.com', 3: 'li.si@example.com', 5: 'old@example.com' }

export function hasPerm(who: Identity, key: string | string[]): boolean {
  if (who.superuser) return true
  const list = Array.isArray(key) ? key : [key]
  return list.some((k) => who.permissions.includes(k))
}

/**
 * Owner scope of a caller (CONTRACTS §21.1, core.OwnerScope): `all` with the
 * all-level key, `own` with only the own-level key, null with neither.
 */
export function ownerScope(who: Identity, allKey: string, ownKey: string): 'all' | 'own' | null {
  if (hasPerm(who, allKey)) return 'all'
  if (hasPerm(who, ownKey)) return 'own'
  return null
}

/** Whether `row` (created_by) is reachable by the caller under the scope; null owners need the all level. */
export function inScope(scope: 'all' | 'own' | null, who: Identity, row: { created_by?: number | null }): boolean {
  if (scope === 'all') return true
  if (scope === 'own') return row.created_by != null && row.created_by === who.id
  return false
}

/** Applies the ?mine=true and ?created_by= list filters (the latter only at the all level). */
export function filterOwned<T extends { created_by?: number | null }>(rows: T[], scope: 'all' | 'own' | null, who: Identity, q: Record<string, string>): T[] {
  let out = rows.filter((r) => inScope(scope, who, r))
  if (q.mine === 'true') out = out.filter((r) => r.created_by === who.id)
  if (scope === 'all' && q.created_by) out = out.filter((r) => r.created_by === Number(q.created_by))
  return out
}

// Sessions (CONTRACTS §14.2). Refresh tokens belong to a family created at
// login and rotate on every refresh; presenting a rotated (or revoked) token
// again revokes the whole family. Access tokens carry their family, so a
// revoked family also fails with 401 on the next request.
interface Family {
  current: string
  revoked: boolean
  seq: number
  user: Identity
}
const families = new Map<string, Family>()
let familySeq = 0

function issue(fam: string) {
  const f = families.get(fam)!
  f.seq++
  f.current = `mock-refresh-${fam}-${f.seq}`
  return { access_token: `mock-access-${fam}-${f.seq}-${Date.now()}`, refresh_token: f.current, expires_in: 7200, user: f.user }
}

function newFamily(user: Identity = me) {
  const fam = `f${++familySeq}`
  families.set(fam, { current: '', revoked: false, seq: 0, user })
  return issue(fam)
}

/** The signed-in identity of a request (admin for tokens of unknown families). */
function whoAmI(auth: string | undefined): Identity {
  const m = /^Bearer\s+mock-access-(f\d+)-/i.exec(auth || '')
  return (m && families.get(m[1])?.user) || me
}

/** The signed-in identity of a mock request. */
export function caller(req: MockRequest): Identity {
  return whoAmI(req.headers.authorization)
}

/**
 * Checks the bearer token of a console request: "mock-access-<family>-..."
 * tokens are rejected once their family is revoked; tokens of an unknown
 * family (issued before a mock restart) stay valid; "expired" always fails.
 */
export function accessTokenValid(auth: string | undefined): boolean {
  if (!auth) return true
  const tok = auth.replace(/^Bearer\s+/i, '')
  if (tok === 'expired') return false
  const m = /^mock-access-(f\d+)-/.exec(tok)
  if (!m) return true
  const f = families.get(m[1])
  return !f || !f.revoked
}

// Login rate limit (CONTRACTS §14.2, shortened for the mock): 5 failures for
// an email lock it for 30 seconds -> 429 rate_limited + retry_after_seconds.
const LOGIN_MAX_FAILURES = 5
const LOGIN_LOCK_SECONDS = 30
const loginFailures = new Map<string, { count: number; lockedUntil: number }>()

on('POST', '/auth/login', (req) => {
  const email = String(req.body?.email || '').toLowerCase()
  const st = loginFailures.get(email)
  if (st && st.lockedUntil > Date.now()) {
    const retry = Math.ceil((st.lockedUntil - Date.now()) / 1000)
    return fail(429, 'rate_limited', 'too many failed sign-in attempts', { retry_after_seconds: retry })
  }
  if (!email || req.body?.password !== 'admin') {
    const s = st && st.lockedUntil <= Date.now() && st.count >= LOGIN_MAX_FAILURES ? { count: 0, lockedUntil: 0 } : st || { count: 0, lockedUntil: 0 }
    s.count++
    if (s.count >= LOGIN_MAX_FAILURES) s.lockedUntil = Date.now() + LOGIN_LOCK_SECONDS * 1000
    loginFailures.set(email, s)
    return fail(401, 'unauthenticated', 'invalid email or password (mock password: admin)')
  }
  loginFailures.delete(email)
  return newFamily(identities.find((u) => u.email === email) || me)
})
on('POST', '/auth/refresh', (req) => {
  const tok = String(req.body?.refresh_token || '')
  // Legacy tokens from before this mock version: start a new family.
  if (tok === 'mock-refresh') return newFamily()
  const m = /^mock-refresh-(f\d+)-\d+$/.exec(tok)
  const f = m ? families.get(m[1]) : undefined
  if (!f) return fail(401, 'unauthenticated', 'invalid refresh token')
  if (f.revoked) return fail(401, 'unauthenticated', 'refresh token revoked')
  if (f.current !== tok) {
    // Reuse of a rotated token: revoke the whole login.
    f.revoked = true
    return fail(401, 'unauthenticated', 'refresh token reuse detected; session revoked')
  }
  return issue(m![1])
})
on('POST', '/auth/logout', (req) => {
  const m = /^mock-refresh-(f\d+)-\d+$/.exec(String(req.body?.refresh_token || ''))
  const f = m ? families.get(m[1]) : undefined
  if (f) f.revoked = true
  return {}
})
on('POST', '/auth/step-up', (req) =>
  req.body?.password === 'admin' ? { step_up_token: 'mock-stepup', expires_in: 300 } : fail(401, 'unauthenticated', 'wrong password')
)
on('GET', '/me', (req) => whoAmI(req.headers.authorization))
on('PUT', '/me/password', (req) => (req.body?.old_password === 'admin' ? {} : fail(400, 'invalid_argument', 'wrong password', { fields: [{ field: 'old_password', code: 'mismatch', message: 'Current password is wrong' }] })))

// Permission of each core menu path (CONTRACTS §21.2 for accounts / platforms / proxies); plugin items need their plugin permission.
const MENU_PERMS: Record<string, string | string[]> = {
  '/groups': 'group:read',
  '/accounts': ['account:read', 'account:own:read', 'account:own:create'],
  '/proxies': ['proxy:read', 'proxy:own:read', 'proxy:own:manage'],
  '/prices': 'price:read',
  '/usage': 'usage:all:read',
  '/sticky': 'sticky:read',
  '/ledger': 'balance:all:read',
  '/users': 'user:read',
  '/roles': 'role:read',
  '/api-keys': 'apikey:all:read',
  '/platforms': ['account:read', 'account:own:read', 'account:own:create'],
  '/plugins': 'plugin:read',
  '/market': 'plugin:market:read',
  '/publishers': 'publisher:read',
  '/nodes': 'node:read',
  '/settings': ['settings:read', 'sticky:read'],
  '/me/api-keys': 'apikey:self:manage',
  '/me/usage': 'usage:self:read',
  '/me/balance': 'balance:self:read',
  '/p/anthropic/models': 'plugin.anthropic:model_catalog:read',
  '/p/guard/dashboard': 'plugin.guard:stats:read'
}

on('GET', '/me/menus', (req) => {
  const who = caller(req)
  return MENUS.map((s) => ({ ...s, items: s.items.filter((i) => !MENU_PERMS[i.path] || hasPerm(who, MENU_PERMS[i.path])) })).filter((s) => s.items.length)
})

const MENUS = [
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
]

on('GET', '/me/balance', () => ({ balance: '12.34000000', updated_at: now() }))
