import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fail, nextId, noContent, now, on, paginate, type MockRequest } from './router'
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
    plugin_key: 'ccgateway',
    plugin_name: { en: 'Claude Code', zh: 'Claude Code' },
    plugin_version: '0.1.5',
    asset_base: '/plugin-ui/ccgateway/0.1.5-dev',
    trust: 'official',
    type: 'managed',
    label: { en: 'Claude Code', zh: 'Claude Code' },
    description: { en: 'Managed Claude Code account (OAuth); no credential fields', zh: '托管 Claude Code 账号（OAuth），无需填写凭证' },
    form: { mode: 'schema' },
    sensitive_fields: [],
    supports: ['anthropic']
  },
  {
    plugin_key: 'claude_oauth',
    plugin_name: { en: 'Claude OAuth Accounts', zh: 'Claude OAuth 账号' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/claude_oauth/0.1.0-dev',
    trust: 'official',
    type: 'claude_oauth',
    label: { en: 'Claude OAuth', zh: 'Claude OAuth' },
    description: { en: 'Claude subscription (Pro / Max) via OAuth; plan windows are tracked', zh: 'Claude 订阅（Pro / Max）OAuth 授权，记录套餐窗口用量' },
    form: { mode: 'schema' },
    sensitive_fields: ['access_token', 'refresh_token'],
    supports: ['anthropic']
  },
  {
    plugin_key: 'claude_oauth',
    plugin_name: { en: 'Claude OAuth Accounts', zh: 'Claude OAuth 账号' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/claude_oauth/0.1.0-dev',
    trust: 'official',
    type: 'claude_setup_token',
    label: { en: 'Claude Setup Token', zh: 'Claude Setup Token' },
    description: { en: 'Setup token (inference-only scope)', zh: 'Setup token（仅推理范围）' },
    form: { mode: 'schema' },
    sensitive_fields: ['access_token', 'refresh_token'],
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
  const defaults = pluginDefaults(d.plugin_key, d.type)
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
  return { ...rest, ...defaults, platforms, endpoints }
}

/**
 * Default models / mapping (CONTRACTS §41), read from the real plugin
 * manifest so the mock never drifts from what the plugins ship; types
 * without a plugin source in this repository get none.
 */
function pluginDefaults(pluginKey: string, type: string) {
  // Plugin directories use dashes where keys use underscores (claude_oauth -> plugins/claude-oauth).
  for (const dir of new Set([pluginKey, pluginKey.replace(/_/g, '-')])) {
    try {
      const m = JSON.parse(readFileSync(fileURLToPath(new URL(`../../plugins/${dir}/manifest.json`, import.meta.url)), 'utf8'))
      const at = (m.accountTypes || []).find((x: any) => x.id === type)
      return { default_models: at?.defaultModels || [], default_model_mapping: at?.defaultModelMapping || {} }
    } catch {
      // try the next directory name
    }
  }
  return { default_models: [], default_model_mapping: {} }
}

const typeLabel = (pluginKey: string, type: string) => accountTypeDecls.find((x) => x.plugin_key === pluginKey && x.type === type)?.label || type

const accounts: any[] = [
  { id: 12, name: 'claude-main', plugin_key: 'anthropic', type: 'apikey', created_by: 1, group_ids: [1, 2], proxy_id: null, priority: 1, weight: 3, max_concurrency: 10, schedulable: true, models: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'], model_mapping: { 'claude-3-5-sonnet-latest': 'claude-sonnet-4-5' }, rpm_limit: 60, tpm_limit: 100000, tpd_limit: 5000000, spm_limit: 20, status: 'active', status_reason: '', in_use: 3, cooldown_until: null, orphaned: false, last_used_at: now(-12), created_at: now(-86400 * 20), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 13, name: 'claude-bak', plugin_key: 'anthropic', type: 'apikey', created_by: 6, group_ids: [1], proxy_id: 1, priority: 2, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: now(600), cooldown_reason: '429', orphaned: false, last_used_at: now(-300), created_at: now(-86400 * 10), credentials: { api_key: '******', base_url: 'https://api.anthropic.com' } },
  { id: 14, name: 'old-key', plugin_key: 'anthropic', type: 'apikey', created_by: 1, group_ids: [1], proxy_id: null, priority: 5, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'disabled', status_reason: '401 invalid credentials', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-86400), created_at: now(-86400 * 40), credentials: { api_key: '******' } },
  { id: 16, name: 'relay-1', plugin_key: 'relay', type: 'relay_key', created_by: 6, group_ids: [1], proxy_id: null, priority: 3, weight: 1, max_concurrency: 20, schedulable: true, models: [], model_mapping: { 'claude-opus-4-1': 'claude-sonnet-4-5' }, rpm_limit: 120, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 1, cooldown_until: null, orphaned: false, last_used_at: now(-40), created_at: now(-86400 * 2), credentials: { api_key: '******', base_url: 'https://relay.example.com' } },
  { id: 17, name: 'video-1', plugin_key: 'videogen', type: 'video_key', created_by: 1, group_ids: [2], proxy_id: null, priority: 1, weight: 1, max_concurrency: 4, schedulable: true, models: ['myvideo-pro'], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 5, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-3600), created_at: now(-86400 * 3), credentials: { api_key: '******', region: 'us' } },
  { id: 18, name: 'demo-token', plugin_key: 'demo', type: 'token', created_by: 1, group_ids: [1], proxy_id: null, priority: 8, weight: 1, max_concurrency: 2, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: null, created_at: now(-86400), credentials: { token: '******' } },
  { id: 19, name: 'openai-main', plugin_key: 'openai', type: 'apikey', created_by: 1, group_ids: [1, 2], proxy_id: null, priority: 1, weight: 2, max_concurrency: 20, schedulable: true, models: ['gpt-4o', 'gpt-4o-mini'], model_mapping: {}, rpm_limit: 0, tpm_limit: 200000, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 2, cooldown_until: null, orphaned: false, last_used_at: now(-30), created_at: now(-86400 * 2), credentials: { api_key: '******', base_url: 'https://api.openai.com' } },
  { id: 20, name: 'gemini-main', plugin_key: 'gemini', type: 'apikey', created_by: 1, group_ids: [2], proxy_id: null, priority: 1, weight: 1, max_concurrency: 10, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-900), created_at: now(-86400), credentials: { api_key: '******', base_url: 'https://generativelanguage.googleapis.com' } },
  // Claude subscriptions with plan windows (quota seeds below): healthy, rejected + cooling down, nearly used up, no data yet.
  { id: 21, name: 'claude-max-1', plugin_key: 'claude_oauth', type: 'claude_oauth', created_by: 1, group_ids: [1, 2], proxy_id: 1, priority: 1, weight: 2, max_concurrency: 5, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 1, cooldown_until: null, orphaned: false, last_used_at: now(-8), created_at: now(-86400 * 12), credentials: { access_token: '******', refresh_token: '******', email_address: 'max1@example.com' } },
  { id: 22, name: 'claude-max-2', plugin_key: 'claude_oauth', type: 'claude_oauth', created_by: 1, group_ids: [1], proxy_id: null, priority: 1, weight: 1, max_concurrency: 5, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: now(5400), cooldown_reason: '429 rate_limit: 5h window rejected', orphaned: false, last_used_at: now(-600), created_at: now(-86400 * 30), credentials: { access_token: '******', refresh_token: '******', email_address: 'max2@example.com' } },
  { id: 23, name: 'claude-pro-3', plugin_key: 'claude_oauth', type: 'claude_setup_token', created_by: 6, group_ids: [2], proxy_id: null, priority: 2, weight: 1, max_concurrency: 3, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-95), created_at: now(-86400 * 6), credentials: { access_token: '******' } },
  { id: 24, name: 'claude-max-new', plugin_key: 'claude_oauth', type: 'claude_oauth', created_by: 1, group_ids: [1], proxy_id: null, priority: 3, weight: 1, max_concurrency: 5, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: null, created_at: now(-600), credentials: { access_token: '******', refresh_token: '******' } },
  // Claude Code (CCGateway) managed accounts, one container each (mock/ccgateway.ts with SUB2API_MOCK_CCGATEWAY): authorized / not yet.
  { id: 25, name: 'cc-main', plugin_key: 'ccgateway', type: 'managed', created_by: 1, group_ids: [1], proxy_id: 1, priority: 2, weight: 1, max_concurrency: 4, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: now(-420), created_at: now(-86400 * 4), credentials: {} },
  { id: 26, name: 'cc-pending', plugin_key: 'ccgateway', type: 'managed', created_by: 1, group_ids: [1], proxy_id: 1, priority: 5, weight: 1, max_concurrency: 4, schedulable: true, models: ['claude-sonnet-4-5'], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: null, created_at: now(-3600), credentials: {} },
  // Legacy row without a proxy: its container is blocked (no_proxy) until one is picked.
  { id: 27, name: 'cc-noproxy', plugin_key: 'ccgateway', type: 'managed', created_by: 1, group_ids: [1], proxy_id: null, priority: 6, weight: 1, max_concurrency: 4, schedulable: true, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, cooldown_until: null, orphaned: false, last_used_at: null, created_at: now(-7200), credentials: {} },
  // Its plugin was uninstalled without purge_accounts: kept as an orphaned account.
  { id: 15, name: 'legacy-vendor', plugin_key: 'legacy_vendor', type: 'apikey', created_by: null, type_label: { en: 'API key', zh: 'API Key' }, group_ids: [], proxy_id: null, priority: 10, weight: 1, max_concurrency: 5, schedulable: false, models: [], model_mapping: {}, rpm_limit: 0, tpm_limit: 0, tpd_limit: 0, spm_limit: 0, status: 'active', status_reason: '', in_use: 0, orphaned: true, created_at: now(-86400 * 90) }
]
for (const a of accounts) a.type_label ??= typeLabel(a.plugin_key, a.type)
// Latest tests (last_test): fast, slow, failed; the others were never tested.
const seedTest = (id: number, ok: boolean, latency: number, model: string, message: string, ago: number) => {
  const a = accounts.find((x) => x.id === id)
  if (a) a.last_test = { at: now(-ago), ok, latency_ms: latency, model, message }
}
seedTest(12, true, 640, 'claude-haiku-4-5', 'model claude-haiku-4-5 answered', 1800)
seedTest(13, true, 3820, 'claude-sonnet-4-5', 'model claude-sonnet-4-5 answered', 7200)
seedTest(14, false, 212, 'claude-haiku-4-5', 'authentication_error: invalid x-api-key', 86400)
seedTest(19, true, 1450, 'gpt-4o-mini', 'model gpt-4o-mini answered', 600)

