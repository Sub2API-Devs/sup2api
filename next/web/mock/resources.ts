// Mock handlers: users, roles, permissions, API keys, groups, proxies, nodes,
// publishers. (Accounts and account types live in their own mock module.)
import { fail, needStepUp, nextId, noContent, now, on, paginate, type MockRequest } from './router'
import { ALL_PERMISSIONS } from './core'
import { groupAccountCount, groupPlatforms } from './accounts'

type L = { en: string; zh: string }
const L = (en: string, zh: string): L => ({ en, zh })

function match(q: string | undefined, ...fields: Array<string | undefined | null>) {
  if (!q) return true
  const s = q.toLowerCase()
  return fields.some((f) => (f || '').toLowerCase().includes(s))
}

function invalid(field: string, message: string) {
  return fail(400, 'invalid_argument', message, { fields: [{ field, code: 'invalid', message }] })
}

// ------------------------------------------------------------------ permissions

interface PermDef {
  key: string
  label: L
  sensitive?: boolean
  status?: string
}
interface ModuleDef {
  module: string
  label: L
  source: 'core' | 'plugin'
  plugin_key?: string | null
  status: string
  permissions: PermDef[]
}

const MODULES: ModuleDef[] = [
  { module: 'user', label: L('Users', '用户'), source: 'core', status: 'active', permissions: [
    { key: 'user:read', label: L('View', '查看') }, { key: 'user:create', label: L('Create', '新建') },
    { key: 'user:update', label: L('Edit', '编辑') }, { key: 'user:delete', label: L('Delete', '删除'), sensitive: true }] },
  { module: 'role', label: L('Roles', '角色'), source: 'core', status: 'active', permissions: [
    { key: 'role:read', label: L('View', '查看') }, { key: 'role:manage', label: L('Manage', '管理'), sensitive: true }] },
  { module: 'apikey', label: L('API keys', 'API Key'), source: 'core', status: 'active', permissions: [
    { key: 'apikey:self:manage', label: L('Manage own', '管理自己的') }, { key: 'apikey:all:read', label: L('View all', '查看全部') },
    { key: 'apikey:all:manage', label: L('Manage all', '管理全部') }] },
  { module: 'group', label: L('Groups', '分组'), source: 'core', status: 'active', permissions: [
    { key: 'group:read', label: L('View', '查看') }, { key: 'group:manage', label: L('Manage', '管理') }] },
  { module: 'account', label: L('Accounts', '账号'), source: 'core', status: 'active', permissions: [
    { key: 'account:read', label: L('View', '查看') }, { key: 'account:create', label: L('Create', '新建') },
    { key: 'account:update', label: L('Edit', '编辑') }, { key: 'account:delete', label: L('Delete', '删除'), sensitive: true },
    { key: 'account:test', label: L('Test', '测试') }, { key: 'account:credential:view', label: L('View credentials', '查看凭证'), sensitive: true }] },
  { module: 'proxy', label: L('Proxies', '代理'), source: 'core', status: 'active', permissions: [
    { key: 'proxy:read', label: L('View', '查看') }, { key: 'proxy:manage', label: L('Manage', '管理') }] },
  { module: 'price', label: L('Prices', '价格'), source: 'core', status: 'active', permissions: [
    { key: 'price:read', label: L('View', '查看') }, { key: 'price:manage', label: L('Manage', '管理') }] },
  { module: 'balance', label: L('Balance', '余额'), source: 'core', status: 'active', permissions: [
    { key: 'balance:self:read', label: L('View own', '查看自己的') }, { key: 'balance:all:read', label: L('View all', '查看全部') },
    { key: 'balance:adjust', label: L('Adjust', '调整'), sensitive: true }] },
  { module: 'usage', label: L('Usage', '使用记录'), source: 'core', status: 'active', permissions: [
    { key: 'usage:self:read', label: L('View own', '查看自己的') }, { key: 'usage:all:read', label: L('View all', '查看全部') }] },
  { module: 'sticky', label: L('Sticky sessions', '粘性会话'), source: 'core', status: 'active', permissions: [
    { key: 'sticky:read', label: L('View', '查看') }, { key: 'sticky:manage', label: L('Manage', '管理') }] },
  { module: 'plugin', label: L('Plugins', '插件管理'), source: 'core', status: 'active', permissions: [
    { key: 'plugin:read', label: L('View', '查看') }, { key: 'plugin:install', label: L('Install', '安装'), sensitive: true },
    { key: 'plugin:manage', label: L('Manage', '管理') }, { key: 'plugin:uninstall', label: L('Uninstall', '卸载'), sensitive: true },
    { key: 'plugin:grant:high', label: L('Grant high risk', '授予高风险权限') },
    { key: 'plugin:grant:critical', label: L('Grant critical risk', '授予极高风险权限'), sensitive: true },
    { key: 'plugin:egress:read', label: L('View egress', '查看出口流量') }, { key: 'plugin:market:read', label: L('Browse market', '浏览市场') }] },
  { module: 'publisher', label: L('Publishers', '发布者'), source: 'core', status: 'active', permissions: [
    { key: 'publisher:read', label: L('View', '查看') }, { key: 'publisher:manage', label: L('Manage', '管理'), sensitive: true }] },
  { module: 'node', label: L('Cluster', '集群'), source: 'core', status: 'active', permissions: [{ key: 'node:read', label: L('View nodes', '查看节点') }] },
  { module: 'gateway', label: L('Gateway', '网关'), source: 'core', status: 'active', permissions: [{ key: 'gateway:use', label: L('Call gateway', '调用网关') }] },
  { module: 'settings', label: L('Settings', '系统设置'), source: 'core', status: 'active', permissions: [
    { key: 'settings:read', label: L('View', '查看') }, { key: 'settings:manage', label: L('Manage', '管理') }] },
  { module: 'plugin.anthropic', label: L('Anthropic', 'Anthropic'), source: 'plugin', plugin_key: 'anthropic', status: 'active', permissions: [
    { key: 'plugin.anthropic:model_catalog:read', label: L('View model catalog', '查看模型目录') }] },
  { module: 'plugin.guard', label: L('Guard', 'Guard'), source: 'plugin', plugin_key: 'guard', status: 'active', permissions: [
    { key: 'plugin.guard:stats:read', label: L('View stats', '查看统计') }, { key: 'plugin.guard:rules:read', label: L('View rules', '查看规则') },
    { key: 'plugin.guard:rules:manage', label: L('Manage rules', '管理规则'), sensitive: true }] },
  { module: 'plugin.foo', label: L('Foo Platform', 'Foo 平台'), source: 'plugin', plugin_key: 'foo', status: 'disabled', permissions: [
    { key: 'plugin.foo:dashboard:read', label: L('View dashboard', '查看面板'), status: 'disabled' }] }
]

