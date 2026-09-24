import { fail, needStepUp, nextId, noContent, now, on, paginate } from './router'

// Mock handlers: accounts and account types (form modes schema + iframe).

const anthropicSchema = {
  type: 'object',
  required: ['api_key'],
  properties: {
    api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
    base_url: { type: 'string', title: 'Base URL', format: 'uri', default: 'https://api.anthropic.com' },
    auth_mode: { type: 'string', title: 'Auth header', enum: ['x-api-key', 'bearer'], default: 'x-api-key' },
    beta_passthrough: { type: 'boolean', title: 'Pass anthropic-beta through', default: true },
    model_mapping: { type: 'object', title: 'Model mapping', additionalProperties: { type: 'string' } },
    organization: { type: 'string', title: 'Organization id' }
  }
}

const anthropicUI = {
  'ui:order': ['api_key', 'base_url', 'auth_mode', 'organization', 'beta_passthrough', 'model_mapping'],
  api_key: { 'ui:widget': 'secret', 'ui:title': { en: 'API Key', zh: 'API Key' }, 'ui:placeholder': 'sk-ant-...' },
  base_url: { 'ui:widget': 'url-presets', 'ui:title': { en: 'Base URL', zh: '接口地址' }, 'ui:options': { presets: ['https://api.anthropic.com'] } },
  auth_mode: { 'ui:enumNames': [{ en: 'x-api-key header', zh: 'x-api-key 请求头' }, { en: 'Authorization: Bearer', zh: 'Authorization: Bearer' }] },
  organization: { 'ui:visibleWhen': { field: 'auth_mode', equals: 'bearer' }, 'ui:help': { en: 'Only for bearer auth', zh: '仅 Bearer 方式需要' } },
  beta_passthrough: { 'ui:widget': 'switch', 'ui:title': { en: 'Pass anthropic-beta through', zh: '透传 anthropic-beta' } },
  model_mapping: { 'ui:widget': 'model-mapping', 'ui:title': { en: 'Model mapping', zh: '模型映射' } }
}

export const accountTypes = [
  {
    plugin_key: 'anthropic',
    plugin_name: { en: 'Anthropic', zh: 'Anthropic' },
    plugin_version: '0.1.0',
    platform: 'anthropic',
    type: 'apikey',
    label: { en: 'API Key', zh: 'API Key' },
    description: { en: 'Claude API key (x-api-key)', zh: 'Claude API 密钥' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key']
  },
  {
    plugin_key: 'demo',
    plugin_name: { en: 'Demo platform', zh: '演示平台' },
    plugin_version: '0.0.1',
    platform: 'demo',
    type: 'token',
    label: { en: 'Token (iframe form)', zh: 'Token（iframe 表单）' },
    description: { en: 'Sandboxed iframe account form', zh: '沙箱 iframe 账号表单' },
    form: { mode: 'iframe', page: 'ui/iframe/account.html' },
    sensitive_fields: ['token']
  }
]

const accounts: any[] = [
  { id: 12, name: 'claude-main', plugin_key: 'anthropic', platform: 'anthropic', type: 'apikey', group_ids: [1, 2], proxy_id: null, priority: 1, max_concurrency: 10, schedulable: true, status: 'active', status_reason: '', in_use: 3, cooldown_until: null, orphaned: false, last_used_at: now(-12), created_at: now(-86400 * 20), credentials: { api_key: '******', base_url: 'https://api.anthropic.com', model_mapping: { 'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929' } } },
  { id: 13, name: 'claude-bak', plugin_key: 'anthropic', platform: 'anthropic', type: 'apikey', group_ids: [1], proxy_id: 1, priority: 2, max_concurrency: 10, schedulable: true, status: 'active', status_reason: '', in_use: 0, cooldown_until: now(600), cooldown_reason: '429', orphaned: false, last_used_at: now(-300), created_at: now(-86400 * 10), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 14, name: 'old-key', plugin_key: 'anthropic', platform: 'anthropic', type: 'apikey', group_ids: [1], proxy_id: null, priority: 5, max_concurrency: 10, schedulable: true, status: 'disabled', status_reason: '401 invalid credentials', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-86400), created_at: now(-86400 * 40), credentials: { api_key: '******' } },
  { id: 15, name: 'legacy-openai', plugin_key: 'openai', platform: 'openai', type: 'apikey', group_ids: [], proxy_id: null, priority: 10, max_concurrency: 5, schedulable: false, status: 'active', status_reason: '', in_use: 0, orphaned: true, created_at: now(-86400 * 90) }
]

