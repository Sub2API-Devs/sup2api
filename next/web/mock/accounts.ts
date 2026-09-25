import { fail, needStepUp, nextId, noContent, now, on, paginate, type MockRequest } from './router'
import { activePlatforms, platformById, platformLabel } from './platforms'
import { caller, filterOwned, hasPerm, inScope, ownerScope, userEmail, type Identity } from './core'
import { resolveProxyURL, validateProxyURL } from './resources'

// Mock handlers: accounts, account types (form modes schema + iframe) and
// GET /platforms (CONTRACTS §13). Ownership (CONTRACTS §21): own-level keys
// only reach accounts the caller created; sign in as vendor@example.com to
// try it (see core.ts).

/** Owner scope of the caller for an account key pair, e.g. ('account:read', 'account:own:read'). */
function accountScope(req: MockRequest, action: 'read' | 'create' | 'update' | 'delete' | 'test' | 'credential:view') {
  const who = caller(req)
  return { who, scope: ownerScope(who, `account:${action}`, `account:own:${action}`) }
}

/** Guarded settings (CONTRACTS §21.3): base_url of the built-in types is limited to the official address. */
const GUARDED: Record<string, Array<{ field: string; allowed: string[] }>> = {
  anthropic: [{ field: 'base_url', allowed: ['https://api.anthropic.com'] }],
  openai: [{ field: 'base_url', allowed: ['https://api.openai.com'] }],
  gemini: [{ field: 'base_url', allowed: ['https://generativelanguage.googleapis.com'] }]
}

const normURL = (s: unknown) => {
  const v = String(s ?? '').trim().replace(/\/+$/, '')
  return v.replace(/^([a-z]+:\/\/)([^/]+)/i, (_m, scheme: string, host: string) => scheme.toLowerCase() + host.toLowerCase())
}

/** 400 forbidden on a guarded field the caller may not change; null when fine. */
function checkGuarded(who: Identity, pluginKey: string, creds: Record<string, any> | undefined, prev?: Record<string, any>) {
  if (!creds || hasPerm(who, 'account:settings:custom')) return null
  const fields: Array<{ field: string; code: string; message: string }> = []
  for (const g of GUARDED[pluginKey] || []) {
    const v = normURL(creds[g.field])
    if (!v) continue
    if (g.allowed.some((a) => normURL(a) === v)) continue
    if (prev && normURL(prev[g.field]) === v) continue
    fields.push({ field: `credentials.${g.field}`, code: 'forbidden', message: `Only ${g.allowed.join(', ')} is allowed` })
  }
  return fields.length ? fail(400, 'invalid_argument', 'restricted setting', { fields }) : null
}

/** Rewrites a form for a caller without account:settings:custom: enum (+ ui:readonly when one value). */
function guardForm(who: Identity, pluginKey: string, form: { schema: Record<string, any>; ui_schema?: Record<string, any> }) {
  const guards = GUARDED[pluginKey]
  if (!guards || hasPerm(who, 'account:settings:custom')) return form
  const schema = JSON.parse(JSON.stringify(form.schema))
  const ui = JSON.parse(JSON.stringify(form.ui_schema || {}))
  for (const g of guards) {
    if (!schema.properties?.[g.field]) continue
    schema.properties[g.field].enum = [...g.allowed]
    if (g.allowed.length === 1) ui[g.field] = { ...(ui[g.field] || {}), 'ui:readonly': true }
  }
  return { schema, ui_schema: ui }
}

const anthropicSchema = {
  type: 'object',
  required: ['api_key'],
  properties: {
    api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
    base_url: { type: 'string', title: 'Base URL', format: 'uri', default: 'https://api.anthropic.com' },
    auth_mode: { type: 'string', title: 'Auth header', enum: ['x-api-key', 'bearer'], default: 'x-api-key' },
    beta_passthrough: { type: 'boolean', title: 'Pass anthropic-beta through', default: true },
    organization: { type: 'string', title: 'Organization id' }
  }
}