on('GET', '/permissions', () =>
  MODULES.map((m) => ({
    ...m,
    plugin_key: m.plugin_key ?? null,
    permissions: m.permissions.map((p) => ({ key: p.key, label: p.label, sensitive: !!p.sensitive, status: p.status || m.status }))
  }))
)

// ------------------------------------------------------------------ roles

interface MockRole {
  id: number
  key: string
  name: L
  description: string
  builtin: boolean
  superuser: boolean
  permission_keys: string[]
  created_at: string
  updated_at: string
}

const CORE_KEYS = ALL_PERMISSIONS.filter((k) => !k.startsWith('plugin.'))
const roles: MockRole[] = [
  { id: 1, key: 'super_admin', name: L('Super admin', '超级管理员'), description: 'Has every permission', builtin: true, superuser: true, permission_keys: [], created_at: now(-86400 * 90), updated_at: now(-86400 * 90) },
  { id: 2, key: 'admin', name: L('Administrator', '管理员'), description: 'All core permissions', builtin: true, superuser: false, permission_keys: [...CORE_KEYS], created_at: now(-86400 * 90), updated_at: now(-86400 * 10) },
  { id: 3, key: 'user', name: L('User', '普通用户'), description: 'Own keys, usage and balance', builtin: true, superuser: false, permission_keys: ['apikey:self:manage', 'balance:self:read', 'usage:self:read', 'gateway:use'], created_at: now(-86400 * 90), updated_at: now(-86400 * 90) },
  { id: 4, key: 'operator', name: L('Operator', '运营'), description: 'Day-to-day account operations', builtin: false, superuser: false, permission_keys: ['account:read', 'account:create', 'account:update', 'account:test', 'group:read', 'proxy:read', 'proxy:manage', 'plugin.anthropic:model_catalog:read', 'plugin.guard:stats:read', 'plugin.foo:dashboard:read'], created_at: now(-86400 * 20), updated_at: now(-86400 * 2) }
]