// ---------------------------------------------------------------- subscription quota
// Plan windows of subscription accounts (QuotaSnapshot). Types without plan
// limits (API keys, relays, ...) report quota = null. A window resets every
// `period` seconds, first at `firstIn` seconds after the mock started.
const QUOTA_TYPES = new Set(['claude_oauth/claude_oauth', 'claude_oauth/claude_setup_token'])
const MOCK_T0 = Date.now()
const H = 3600
const D = 86400
type QuotaSeed = { key: string; utilization: number; status: string; firstIn: number; period: number }
interface QuotaState {
  source: 'passive' | 'active' | ''
  updated_at: string | null
  error: string
  windows: QuotaSeed[]
  /** Last force query (ms), for the 30 s floor. */
  activeAt: number
}
const claudeWindows = (u5h: number, s5h: string, in5h: number, u7d: number, s7d: string, in7d: number, sonnet: number, fable: number): QuotaSeed[] => [
  { key: '5h', utilization: u5h, status: s5h, firstIn: in5h, period: 5 * H },
  { key: '7d', utilization: u7d, status: s7d, firstIn: in7d, period: 7 * D },
  { key: '7d_sonnet', utilization: sonnet, status: 'allowed', firstIn: in7d, period: 7 * D },
  { key: '7d_fable', utilization: fable, status: 'allowed', firstIn: in7d, period: 7 * D }
]
const quotaState = new Map<number, QuotaState>([
  [21, { source: 'active', updated_at: now(-240), error: '', activeAt: 0, windows: claudeWindows(34, 'allowed', 2 * H + 1500, 61.6, 'allowed', 3 * D + 4 * H, 18, 41) }],
  // 5h window rejected; the account cools down (see cooldown_until).
  [22, { source: 'passive', updated_at: now(-600), error: '', activeAt: 0, windows: claudeWindows(100, 'rejected', H + 1800, 81, 'allowed_warning', D + 7 * H, 47, 66) }],
  // Nearly used up, last active query failed; plus an unknown window key, shown verbatim.
  [23, {
    source: 'passive',
    updated_at: now(-95),
    error: 'usage query failed: upstream 503',
    activeAt: 0,
    windows: [
      { key: '7d', utilization: 88, status: 'allowed', firstIn: 5 * D, period: 7 * D },
      { key: '5h', utilization: 93.4, status: 'allowed_warning', firstIn: 2400, period: 5 * H },
      { key: '7d_opus', utilization: 12, status: '', firstIn: 5 * D, period: 7 * D }
    ]
  }],
  // Never queried yet.
  [24, { source: '', updated_at: null, error: '', activeAt: 0, windows: [] }]
])