const anthropicUI = {
  'ui:order': ['api_key', 'base_url', 'auth_mode', 'organization', 'beta_passthrough'],
  api_key: { 'ui:widget': 'secret', 'ui:title': { en: 'API Key', zh: 'API Key' }, 'ui:placeholder': 'sk-ant-...' },
  base_url: { 'ui:widget': 'url-presets', 'ui:title': { en: 'Base URL', zh: '接口地址' }, 'ui:options': { presets: ['https://api.anthropic.com'] } },
  auth_mode: { 'ui:enumNames': [{ en: 'x-api-key header', zh: 'x-api-key 请求头' }, { en: 'Authorization: Bearer', zh: 'Authorization: Bearer' }] },
  organization: { 'ui:visibleWhen': { field: 'auth_mode', equals: 'bearer' }, 'ui:help': { en: 'Only for bearer auth', zh: '仅 Bearer 方式需要' } },
  beta_passthrough: { 'ui:widget': 'switch', 'ui:title': { en: 'Pass anthropic-beta through', zh: '透传 anthropic-beta' } }
}

const relaySchema = {
  type: 'object',
  required: ['api_key', 'base_url'],
  properties: {
    api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
    base_url: { type: 'string', title: 'Base URL', format: 'uri', default: 'https://relay.example.com/v1' }
  }
}

const relayUI = {
  api_key: { 'ui:widget': 'secret', 'ui:title': { en: 'Relay key', zh: '中转 Key' }, 'ui:placeholder': 'sk-...' },
  base_url: { 'ui:title': { en: 'Relay base URL', zh: '中转地址' } }
}

const videoSchema = {
  type: 'object',
  required: ['api_key'],
  properties: {
    api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
    region: { type: 'string', title: 'Region', enum: ['us', 'eu', 'ap'], default: 'us' }
  }
}

// Built-in openai / gemini plugins (CONTRACTS §14.1): api_key (sensitive) and
// base_url. Model mapping is a core account field (§18), not a plugin field.
function apiKeyForm(defaultBase: string, placeholder: string) {
  return {
    schema: {
      type: 'object',
      required: ['api_key'],
      properties: {
        api_key: { type: 'string', title: 'API Key', writeOnly: true, minLength: 10 },
        base_url: { type: 'string', title: 'Base URL', format: 'uri', default: defaultBase }
      }
    },
    ui_schema: {
      'ui:order': ['api_key', 'base_url'],
      api_key: { 'ui:widget': 'secret', 'ui:title': { en: 'API Key', zh: 'API Key' }, 'ui:placeholder': placeholder },
      base_url: { 'ui:widget': 'url-presets', 'ui:title': { en: 'Base URL', zh: '接口地址' }, 'ui:options': { presets: [defaultBase] } }
    }
  }
}
const openaiForm = apiKeyForm('https://api.openai.com', 'sk-...')
const geminiForm = apiKeyForm('https://generativelanguage.googleapis.com', 'AIza...')

interface MockAccountType {
  plugin_key: string
  plugin_name: { en: string; zh: string }
  plugin_version: string
  asset_base: string
  trust: string
  type: string
  label: { en: string; zh: string }
  description: { en: string; zh: string }
  form: { mode: string; page?: string }
  sensitive_fields: string[]
  /** Declared supported platforms (built-in or plugin platforms). */
  supports: string[]
  /** Endpoints of other platforms served through a core converter. */
  converts?: Array<{ platform: string; path: string }>
}