function roleOut(r: MockRole) {
  return { ...r, user_count: users.filter((u) => u.roles.includes(r.key)).length }
}

on('GET', '/roles', (req) => paginate(roles.map(roleOut), req.query))
on('POST', '/roles', (req) => {
  const b = req.body || {}
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(b.key || '')) return invalid('key', 'invalid role key')
  if (roles.some((r) => r.key === b.key)) return fail(409, 'conflict', 'role key already exists')
  const r: MockRole = { id: nextId(), key: b.key, name: b.name || L(b.key, b.key), description: b.description || '', builtin: false, superuser: false, permission_keys: [], created_at: now(), updated_at: now() }
  roles.push(r)
  return roleOut(r)
})
on('PATCH', '/roles/:id', (req) => {
  const r = roles.find((x) => x.id === Number(req.params.id))
  if (!r) return fail(404, 'not_found', 'role not found')
  if (r.superuser) return fail(403, 'permission_denied', 'superuser role cannot be edited')
  const su = needStepUp(req)
  if (su) return su
  if (req.body?.name) r.name = req.body.name
  if (req.body?.description !== undefined) r.description = req.body.description
  r.updated_at = now()
  return roleOut(r)
})
on('DELETE', '/roles/:id', (req) => {
  const r = roles.find((x) => x.id === Number(req.params.id))
  if (!r) return fail(404, 'not_found', 'role not found')
  if (r.builtin) return fail(409, 'conflict', 'built-in roles cannot be deleted')
  const su = needStepUp(req)
  if (su) return su
  roles.splice(roles.indexOf(r), 1)
  users.forEach((u) => (u.roles = u.roles.filter((k) => k !== r.key)))
  return noContent()
})
on('PUT', '/roles/:id/permissions', (req) => {
  const r = roles.find((x) => x.id === Number(req.params.id))
  if (!r) return fail(404, 'not_found', 'role not found')
  if (r.superuser) return fail(403, 'permission_denied', 'superuser role cannot be edited')
  const su = needStepUp(req)
  if (su) return su
  const known = new Set(MODULES.flatMap((m) => m.permissions.map((p) => p.key)))
  const keys: string[] = Array.isArray(req.body?.permission_keys) ? req.body.permission_keys : []
  const bad = keys.find((k) => !known.has(k))
  if (bad) return invalid('permission_keys', `unknown permission ${bad}`)
  r.permission_keys = [...new Set(keys)]
  r.updated_at = now()
  return roleOut(r)
})

// ------------------------------------------------------------------ groups

interface MockGroup {
  id: number
  name: string
  description: string
  status: string
  rate_multiplier: string
  visibility: 'public' | 'restricted'
  model_allowlist: string[]
  account_count: number
  created_at: string
}

const groups: MockGroup[] = [
  { id: 1, name: 'default', description: 'Default group for everyone', status: 'active', rate_multiplier: '1', visibility: 'public', model_allowlist: [], account_count: 8, created_at: now(-86400 * 60) },
  { id: 2, name: 'vip', description: 'Discounted Claude access', status: 'active', rate_multiplier: '0.8', visibility: 'restricted', model_allowlist: ['claude-*'], account_count: 3, created_at: now(-86400 * 30) },
  { id: 3, name: 'haiku-only', description: 'Cheap models for batch jobs', status: 'disabled', rate_multiplier: '0.5', visibility: 'restricted', model_allowlist: ['claude-3-5-haiku*', 'claude-haiku-4*'], account_count: 1, created_at: now(-86400 * 5) },
  { id: 4, name: 'gemini-trial', description: 'Planned Gemini access (no accounts yet)', status: 'active', rate_multiplier: '1', visibility: 'public', model_allowlist: ['gemini-*'], account_count: 0, created_at: now(-86400 * 1) }
]

// account_count and platforms come from the accounts mock (CONTRACTS §13);
// the key count uses the server spelling api_key_count.
function groupOut(g: MockGroup) {
  return { ...g, account_count: groupAccountCount(g.id), platforms: groupPlatforms(g.id), api_key_count: keys.filter((k) => k.group_id === g.id).length }
}