/** Next reset after now: MOCK_T0 + firstIn + k·period. */
function nextReset(w: QuotaSeed): string {
  const first = MOCK_T0 + w.firstIn * 1000
  const period = w.period * 1000
  const k = Date.now() <= first ? 0 : Math.ceil((Date.now() - first) / period)
  return new Date(first + k * period).toISOString()
}

function quotaStateOf(a: any): QuotaState | null {
  if (!QUOTA_TYPES.has(`${a.plugin_key}/${a.type}`)) return null
  let st = quotaState.get(a.id)
  if (!st) quotaState.set(a.id, (st = { source: '', updated_at: null, error: '', windows: [], activeAt: 0 }))
  return st
}

/** QuotaSnapshot of an account, or null for types without plan limits. */
function quotaOf(a: any) {
  const st = quotaStateOf(a)
  if (!st) return null
  return {
    supported: true,
    source: st.source,
    updated_at: st.updated_at,
    error: st.error,
    windows: st.windows.map((w) => ({ key: w.key, utilization: w.utilization, resets_at: nextReset(w), status: w.status }))
  }
}

/** Credential refresh state (CONTRACTS §48): OAuth-style types only. */
function refreshOf(a: any) {
  if (!QUOTA_TYPES.has(`${a.plugin_key}/${a.type}`)) return null
  // The list strips credentials: setup tokens are the ones without a refresh token.
  const renews = a.type === 'claude_oauth'
  return a.refresh_state || {
    expires_at: renews ? now(5 * 3600) : null,
    last_attempt_at: renews ? now(-3 * 3600) : null,
    last_success_at: renews ? now(-3 * 3600) : null,
    error_type: '',
    error: ''
  }
}

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
  quota: quotaOf(a),
  refresh: refreshOf(a),
  last_test: a.last_test ?? null,
  groups: (a.group_ids || []).map((id: number) => ({ id, name: id === 1 ? 'default' : id === 2 ? 'vip' : `group-${id}` }))
})