on('GET', '/account-types', () => accountTypes)
on('GET', '/account-types/:platform/:type/form', (req) => {
  if (req.params.platform === 'anthropic') return { schema: anthropicSchema, ui_schema: anthropicUI }
  return fail(404, 'not_found', 'form not found')
})

on('GET', '/accounts', (req) => {
  let list = accounts
  const q = req.query
  if (q.platform) list = list.filter((a) => a.platform === q.platform)
  if (q.group_id) list = list.filter((a) => a.group_ids.includes(Number(q.group_id)))
  if (q.status) list = list.filter((a) => a.status === q.status)
  if (q.q) list = list.filter((a) => a.name.includes(q.q))
  return paginate(list.map(({ credentials: _c, ...a }) => a), q)
})
on('GET', '/accounts/:id', (req) => accounts.find((a) => a.id === Number(req.params.id)) || fail(404, 'not_found', 'account not found'))
on('POST', '/accounts', (req) => {
  const b = req.body || {}
  const creds = b.credentials || {}
  if (b.platform === 'anthropic' && !String(creds.api_key || '').startsWith('sk-')) {
    return fail(400, 'invalid_argument', 'invalid credentials', { fields: [{ field: 'credentials.api_key', code: 'invalid', message: 'API key must start with sk-' }] })
  }
  if (accounts.some((a) => a.name === b.name)) return fail(400, 'invalid_argument', 'name taken', { fields: [{ field: 'name', code: 'conflict', message: 'Name already used' }] })
  const at = accountTypes.find((x) => x.platform === b.platform && x.type === b.type)
  const masked = { ...creds }
  for (const f of at?.sensitive_fields || []) if (masked[f]) masked[f] = '******'
  const a = { id: nextId(), plugin_key: at?.plugin_key || b.platform, status: 'active', status_reason: '', in_use: 0, orphaned: false, created_at: now(), ...b, credentials: masked }
  accounts.unshift(a)
  return a
})
on('PATCH', '/accounts/:id', (req) => {
  const a = accounts.find((x) => x.id === Number(req.params.id))
  if (!a) return fail(404, 'not_found', 'account not found')
  const { credentials, ...rest } = req.body || {}
  Object.assign(a, rest)
  if (credentials) {
    for (const [k, v] of Object.entries(credentials)) if (v !== '******') a.credentials[k] = k === 'api_key' || k === 'token' ? '******' : v
  }
  return a
})
on('DELETE', '/accounts/:id', (req) => {
  const s = needStepUp(req)
  if (s) return s
  const i = accounts.findIndex((x) => x.id === Number(req.params.id))
  if (i >= 0) accounts.splice(i, 1)
  return noContent()
})
on('POST', '/accounts/:id/test', (req) => {
  const a = accounts.find((x) => x.id === Number(req.params.id))
  if (!a) return fail(404, 'not_found', 'account not found')
  return a.status === 'disabled'
    ? { ok: false, status: 401, latency_ms: 212, message: 'authentication_error: invalid x-api-key' }
    : { ok: true, status: 200, latency_ms: 480 + Math.round(Math.random() * 200), message: `model ${req.body?.model || 'claude-haiku-4-5'} answered` }
})
on('POST', '/accounts/:id/credentials/reveal', (req) => {
  const s = needStepUp(req)
  if (s) return s
  return { api_key: 'sk-ant-api03-mock-plaintext-key', base_url: 'https://api.anthropic.com' }
})