function validateGroup(b: any) {
  if (b.name !== undefined && !String(b.name).trim()) return invalid('name', 'name is required')
  if (b.rate_multiplier !== undefined && !(Number(b.rate_multiplier) >= 0)) return invalid('rate_multiplier', 'must be a non-negative number')
  if (b.visibility !== undefined && !['public', 'restricted'].includes(b.visibility)) return invalid('visibility', 'invalid visibility')
  return null
}

on('GET', '/groups', (req) => paginate(groups.filter((g) => match(req.query.q, g.name, g.description)).map(groupOut), req.query))
on('GET', '/groups/:id', (req) => {
  const g = groups.find((x) => x.id === Number(req.params.id))
  return g ? groupOut(g) : fail(404, 'not_found', 'group not found')
})
on('POST', '/groups', (req) => {
  const b = req.body || {}
  const err = validateGroup({ name: b.name ?? '', ...b })
  if (err) return err
  if (groups.some((g) => g.name === b.name)) return invalid('name', 'name already in use')
  const g: MockGroup = {
    id: nextId(),
    name: b.name,
    description: b.description || '',
    status: b.status || 'active',
    rate_multiplier: String(b.rate_multiplier ?? '1'),
    visibility: b.visibility || 'public',
    model_allowlist: b.model_allowlist || [],
    account_count: 0,
    created_at: now()
  }
  groups.push(g)
  return groupOut(g)
})
on('PATCH', '/groups/:id', (req) => {
  const g = groups.find((x) => x.id === Number(req.params.id))
  if (!g) return fail(404, 'not_found', 'group not found')
  const err = validateGroup(req.body || {})
  if (err) return err
  const b = req.body || {}
  for (const k of ['name', 'description', 'status', 'visibility', 'model_allowlist'] as const) if (b[k] !== undefined) (g as any)[k] = b[k]
  if (b.rate_multiplier !== undefined) g.rate_multiplier = String(b.rate_multiplier)
  return groupOut(g)
})
on('DELETE', '/groups/:id', (req) => {
  const g = groups.find((x) => x.id === Number(req.params.id))
  if (!g) return fail(404, 'not_found', 'group not found')
  if (keys.some((k) => k.group_id === g.id)) return fail(409, 'conflict', 'group still has API keys')
  groups.splice(groups.indexOf(g), 1)
  return noContent()
})

// ------------------------------------------------------------------ users

interface MockUser {
  id: number
  email: string
  display_name: string
  status: string
  max_concurrency: number
  roles: string[]
  group_ids: number[]
  balance: string
  last_login_at: string | null
  created_at: string
  updated_at: string
}

const users: MockUser[] = [
  { id: 1, email: 'admin@example.com', display_name: 'Admin', status: 'active', max_concurrency: 0, roles: ['super_admin'], group_ids: [1, 2], balance: '12.34000000', last_login_at: now(-60), created_at: now(-86400 * 90), updated_at: now(-86400) },
  { id: 2, email: 'ops@example.com', display_name: '张三', status: 'active', max_concurrency: 10, roles: ['operator', 'user'], group_ids: [1], balance: '85.50000000', last_login_at: now(-3600 * 5), created_at: now(-86400 * 40), updated_at: now(-86400 * 3) },
  { id: 3, email: 'li.si@example.com', display_name: '李四', status: 'active', max_concurrency: 5, roles: ['operator'], group_ids: [1, 2], balance: '3.21000000', last_login_at: now(-86400 * 2), created_at: now(-86400 * 20), updated_at: now(-86400 * 2) },
  { id: 4, email: 'dev@acme.io', display_name: 'Acme Dev', status: 'active', max_concurrency: 3, roles: ['user'], group_ids: [2], balance: '250.00000000', last_login_at: now(-600), created_at: now(-86400 * 10), updated_at: now(-86400) },
  { id: 5, email: 'old@example.com', display_name: 'Former user', status: 'disabled', max_concurrency: 1, roles: ['user'], group_ids: [], balance: '0.00000000', last_login_at: null, created_at: now(-86400 * 80), updated_at: now(-86400 * 30) }
]
for (let i = 0; i < 18; i++) {
  users.push({ id: 100 + i, email: `user${i + 1}@example.org`, display_name: `User ${i + 1}`, status: i % 7 === 6 ? 'disabled' : 'active', max_concurrency: 3, roles: ['user'], group_ids: [1], balance: (Math.random() * 50).toFixed(8), last_login_at: i % 3 ? now(-3600 * i) : null, created_at: now(-86400 * (i + 1)), updated_at: now(-3600 * i) })
}

