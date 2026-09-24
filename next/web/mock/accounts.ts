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

const relaySchema = {
  type: 'object',
  required: ['api_key', 'base_url'],
  properties: {
    api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
    base_url: { type: 'string', title: 'Base URL', format: 'uri', default: 'https://relay.example.com/v1' },
    model_mapping: { type: 'object', title: 'Model mapping', additionalProperties: { type: 'string' } }
  }
}

const relayUI = {
  api_key: { 'ui:widget': 'secret', 'ui:title': { en: 'Relay key', zh: '中转 Key' }, 'ui:placeholder': 'sk-...' },
  base_url: { 'ui:title': { en: 'Relay base URL', zh: '中转地址' } },
  model_mapping: { 'ui:widget': 'model-mapping', 'ui:title': { en: 'Model mapping', zh: '模型映射' } }
}

const messages = { method: 'POST', path: '/v1/messages', protocol: 'anthropic.messages', platform: 'anthropic' }
const countTokens = { method: 'POST', path: '/v1/messages/count_tokens', protocol: 'anthropic.count_tokens', platform: 'anthropic' }

// GET /account-types (CONTRACTS §12): identified by (plugin_key, type); endpoints
// are the enabled ones the type can serve, native=false through a converter.
export const accountTypes = [
  {
    plugin_key: 'anthropic',
    plugin_name: { en: 'Anthropic', zh: 'Anthropic' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/anthropic/0.1.0-dev',
    trust: 'official',
    type: 'apikey',
    label: { en: 'API Key', zh: 'API Key' },
    description: { en: 'Claude API key (x-api-key)', zh: 'Claude API 密钥' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    protocols: ['anthropic.messages', 'anthropic.count_tokens'],
    endpoints: [
      { ...messages, native: true },
      { ...countTokens, native: true }
    ]
  },
  {
    plugin_key: 'openai_relay',
    plugin_name: { en: 'OpenAI-compatible relay', zh: 'OpenAI 兼容中转' },
    plugin_version: '0.3.0',
    asset_base: '/plugin-ui/openai_relay/0.3.0-dev',
    trust: 'verified',
    type: 'chat_key',
    label: { en: 'Chat Completions key', zh: 'Chat Completions Key' },
    description: { en: 'Relay speaking openai.chat; serves /v1/messages through the core converter', zh: '上游为 openai.chat 协议的中转，经核心转换服务 /v1/messages' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    protocols: ['openai.chat'],
    endpoints: [{ ...messages, native: false }]
  },
  {
    plugin_key: 'demo',
    plugin_name: { en: 'Demo platform', zh: '演示平台' },
    plugin_version: '0.0.1',
    asset_base: '/plugin-ui/demo/0.0.1-dev',
    trust: 'community',
    type: 'token',
    label: { en: 'Token (iframe form)', zh: 'Token（iframe 表单）' },
    description: { en: 'Sandboxed iframe account form', zh: '沙箱 iframe 账号表单' },
    form: { mode: 'iframe', page: 'ui/iframe/account.html' },
    sensitive_fields: ['token'],
    protocols: ['demo.chat'],
    endpoints: []
  }
]

const typeLabel = (pluginKey: string, type: string) => accountTypes.find((x) => x.plugin_key === pluginKey && x.type === type)?.label || type

const accounts: any[] = [
  { id: 12, name: 'claude-main', plugin_key: 'anthropic', type: 'apikey', group_ids: [1, 2], proxy_id: null, priority: 1, max_concurrency: 10, schedulable: true, status: 'active', status_reason: '', in_use: 3, cooldown_until: null, orphaned: false, last_used_at: now(-12), created_at: now(-86400 * 20), credentials: { api_key: '******', base_url: 'https://api.anthropic.com', model_mapping: { 'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929' } } },
  { id: 13, name: 'claude-bak', plugin_key: 'anthropic', type: 'apikey', group_ids: [1], proxy_id: 1, priority: 2, max_concurrency: 10, schedulable: true, status: 'active', status_reason: '', in_use: 0, cooldown_until: now(600), cooldown_reason: '429', orphaned: false, last_used_at: now(-300), created_at: now(-86400 * 10), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 14, name: 'old-key', plugin_key: 'anthropic', type: 'apikey', group_ids: [1], proxy_id: null, priority: 5, max_concurrency: 10, schedulable: true, status: 'disabled', status_reason: '401 invalid credentials', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-86400), created_at: now(-86400 * 40), credentials: { api_key: '******' } },
  { id: 16, name: 'relay-gpt', plugin_key: 'openai_relay', type: 'chat_key', group_ids: [1], proxy_id: null, priority: 3, max_concurrency: 20, schedulable: true, status: 'active', status_reason: '', in_use: 1, cooldown_until: null, orphaned: false, last_used_at: now(-40), created_at: now(-86400 * 2), credentials: { api_key: '******', base_url: 'https://relay.example.com/v1' } },
  { id: 15, name: 'legacy-openai', plugin_key: 'openai', type: 'apikey', type_label: { en: 'API key', zh: 'API Key' }, group_ids: [], proxy_id: null, priority: 10, max_concurrency: 5, schedulable: false, status: 'active', status_reason: '', in_use: 0, orphaned: true, created_at: now(-86400 * 90) }
]
for (const a of accounts) a.type_label ??= typeLabel(a.plugin_key, a.type)

const withGroups = (a: any) => ({ ...a, groups: (a.group_ids || []).map((id: number) => ({ id, name: id === 1 ? 'default' : id === 2 ? 'vip' : `group-${id}` })) })

on('GET', '/account-types', () => accountTypes)
on('GET', '/account-types/:plugin_key/:type/form', (req) => {
  if (req.params.plugin_key === 'anthropic') return { schema: anthropicSchema, ui_schema: anthropicUI }
  if (req.params.plugin_key === 'openai_relay') return { schema: relaySchema, ui_schema: relayUI }
  return fail(404, 'not_found', 'form not found')
})

on('GET', '/accounts', (req) => {
  let list = accounts
  const q = req.query
  if (q.plugin_key) list = list.filter((a) => a.plugin_key === q.plugin_key)
  if (q.type) list = list.filter((a) => a.type === q.type)
  if (q.group_id) list = list.filter((a) => a.group_ids.includes(Number(q.group_id)))
  if (q.status) list = list.filter((a) => a.status === q.status)
  if (q.q) list = list.filter((a) => a.name.includes(q.q))
  return paginate(list.map(({ credentials: _c, ...a }) => withGroups(a)), q)
})
on('GET', '/accounts/:id', (req) => {
  const a = accounts.find((x) => x.id === Number(req.params.id))
  return a ? withGroups(a) : fail(404, 'not_found', 'account not found')
})
on('POST', '/accounts', (req) => {
  const b = req.body || {}
  const creds = b.credentials || {}
  if ('platform' in b) return fail(400, 'invalid_argument', 'unknown field "platform"')
  const at = accountTypes.find((x) => x.plugin_key === b.plugin_key && x.type === b.type)
  if (!at) return fail(400, 'invalid_argument', 'unknown account type', { fields: [{ field: 'type', code: 'not_found', message: 'Unknown account type' }] })
  if (b.plugin_key === 'anthropic' && !String(creds.api_key || '').startsWith('sk-')) {
    return fail(400, 'invalid_argument', 'invalid credentials', { fields: [{ field: 'credentials.api_key', code: 'invalid', message: 'API key must start with sk-' }] })
  }
  if (accounts.some((a) => a.name === b.name)) return fail(400, 'invalid_argument', 'name taken', { fields: [{ field: 'name', code: 'conflict', message: 'Name already used' }] })
  const masked = { ...creds }
  for (const f of at.sensitive_fields) if (masked[f]) masked[f] = '******'
  const a = { id: nextId(), status: 'active', status_reason: '', in_use: 0, orphaned: false, created_at: now(), ...b, type_label: at.label, credentials: masked }
  accounts.unshift(a)
  return withGroups(a)
})
on('PATCH', '/accounts/:id', (req) => {
  const a = accounts.find((x) => x.id === Number(req.params.id))
  if (!a) return fail(404, 'not_found', 'account not found')
  const { credentials, platform: _p, plugin_key: _k, type: _t, ...rest } = req.body || {}
  Object.assign(a, rest)
  if (credentials) {
    a.credentials ??= {}
    for (const [k, v] of Object.entries(credentials)) if (v !== '******') a.credentials[k] = k === 'api_key' || k === 'token' ? '******' : v
  }
  return withGroups(a)
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