/** The stored mock account (for other fixtures, e.g. the CCGateway containers); undefined when missing. */
export function mockAccount(id: number): { status: string; proxy_id: number | null; plugin_key: string; type: string } | undefined {
  return accounts.find((a) => a.id === id)
}

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
  if (k === 'ccgateway') return { schema: { type: 'object', properties: {} }, ui_schema: {} }
  if (k === 'claude_oauth') {
    // The real plugin form (plugins/claude-oauth/forms).
    const file = req.params.type === 'claude_setup_token' ? 'setup_token' : 'oauth'
    try {
      return { schema: JSON.parse(readFileSync(fileURLToPath(new URL(`../../plugins/claude-oauth/forms/${file}.schema.json`, import.meta.url)), 'utf8')), ui_schema: {} }
    } catch {
      return { schema: { type: 'object', required: ['access_token'], properties: { access_token: { type: 'string', title: 'Access Token', writeOnly: true } } }, ui_schema: {} }
    }
  }
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
  // Accounts of disabled plugins are hidden unless orphaned=true|all.
  if (q.orphaned === 'true') list = list.filter((a) => a.orphaned)
  else if (q.orphaned !== 'all') list = list.filter((a) => !a.orphaned)
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
  const { who, scope } = accountScope(req, 'delete')
  const i = accounts.findIndex((x) => x.id === Number(req.params.id))
  if (i < 0 || !inScope(scope, who, accounts[i])) return fail(404, 'not_found', 'account not found')
  accounts.splice(i, 1)
  return noContent()
})
on('POST', '/accounts/:id/test', async (req) => {
  const r = scopedAccount(req, 'test')
  if (!('a' in r)) return r
  const a = r.a
  // The model goes through the account's model_mapping first (§18.3); no model = the plugin default.
  const requested = typeof req.body?.model === 'string' ? req.body.model : ''
  const asked = requested || (a.plugin_key === 'openai' ? 'gpt-4o-mini' : a.plugin_key === 'gemini' ? 'gemini-2.5-flash' : 'claude-haiku-4-5')
  const model = (a.model_mapping || {})[asked] || asked
  const upstream = `${String(a.credentials?.base_url || 'https://api.anthropic.com').replace(/\/+$/, '')}${a.plugin_key === 'openai' ? '/v1/chat/completions' : '/v1/messages'}`
  // Mocked outcomes: disabled = 401 (would disable), *opus* = 429 (would cool down),
  // *unknown* / *gpt-5* = 404 model not found, otherwise OK with a random latency.
  const latency = a.status === 'disabled' ? 212 : 300 + Math.round(Math.random() * (model.includes('pro') ? 6000 : 2500))
  await new Promise((ok) => setTimeout(ok, Math.min(1500, latency / 3)))
  let out: Record<string, unknown>
  if (a.status === 'disabled') {
    out = { ok: false, status: 401, latency_ms: latency, message: 'authentication_error: invalid x-api-key', reason: 'auth_rejected', effect: 'disable', body: '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}' }
  } else if (model.includes('opus')) {
    out = { ok: false, status: 429, latency_ms: latency, message: 'rate_limit_error: Number of request tokens has exceeded your per-minute rate limit', reason: 'rate_limited', effect: 'cooldown', body: '{"type":"error","error":{"type":"rate_limit_error","message":"Number of request tokens has exceeded your per-minute rate limit"}}' }
  } else if (model.includes('unknown') || model.startsWith('gpt-5')) {
    out = { ok: false, status: 404, latency_ms: latency, message: `not_found_error: model: ${model}`, reason: 'model_not_found', effect: '', body: `{"type":"error","error":{"type":"not_found_error","message":"model: ${model}"}}` }
  } else {
    out = {
      ok: true,
      status: 200,
      latency_ms: latency,
      message: `model ${model} answered`,
      reason: '',
      effect: '',
      usage: { input_tokens: 12, output_tokens: 8, cache_read_tokens: 0, cache_creation_tokens: 0 },
      body: JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', model, content: [{ type: 'text', text: 'pong' }], stop_reason: 'end_turn', usage: { input_tokens: 12, output_tokens: 8 } })
    }
  }
  out = { ...out, model, requested_model: requested, upstream }
  a.last_test = { at: now(), ok: out.ok, latency_ms: latency, model, message: String(out.message || '') }
  return out
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
// Subscription quota (QuotaSnapshot). force=true queries the "upstream" at
// most every 30 s per account (sooner gets the cached snapshot back), with some
// latency and drift; a rejected window stays rejected until it resets.
on('GET', '/accounts/:id/quota', async (req) => {
  const r = scopedAccount(req, 'read')
  if (!('a' in r)) return r
  const st = quotaStateOf(r.a)
  if (!st) return { supported: false, source: '', updated_at: null, error: '', windows: [] }
  if (req.query.force === 'true' && Date.now() - st.activeAt >= 30_000) {
    await new Promise((ok) => setTimeout(ok, 700))
    st.activeAt = Date.now()
    st.source = 'active'
    st.updated_at = now()
    st.error = ''
    if (!st.windows.length) st.windows = claudeWindows(3, 'allowed', 4 * H + 1800, 1, 'allowed', 6 * D, 0, 0)
    for (const w of st.windows) {
      if (w.status !== 'rejected') w.utilization = Math.min(100, Math.round((w.utilization + Math.random() * 2) * 10) / 10)
    }
  }
  return quotaOf(r.a)
})
// Renews the credentials of an OAuth account now (CONTRACTS §48).
on('POST', '/accounts/:id/refresh-credentials', (req) => {
  const r = scopedAccount(req, 'update')
  if (!('a' in r)) return r
  const a = r.a
  if (!refreshOf(a)) return fail(400, 'invalid_argument', 'this account type does not refresh its credentials')
  if (!a.credentials?.refresh_token) {
    a.refresh_state = { ...refreshOf(a), last_attempt_at: now(0), error_type: 'auth_rejected', error: 'the account has no refresh_token; authorize it again' }
    return { refreshed: false, error_type: 'auth_rejected', error: a.refresh_state.error, refresh: refreshOf(a) }
  }
  a.refresh_state = { expires_at: now(8 * 3600), last_attempt_at: now(0), last_success_at: now(0), error_type: '', error: '' }
  return { refreshed: true, refresh: refreshOf(a) }
})
// Clears the cooldown / rate-limit state of the account (needs update on it).
on('POST', '/accounts/:id/reset-status', (req) => {
  const r = scopedAccount(req, 'update')
  if (!('a' in r)) return r
  r.a.cooldown_until = null
  r.a.cooldown_reason = ''
  return { ok: true }
})
on('POST', '/accounts/:id/credentials/reveal', (req) => {
  const r = scopedAccount(req, 'credential:view')
  if (!('a' in r)) return r
  const a = r.a
  return { api_key: 'sk-ant-api03-mock-plaintext-key', base_url: a.credentials?.base_url || 'https://api.anthropic.com' }
})