function findUser(req: MockRequest) {
  return users.find((u) => u.id === Number(req.params.id))
}

on('GET', '/users', (req) => {
  const { q, status, role } = req.query
  const items = users.filter((u) => match(q, u.email, u.display_name) && (!status || u.status === status) && (!role || u.roles.includes(role)))
  return paginate(items, req.query)
})
on('GET', '/users/:id', (req) => findUser(req) || fail(404, 'not_found', 'user not found'))
on('POST', '/users', (req) => {
  const b = req.body || {}
  if (!/^[^@\s]+@[^@\s]+$/.test(b.email || '')) return invalid('email', 'invalid email')
  if (users.some((u) => u.email === b.email)) return invalid('email', 'email already registered')
  if (!b.password || String(b.password).length < 8) return invalid('password', 'password must be at least 8 characters')
  const roleKeys: string[] = Array.isArray(b.role_keys) && b.role_keys.length ? b.role_keys : ['user']
  if (roleKeys.some((k) => k !== 'user')) {
    const su = needStepUp(req)
    if (su) return su
  }
  const u: MockUser = { id: nextId(), email: b.email, display_name: b.display_name || '', status: 'active', max_concurrency: Number(b.max_concurrency) || 0, roles: roleKeys, group_ids: [], balance: '0.00000000', last_login_at: null, created_at: now(), updated_at: now() }
  users.unshift(u)
  return u
})
on('PATCH', '/users/:id', (req) => {
  const u = findUser(req)
  if (!u) return fail(404, 'not_found', 'user not found')
  const b = req.body || {}
  if (b.max_concurrency !== undefined && !(Number(b.max_concurrency) >= 0)) return invalid('max_concurrency', 'must be >= 0')
  if (b.display_name !== undefined) u.display_name = b.display_name
  if (b.status !== undefined) u.status = b.status
  if (b.max_concurrency !== undefined) u.max_concurrency = Number(b.max_concurrency)
  u.updated_at = now()
  return u
})
on('DELETE', '/users/:id', (req) => {
  const u = findUser(req)
  if (!u) return fail(404, 'not_found', 'user not found')
  const su = needStepUp(req)
  if (su) return su
  if (u.roles.includes('super_admin') && users.filter((x) => x.roles.includes('super_admin')).length <= 1) return fail(409, 'conflict', 'at least one super_admin must remain')
  users.splice(users.indexOf(u), 1)
  return noContent()
})
on('PUT', '/users/:id/roles', (req) => {
  const u = findUser(req)
  if (!u) return fail(404, 'not_found', 'user not found')
  const su = needStepUp(req)
  if (su) return su
  const keys: string[] = Array.isArray(req.body?.role_keys) ? req.body.role_keys : []
  const bad = keys.find((k) => !roles.some((r) => r.key === k))
  if (bad) return invalid('role_keys', `unknown role ${bad}`)
  u.roles = keys
  return u
})
on('PUT', '/users/:id/groups', (req) => {
  const u = findUser(req)
  if (!u) return fail(404, 'not_found', 'user not found')
  u.group_ids = Array.isArray(req.body?.group_ids) ? req.body.group_ids.map(Number) : []
  return u
})
on('POST', '/users/:id/balance/adjust', (req) => {
  const u = findUser(req)
  if (!u) return fail(404, 'not_found', 'user not found')
  const su = needStepUp(req)
  if (su) return su
  const amount = String(req.body?.amount ?? '')
  if (!/^\d+(\.\d{1,8})?$/.test(amount) || Number(amount) <= 0) return invalid('amount', 'amount must be a positive decimal')
  const delta = (req.body?.credit ? 1 : -1) * Number(amount)
  const next = Number(u.balance) + delta
  if (next < 0) return fail(402, 'insufficient_balance', 'balance would become negative')
  u.balance = next.toFixed(8)
  return { id: nextId(), user_id: u.id, delta: delta.toFixed(8), balance_after: u.balance, kind: 'admin_adjust', ref_type: 'admin', ref_id: '', note: req.body?.note || '', created_at: now() }
})

// ------------------------------------------------------------------ API keys