// Account types (CONTRACTS §13): identified by (plugin_key, type); each
// declares the platforms it supports. GET /account-types adds `platforms`
// (with availability) and `endpoints` (native + converted).
const accountTypeDecls: MockAccountType[] = [
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
    supports: ['anthropic'],
    // openai.chat -> anthropic.messages converter of the core
    converts: [{ platform: 'openai', path: '/v1/chat/completions' }]
  },
  {
    plugin_key: 'openai',
    plugin_name: { en: 'OpenAI', zh: 'OpenAI' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/openai/0.1.0-dev',
    trust: 'official',
    type: 'apikey',
    label: { en: 'API Key', zh: 'API Key' },
    description: { en: 'OpenAI API key (Authorization: Bearer)', zh: 'OpenAI API 密钥' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    supports: ['openai']
  },
  {
    plugin_key: 'gemini',
    plugin_name: { en: 'Gemini', zh: 'Gemini' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/gemini/0.1.0-dev',
    trust: 'official',
    type: 'apikey',
    label: { en: 'API Key', zh: 'API Key' },
    description: { en: 'Google AI Studio API key (x-goog-api-key)', zh: 'Google AI Studio API 密钥' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    supports: ['gemini']
  },
  {
    plugin_key: 'relay',
    plugin_name: { en: 'Relay', zh: '中转' },
    plugin_version: '0.3.0',
    asset_base: '/plugin-ui/relay/0.3.0-dev',
    trust: 'verified',
    type: 'relay_key',
    label: { en: 'Relay key', zh: '中转 Key' },
    description: { en: 'Key of an Anthropic-compatible relay', zh: 'Anthropic 兼容中转站的 Key' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    supports: ['anthropic']
  },
  {
    plugin_key: 'videogen',
    plugin_name: { en: 'Video generation', zh: '视频生成' },
    plugin_version: '0.2.0',
    asset_base: '/plugin-ui/videogen/0.2.0-dev',
    trust: 'verified',
    type: 'video_key',
    label: { en: 'MyVideo key', zh: 'MyVideo Key' },
    description: { en: 'Serves the myvideo platform declared by the same plugin', zh: '服务本插件声明的 myvideo 平台' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    supports: ['myvideo']
  },
  {
    plugin_key: 'demo',
    plugin_name: { en: 'Demo platform', zh: '演示平台' },
    plugin_version: '0.0.1',
    asset_base: '/plugin-ui/demo/0.0.1-dev',
    trust: 'community',
    type: 'token',
    label: { en: 'Token (iframe form)', zh: 'Token（iframe 表单）' },
    description: { en: 'Sandboxed iframe account form; supports the foo platform (plugin not enabled) and openai', zh: '沙箱 iframe 账号表单；支持 foo 平台（插件未启用）和 openai' },
    form: { mode: 'iframe', page: 'ui/iframe/account.html' },
    sensitive_fields: ['token'],
    supports: ['foo', 'openai']
  }
]

function accountTypeOut(d: MockAccountType) {
  const { supports, converts, ...rest } = d
  const platforms = supports.map((id) => {
    const p = platformById(id)
    return { id, label: p?.label ?? platformLabel(id), builtin: p?.builtin ?? false, available: !!p }
  })
  const endpoints: any[] = []
  for (const id of supports) {
    for (const e of platformById(id)?.endpoints || []) endpoints.push({ method: e.method, path: e.path, protocol: e.protocol, platform: id, native: true })
  }
  for (const c of converts || []) {
    const e = platformById(c.platform)?.endpoints.find((x) => x.path === c.path)
    if (e) endpoints.push({ method: e.method, path: e.path, protocol: e.protocol, platform: c.platform, native: false })
  }
  return { ...rest, platforms, endpoints }
}

const typeLabel = (pluginKey: string, type: string) => accountTypeDecls.find((x) => x.plugin_key === pluginKey && x.type === type)?.label || type

const accounts: any[] = [
  { id: 12, name: 'claude-main', plugin_key: 'anthropic', type: 'apikey', created_by: 1, group_ids: [1, 2], proxy_id: null, priority: 1, weight: 3, max_concurrency: 10, schedulable: true, models: ['claude-sonnet-4-5', 'claude-haiku-4-5'], model_mapping: { 'claude-3-5-sonnet-latest': 'claude-sonnet-4-5' }, rpm_limit: 60, tpm_limit: 100000, tpd_limit: 5000000, spm_limit: 20, status: 'active', status_reason: '', in_use: 3, cooldown_until: null, orphaned: false, last_used_at: now(-12), created_at: now(-86400 * 20), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 13, name: 'claude-bak', plugin_key: 'anthropic', type: 'apikey', created_by: 6, group_ids: [1], proxy_id: 1, priority: 2, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: now(600), cooldown_reason: '429', orphaned: false, last_used_at: now(-300), created_at: now(-86400 * 10), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 14, name: 'old-key', plugin_key: 'anthropic', type: 'apikey', created_by: 1, group_ids: [1], proxy_id: null, priority: 5, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'disabled', status_reason: '401 invalid credentials', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-86400), created_at: now(-86400 * 40), credentials: { api_key: '******' } },
  { id: 16, name: 'relay-1', plugin_key: 'relay', type: 'relay_key', created_by: 6, group_ids: [1], proxy_id: null, priority: 3, weight: 1, max_concurrency: 20, schedulable: true, models: [], model_mapping: { 'claude-opus-4-1': 'claude-sonnet-4-5' }, rpm_limit: 120, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 1, cooldown_until: null, orphaned: false, last_used_at: now(-40), created_at: now(-86400 * 2), credentials: { api_key: '******', base_url: 'https://relay.example.com' } },
  { id: 17, name: 'video-1', plugin_key: 'videogen', type: 'video_key', created_by: 1, group_ids: [2], proxy_id: null, priority: 1, weight: 1, max_concurrency: 4, schedulable: true, models: ['myvideo-pro'], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 5, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-3600), created_at: now(-86400 * 3), credentials: { api_key: '******', region: 'us' } },
  { id: 18, name: 'demo-token', plugin_key: 'demo', type: 'token', created_by: 1, group_ids: [1], proxy_id: null, priority: 8, weight: 1, max_concurrency: 2, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: null, created_at: now(-86400), credentials: { token: '******' } },
  { id: 19, name: 'openai-main', plugin_key: 'openai', type: 'apikey', created_by: 1, group_ids: [1, 2], proxy_id: null, priority: 1, weight: 2, max_concurrency: 20, schedulable: true, models: ['gpt-4o', 'gpt-4o-mini'], model_mapping: {}, rpm_limit: 0, tpm_limit: 200000, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 2, cooldown_until: null, orphaned: false, last_used_at: now(-30), created_at: now(-86400 * 2), credentials: { api_key: '******', base_url: 'https://api.openai.com' } },
  { id: 20, name: 'gemini-main', plugin_key: 'gemini', type: 'apikey', created_by: 1, group_ids: [2], proxy_id: null, priority: 1, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-900), created_at: now(-86400), credentials: { api_key: '******', base_url: 'https://generativelanguage.googleapis.com' } },
  // Its plugin was uninstalled without purge_accounts: kept as an orphaned account.
  { id: 15, name: 'legacy-vendor', plugin_key: 'legacy_vendor', type: 'apikey', created_by: null, type_label: { en: 'API key', zh: 'API Key' }, group_ids: [], proxy_id: null, priority: 10, weight: 1, max_concurrency: 5, schedulable: false, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, orphaned: true, created_at: now(-86400 * 90) }
]
for (const a of accounts) a.type_label ??= typeLabel(a.plugin_key, a.type)

/** Current window counters (CONTRACTS §18.1); mocked as a fraction of the limit. */
function rateUsage(a: any) {
  const used = (limit: number, ratio: number) => (limit ? Math.min(limit, Math.round(limit * ratio)) : 0)
  return { rpm: used(a.rpm_limit, 0.2), tpm: used(a.tpm_limit, 0.032), tpd: used(a.tpd_limit, 0.22), spm: used(a.spm_limit, 0.15) }
}

const withGroups = (a: any) => ({
  ...a,
  models: a.models || [],
  model_mapping: a.model_mapping || {},
  weight: a.weight ?? 1,
  created_by: a.created_by ?? null,
  created_by_email: userEmail(a.created_by),
  rate_usage: rateUsage(a),
  groups: (a.group_ids || []).map((id: number) => ({ id, name: id === 1 ? 'default' : id === 2 ? 'vip' : `group-${id}` }))
})

/** Accounts in a group (any status). */
export function groupAccountCount(gid: number): number {
  return accounts.filter((a) => (a.group_ids || []).includes(gid)).length
}

/** Accounts referencing a proxy (every owner, CONTRACTS §21.2). */
export function proxyAccountCount(pid: number): number {
  return accounts.filter((a) => a.proxy_id === pid).length
}

/** Platforms a group serves: supported by its accounts' types and existing now (sorted). */
export function groupPlatforms(gid: number): string[] {
  const out = new Set<string>()
  for (const a of accounts) {
    if (a.orphaned || !(a.group_ids || []).includes(gid)) continue
    const d = accountTypeDecls.find((x) => x.plugin_key === a.plugin_key && x.type === a.type)
    for (const id of d?.supports || []) if (platformById(id)) out.add(id)
  }
  return [...out].sort()
}

/**
 * Uninstall hook (CONTRACTS §14.3): with purge, deletes the accounts of the
 * plugin's account types and returns how many; otherwise marks them orphaned.
 */
export function uninstallPluginAccounts(pluginKey: string, purge: boolean): number {
  let n = 0
  for (let i = accounts.length - 1; i >= 0; i--) {
    if (accounts[i].plugin_key !== pluginKey) continue
    n++
    if (purge) accounts.splice(i, 1)
    else accounts[i].orphaned = true
  }
  return purge ? n : 0
}

on('GET', '/platforms', () =>
  activePlatforms().map((p) => ({
    ...p,
    account_types: accountTypeDecls.filter((d) => d.supports.includes(p.id)).map((d) => ({ plugin_key: d.plugin_key, type: d.type, label: d.label }))
  }))
)
// Any signed-in user: available platforms and endpoints, no account types (CONTRACTS §14.1).
on('GET', '/me/platforms', () => activePlatforms().map((p) => ({ id: p.id, label: p.label, builtin: p.builtin, endpoints: p.endpoints })))
on('GET', '/account-types', () => accountTypeDecls.map(accountTypeOut))
on('GET', '/account-types/:plugin_key/:type/form', (req) => {
  const who = caller(req)
  const k = req.params.plugin_key
  if (k === 'anthropic') return guardForm(who, k, { schema: anthropicSchema, ui_schema: anthropicUI })
  if (k === 'relay') return { schema: relaySchema, ui_schema: relayUI }
  if (k === 'videogen') return { schema: videoSchema, ui_schema: { api_key: { 'ui:widget': 'secret' } } }
  if (k === 'openai') return guardForm(who, k, openaiForm)
  if (k === 'gemini') return guardForm(who, k, geminiForm)
  return fail(404, 'not_found', 'form not found')
})

/** A complete model id (CONTRACTS §16): no wildcards. */
const MODEL_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/
const badModel = (s: unknown) => typeof s !== 'string' || !MODEL_RE.test(s) || s.includes('*')

/** Validates the §18.1 scheduling / limit / model fields of a create or patch body. */
function validateScheduling(b: Record<string, any>) {
  const fields: Array<{ field: string; code: string; message: string }> = []
  if (Array.isArray(b.models)) {
    if (b.models.length > 500) fields.push({ field: 'models', code: 'too_many', message: 'At most 500 models' })
    b.models.forEach((m: unknown, i: number) => {
      if (badModel(m)) fields.push({ field: `models[${i}]`, code: 'invalid', message: 'Not a complete model id' })
      else if (b.models.indexOf(m) !== i) fields.push({ field: `models[${i}]`, code: 'duplicate', message: 'Duplicate model' })
    })
  }
  if (b.model_mapping && typeof b.model_mapping === 'object' && !Array.isArray(b.model_mapping)) {
    const entries = Object.entries(b.model_mapping as Record<string, unknown>)
    if (entries.length > 500) fields.push({ field: 'model_mapping', code: 'too_many', message: 'At most 500 entries' })
    for (const [from, to] of entries) {
      if (badModel(from) || badModel(to)) fields.push({ field: `model_mapping.${from}`, code: 'invalid', message: 'Not a complete model id' })
    }
  }
  const range: Array<[string, number, number]> = [
    ['priority', 0, 1000000],
    ['weight', 1, 1000],
    ['rpm_limit', 0, 10000000],
    ['tpm_limit', 0, 1e12],
    ['tpd_limit', 0, 1e12],
    ['spm_limit', 0, 10000000]
  ]
  for (const [k, min, max] of range) {
    if (b[k] === undefined) continue
    const n = Number(b[k])
    if (!Number.isFinite(n) || n < min || n > max) fields.push({ field: k, code: 'invalid', message: `Must be between ${min} and ${max}` })
  }
  return fields.length ? fail(400, 'invalid_argument', 'invalid argument', { fields }) : null
}

/** Resolves the proxy of a create / patch body (CONTRACTS §21.4): proxy_id xor proxy_url. Returns the fields to set, or an error. */
function resolveProxy(req: MockRequest, b: Record<string, any>): { proxy_id?: number | null; proxy_created?: boolean } | { __status: number; body: unknown } {
  if (b.proxy_url !== undefined && b.proxy_id !== undefined) {
    return fail(400, 'invalid_argument', 'proxy_id and proxy_url are exclusive', { fields: [{ field: 'proxy_url', code: 'conflict', message: 'Give proxy_id or proxy_url, not both' }] })
  }
  if (typeof b.proxy_url === 'string' && b.proxy_url.trim()) {
    const r = resolveProxyURL(req, b.proxy_url)
    if ('__status' in r) return r
    return { proxy_id: r.id, proxy_created: r.created }
  }
  if (b.proxy_id !== undefined) return { proxy_id: b.proxy_id === null ? null : Number(b.proxy_id), proxy_created: false }
  return { proxy_created: false }
}

on('GET', '/accounts', (req) => {
  const { who, scope } = accountScope(req, 'read')
  let list = filterOwned(accounts, scope, who, req.query)
  const q = req.query
  if (q.plugin_key) list = list.filter((a) => a.plugin_key === q.plugin_key)
  if (q.type) list = list.filter((a) => a.type === q.type)
  if (q.group_id) list = list.filter((a) => a.group_ids.includes(Number(q.group_id)))
  if (q.status) list = list.filter((a) => a.status === q.status)
  // ?model=: accounts that can serve it (empty `models` = all models, §18.3).
  if (q.model) list = list.filter((a) => !(a.models || []).length || (a.models || []).includes(q.model))
  if (q.q) list = list.filter((a) => a.name.includes(q.q))
  // priority ASC, weight DESC, id (§18.3).
  list = [...list].sort((x, y) => x.priority - y.priority || (y.weight ?? 1) - (x.weight ?? 1) || x.id - y.id)
  return paginate(list.map(({ credentials: _c, ...a }) => withGroups(a)), q)
})
/**
 * The account of :id within the caller's scope for `action`: 403 without any
 * key of the pair, 404 when missing or not the caller's (the two are not told apart).
 */
function scopedAccount(req: MockRequest, action: 'read' | 'update' | 'delete' | 'test' | 'credential:view'): { a: any } | { __status: number; body: unknown } {
  const { who, scope } = accountScope(req, action)
  if (!scope) return fail(403, 'permission_denied', `account:${action} or account:own:${action} is required`, { permission: `account:own:${action}` })
  const a = accounts.find((x) => x.id === Number(req.params.id))
  return a && inScope(scope, who, a) ? { a } : fail(404, 'not_found', 'account not found')
}
on('GET', '/accounts/:id', (req) => {
  const r = scopedAccount(req, 'read')
  return 'a' in r ? withGroups(r.a) : r
})
on('POST', '/accounts', (req) => {
  const who = caller(req)
  const b = req.body || {}
  const creds = b.credentials || {}
  if ('platform' in b) return fail(400, 'invalid_argument', 'unknown field "platform"')
  const at = accountTypeDecls.find((x) => x.plugin_key === b.plugin_key && x.type === b.type)
  if (!at) return fail(400, 'invalid_argument', 'unknown account type', { fields: [{ field: 'type', code: 'not_found', message: 'Unknown account type' }] })
  const bad = validateScheduling(b)
  if (bad) return bad
  if (b.plugin_key === 'anthropic' && !String(creds.api_key || '').startsWith('sk-')) {
    return fail(400, 'invalid_argument', 'invalid credentials', { fields: [{ field: 'credentials.api_key', code: 'invalid', message: 'API key must start with sk-' }] })
  }
  const guarded = checkGuarded(who, b.plugin_key, creds)
  if (guarded) return guarded
  if (accounts.some((a) => a.name === b.name)) return fail(400, 'invalid_argument', 'name taken', { fields: [{ field: 'name', code: 'conflict', message: 'Name already used' }] })
  const proxy = resolveProxy(req, b)
  if ('__status' in proxy) return proxy
  const masked = { ...creds }
  for (const f of at.sensitive_fields) if (masked[f]) masked[f] = '******'
  const { proxy_url: _u, ...fields } = b
  const a = {
    id: nextId(),
    status: 'active',
    status_reason: '',
    in_use: 0,
    orphaned: false,
    created_at: now(),
    priority: 10,
    weight: 1,
    max_concurrency: 10,
    schedulable: true,
    models: [],
    model_mapping: {},
    rpm_limit: 0,
    tpm_limit: 0,
    tpd_limit: 0,
    spm_limit: 0,
    ...fields,
    proxy_id: proxy.proxy_id ?? null,
    created_by: who.id,
    type_label: at.label,
    credentials: masked
  }
  accounts.unshift(a)
  return { ...withGroups(a), proxy_created: !!proxy.proxy_created }
})
on('PATCH', '/accounts/:id', (req) => {
  const r = scopedAccount(req, 'update')
  if (!('a' in r)) return r
  const a = r.a
  const bad = validateScheduling(req.body || {})
  if (bad) return bad
  const { credentials, platform: _p, plugin_key: _k, type: _t, proxy_id: _pid, proxy_url: _purl, ...rest } = req.body || {}
  const guarded = checkGuarded(caller(req), a.plugin_key, credentials, a.credentials)
  if (guarded) return guarded
  const proxy = resolveProxy(req, req.body || {})
  if ('__status' in proxy) return proxy
  // `models` and `model_mapping` are replaced as a whole (§18.3).
  Object.assign(a, rest)
  if (proxy.proxy_id !== undefined) a.proxy_id = proxy.proxy_id
  if (credentials) {
    a.credentials ??= {}
    for (const [k, v] of Object.entries(credentials)) if (v !== '******') a.credentials[k] = k === 'api_key' || k === 'token' ? '******' : v
  }
  return { ...withGroups(a), proxy_created: !!proxy.proxy_created }
})
on('DELETE', '/accounts/:id', (req) => {
  // account:delete is sensitive, account:own:delete is not (CONTRACTS §21.1).
  const { who, scope } = accountScope(req, 'delete')
  if (scope === 'all') {
    const s = needStepUp(req)
    if (s) return s
  }
  const i = accounts.findIndex((x) => x.id === Number(req.params.id))
  if (i < 0 || !inScope(scope, who, accounts[i])) return fail(404, 'not_found', 'account not found')
  accounts.splice(i, 1)
  return noContent()
})
on('POST', '/accounts/:id/test', (req) => {
  const r = scopedAccount(req, 'test')
  if (!('a' in r)) return r
  const a = r.a
  // The model goes through the account's model_mapping first (§18.3).
  const asked = req.body?.model || 'claude-haiku-4-5'
  const model = (a.model_mapping || {})[asked] || asked
  return a.status === 'disabled'
    ? { ok: false, status: 401, latency_ms: 212, message: 'authentication_error: invalid x-api-key' }
    : { ok: true, status: 200, latency_ms: 480 + Math.round(Math.random() * 200), message: `model ${model} answered` }
})
// Fetch models from the upstream (CONTRACTS §19). Per plugin a fixed list; a
// key containing "bad" mimics an upstream 401, gemini lists resource names.
const upstreamModels: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5', 'claude-sonnet-4-5-20250929'],
  openai: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3', 'text-embedding-3-small'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  relay: ['claude-sonnet-4-5', 'claude-opus-4-1']
}
function fetchUpstreamModels(pluginKey: string, creds: Record<string, any> | undefined) {
  const key = String(creds?.api_key || '')
  if (key.includes('bad')) return fail(503, 'unavailable', 'upstream returned 401: {"error":"invalid api key"}', { status: 401 })
  const models = upstreamModels[pluginKey]
  if (!models) return fail(501, 'unsupported', 'this account type cannot list models from the upstream')
  return { models: [...models].sort(), skipped: 0, status: 200 }
}
on('POST', '/account-types/:plugin_key/:type/models/fetch', (req) => {
  // A proxy_url is only parsed and used for this request (CONTRACTS §21.2): nothing is looked up or created.
  const b = req.body || {}
  if (b.proxy_url !== undefined && b.proxy_id !== undefined) {
    return fail(400, 'invalid_argument', 'proxy_id and proxy_url are exclusive', { fields: [{ field: 'proxy_url', code: 'conflict', message: 'Give proxy_id or proxy_url, not both' }] })
  }
  if (typeof b.proxy_url === 'string' && b.proxy_url.trim()) {
    const err = validateProxyURL(b.proxy_url)
    if (err) return err
  }
  return fetchUpstreamModels(req.params.plugin_key, b.credentials)
})
on('POST', '/accounts/:id/models/fetch', (req) => {
  const r = scopedAccount(req, 'test')
  if (!('a' in r)) return r
  const a = r.a
  return fetchUpstreamModels(a.plugin_key, req.body?.credentials || a.credentials)
})
on('POST', '/accounts/:id/credentials/reveal', (req) => {
  const s = needStepUp(req)
  if (s) return s
  const r = scopedAccount(req, 'credential:view')
  if (!('a' in r)) return r
  const a = r.a
  return { api_key: 'sk-ant-api03-mock-plaintext-key', base_url: a.credentials?.base_url || 'https://api.anthropic.com' }
})