interface MockKey {
  id: number
  user_id: number
  group_id: number
  name: string
  key_prefix: string
  status: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

const ME_ID = 1
const keys: MockKey[] = [
  { id: 1, user_id: 1, group_id: 1, name: 'laptop', key_prefix: 'sk-s2a-a1b2', status: 'active', expires_at: null, last_used_at: now(-42), created_at: now(-86400 * 30) },
  { id: 2, user_id: 1, group_id: 2, name: 'ci-runner', key_prefix: 'sk-s2a-c3d4', status: 'active', expires_at: now(86400 * 60), last_used_at: now(-3600 * 3), created_at: now(-86400 * 12) },
  { id: 3, user_id: 1, group_id: 1, name: 'old-script', key_prefix: 'sk-s2a-e5f6', status: 'active', expires_at: now(-86400), last_used_at: now(-86400 * 3), created_at: now(-86400 * 50) },
  { id: 4, user_id: 2, group_id: 1, name: 'ops-tools', key_prefix: 'sk-s2a-g7h8', status: 'active', expires_at: null, last_used_at: now(-300), created_at: now(-86400 * 8) },
  { id: 5, user_id: 4, group_id: 2, name: 'acme-prod', key_prefix: 'sk-s2a-i9j0', status: 'disabled', expires_at: null, last_used_at: now(-86400 * 4), created_at: now(-86400 * 9) }
]

function keyOut(k: MockKey) {
  return { ...k, user_email: users.find((u) => u.id === k.user_id)?.email, group_name: groups.find((g) => g.id === k.group_id)?.name, platforms: groupPlatforms(k.group_id) }
}

function randomToken(n: number) {
  const abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)]
  return s
}

function myGroups() {
  const me = users.find((u) => u.id === ME_ID)
  return groups.filter((g) => g.status === 'active' && (g.visibility === 'public' || me?.group_ids.includes(g.id))).map(groupOut)
}

on('GET', '/me/groups', () => myGroups())
on('GET', '/me/api-keys', (req) => paginate(keys.filter((k) => k.user_id === ME_ID).map(keyOut), req.query))
on('POST', '/me/api-keys', (req) => {
  const b = req.body || {}
  if (!String(b.name || '').trim()) return invalid('name', 'name is required')
  if (!myGroups().some((g) => g.id === Number(b.group_id))) return invalid('group_id', 'group not available')
  const token = 'sk-s2a-' + randomToken(40)
  const k: MockKey = { id: nextId(), user_id: ME_ID, group_id: Number(b.group_id), name: b.name, key_prefix: token.slice(0, 11), status: 'active', expires_at: b.expires_at || null, last_used_at: null, created_at: now() }
  keys.unshift(k)
  return { ...keyOut(k), key: token }
})
on('DELETE', '/me/api-keys/:id', (req) => {
  const k = keys.find((x) => x.id === Number(req.params.id) && x.user_id === ME_ID)
  if (!k) return fail(404, 'not_found', 'api key not found')
  keys.splice(keys.indexOf(k), 1)
  return noContent()
})
on('GET', '/api-keys', (req) => {
  const { q, user_id, status } = req.query
  const items = keys.filter((k) => match(q, k.name, k.key_prefix) && (!user_id || k.user_id === Number(user_id)) && (!status || k.status === status))
  return paginate(items.map(keyOut), req.query)
})
on('PATCH', '/api-keys/:id', (req) => {
  const k = keys.find((x) => x.id === Number(req.params.id))
  if (!k) return fail(404, 'not_found', 'api key not found')
  if (req.body?.status) k.status = req.body.status
  if (req.body?.name) k.name = req.body.name
  return keyOut(k)
})
on('DELETE', '/api-keys/:id', (req) => {
  const k = keys.find((x) => x.id === Number(req.params.id))
  if (!k) return fail(404, 'not_found', 'api key not found')
  keys.splice(keys.indexOf(k), 1)
  return noContent()
})

// ------------------------------------------------------------------ proxies

interface MockProxy {
  id: number
  name: string
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username: string
  password: string
  status: string
  created_at: string
}

const proxies: MockProxy[] = [
  { id: 1, name: 'us-west-1', protocol: 'http', host: '10.0.1.20', port: 3128, username: '', password: '', status: 'active', created_at: now(-86400 * 40) },
  { id: 2, name: 'jp-residential', protocol: 'socks5', host: 'jp.proxy.example.net', port: 1080, username: 'acme', password: 's3cret', status: 'active', created_at: now(-86400 * 15) },
  { id: 3, name: 'eu-backup', protocol: 'https', host: 'eu.proxy.example.net', port: 443, username: 'backup', password: 'pw', status: 'disabled', created_at: now(-86400 * 3) }
]

function proxyOut(p: MockProxy) {
  return { ...p, password: p.password ? '******' : '' }
}

function validateProxy(b: any, partial: boolean) {
  if ((!partial || b.name !== undefined) && !String(b.name || '').trim()) return invalid('name', 'name is required')
  if ((!partial || b.protocol !== undefined) && !['http', 'https', 'socks5'].includes(b.protocol)) return invalid('protocol', 'invalid protocol')
  if ((!partial || b.host !== undefined) && !String(b.host || '').trim()) return invalid('host', 'host is required')
  if ((!partial || b.port !== undefined) && !(Number(b.port) >= 1 && Number(b.port) <= 65535)) return invalid('port', 'port out of range')
  return null
}

on('GET', '/proxies', (req) => paginate(proxies.map(proxyOut), req.query))
on('POST', '/proxies', (req) => {
  const b = req.body || {}
  const err = validateProxy(b, false)
  if (err) return err
  const p: MockProxy = { id: nextId(), name: b.name, protocol: b.protocol, host: b.host, port: Number(b.port), username: b.username || '', password: b.password || '', status: 'active', created_at: now() }
  proxies.push(p)
  return proxyOut(p)
})
on('PATCH', '/proxies/:id', (req) => {
  const p = proxies.find((x) => x.id === Number(req.params.id))
  if (!p) return fail(404, 'not_found', 'proxy not found')
  const b = req.body || {}
  const err = validateProxy(b, true)
  if (err) return err
  for (const k of ['name', 'protocol', 'host', 'username', 'status'] as const) if (b[k] !== undefined) (p as any)[k] = b[k]
  if (b.port !== undefined) p.port = Number(b.port)
  if (b.password !== undefined && b.password !== '******') p.password = b.password
  return proxyOut(p)
})
on('DELETE', '/proxies/:id', (req) => {
  const p = proxies.find((x) => x.id === Number(req.params.id))
  if (!p) return fail(404, 'not_found', 'proxy not found')
  proxies.splice(proxies.indexOf(p), 1)
  return noContent()
})
on('POST', '/proxies/:id/test', async (req) => {
  const p = proxies.find((x) => x.id === Number(req.params.id))
  if (!p) return fail(404, 'not_found', 'proxy not found')
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
  if (p.status !== 'active' || p.host.startsWith('eu.')) return { ok: false, latency_ms: 5000, message: 'dial tcp: i/o timeout' }
  return { ok: true, latency_ms: Math.round(80 + Math.random() * 300), ip: p.host.startsWith('jp') ? '203.0.113.' + Math.floor(Math.random() * 250) : '198.51.100.7', message: 'HTTP 200 from https://api.ipify.org' }
})

// ------------------------------------------------------------------ nodes

const bootA = 'b7f1c2d4-8e9a-4b0c-a1d2-3e4f5a6b7c8d'
const bootB = 'c0ffee00-1234-4abc-9def-0123456789ab'
const startedA = now(-86400 * 2 - 3600 * 5)
const startedB = now(-3600 * 7)

on('GET', '/nodes', () => [
  {
    node_id: 'node-1',
    boot_id: bootA,
    addr: '10.0.0.11:8080',
    host_version: '0.1.0',
    started_at: startedA,
    last_heartbeat: now(-Math.floor(Math.random() * 4)),
    plugins: {
      anthropic: JSON.stringify({ version: '0.1.0', state: 'running' }),
      guard: { version: '0.1.0', state: 'running' }
    }
  },
  {
    node_id: 'node-2',
    boot_id: bootB,
    addr: '10.0.0.12:8080',
    host_version: '0.1.0',
    started_at: startedB,
    last_heartbeat: now(-Math.floor(Math.random() * 4)),
    plugins: {
      anthropic: JSON.stringify({ version: '0.1.0', state: 'running' }),
      guard: JSON.stringify({ version: '0.2.0', state: 'starting' })
    }
  },
  {
    node_id: 'node-3',
    boot_id: 'dead0000-0000-4000-8000-000000000003',
    addr: '10.0.0.13:8080',
    host_version: '0.0.9',
    started_at: now(-86400 * 9),
    last_heartbeat: now(-95),
    plugins: {
      anthropic: JSON.stringify({ version: '0.1.0', state: 'failed', error: 'health check timeout' })
    }
  }
])

// ------------------------------------------------------------------ publishers

interface MockPublisherKey {
  key_id: string
  public_key: string
  status: string
  not_before: string | null
  not_after: string | null
  created_at: string
}
interface MockPublisher {
  id: number
  name: string
  trust_level: string
  status: string
  created_at: string
  revoked_at: string | null
  keys: MockPublisherKey[]
}

const publishers: MockPublisher[] = [
  { id: 1, name: 'sub2api', trust_level: 'official', status: 'active', created_at: now(-86400 * 120), revoked_at: null, keys: [
    { key_id: 'sub2api-2026', public_key: 'Hn0l9pJ3vWqg1H1Zb7xg6Yx0cF5m3r2Lk8QwTzA4uYs=', status: 'active', not_before: now(-86400 * 120), not_after: now(86400 * 365), created_at: now(-86400 * 120) },
    { key_id: 'sub2api-2025', public_key: 'q8J2k5L9m1N4b7V0c3X6z9A2s5D8f1G4h7J0k3L6m9Q=', status: 'revoked', not_before: now(-86400 * 500), not_after: now(-86400 * 100), created_at: now(-86400 * 500) }
  ] },
  { id: 2, name: 'acme', trust_level: 'verified', status: 'active', created_at: now(-86400 * 30), revoked_at: null, keys: [
    { key_id: 'acme-1', public_key: 'Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGw=', status: 'active', not_before: null, not_after: null, created_at: now(-86400 * 30) }
  ] },
  { id: 3, name: 'shady-plugins', trust_level: 'community', status: 'revoked', created_at: now(-86400 * 60), revoked_at: now(-86400 * 10), keys: [] }
]

function b64Len(s: string) {
  try {
    return Buffer.from(s, 'base64').length
  } catch {
    return 0
  }
}

on('GET', '/publishers', (req) => paginate(publishers, req.query))
on('POST', '/publishers', (req) => {
  const su = needStepUp(req)
  if (su) return su
  const b = req.body || {}
  if (!String(b.name || '').trim()) return invalid('name', 'name is required')
  if (!['official', 'verified', 'community'].includes(b.trust_level)) return invalid('trust_level', 'invalid trust level')
  if (publishers.some((p) => p.name === b.name)) return fail(409, 'conflict', 'publisher already exists')
  const p: MockPublisher = { id: nextId(), name: b.name, trust_level: b.trust_level, status: 'active', created_at: now(), revoked_at: null, keys: [] }
  publishers.push(p)
  return p
})
on('POST', '/publishers/:id/keys', (req) => {
  const p = publishers.find((x) => x.id === Number(req.params.id))
  if (!p) return fail(404, 'not_found', 'publisher not found')
  const su = needStepUp(req)
  if (su) return su
  const b = req.body || {}
  if (!String(b.key_id || '').trim()) return invalid('key_id', 'key_id is required')
  if (publishers.some((x) => x.keys.some((k) => k.key_id === b.key_id))) return invalid('key_id', 'key_id already exists')
  if (b64Len(String(b.public_key || '')) !== 32) return invalid('public_key', 'public key must be 32 bytes of base64')
  const k: MockPublisherKey = { key_id: b.key_id, public_key: b.public_key, status: 'active', not_before: b.not_before || null, not_after: b.not_after || null, created_at: now() }
  p.keys.push(k)
  return k
})
on('POST', '/publishers/:id/revoke', (req) => {
  const p = publishers.find((x) => x.id === Number(req.params.id))
  if (!p) return fail(404, 'not_found', 'publisher not found')
  const su = needStepUp(req)
  if (su) return su
  p.status = 'revoked'
  p.revoked_at = now()
  p.keys.forEach((k) => (k.status = 'revoked'))
  return p
})
on('POST', '/publisher-keys/:key_id/revoke', (req) => {
  const su = needStepUp(req)
  if (su) return su
  for (const p of publishers) {
    const k = p.keys.find((x) => x.key_id === req.params.key_id)
    if (k) {
      k.status = 'revoked'
      return k
    }
  }
  return fail(404, 'not_found', 'key not found')
})
