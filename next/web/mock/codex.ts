import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, normalize } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { fail, on } from './router'

// Mock of the codex plugin (docs/PLUGIN-CODEX.md §4): its admin routes
// (/p/codex/auth/*) and its native account form from
// plugins/codex/ui/native/dist (build it first). Nothing leaves the mock:
//   device code   the code is "approved" on the third poll (about 6 s);
//                 a session the mock does not know reads as expired.
//   SIWC          the authorize link is the real OpenAI address shape (it
//                 does not work); paste back any
//                 http://127.0.0.1:1455/auth/callback?code=<anything>&state=<state of the link>.
//                 error=access_denied, a missing code or another state fail
//                 as the plugin would.
// Answers have the plugin's shapes (CONTRACTS §3.1): {"data": ...} on
// success (pluginsdk.DataResponse); 400 invalid_argument with details.fields
// for a malformed request (pluginsdk.BadRequest); the plugin's own codes
// (state_mismatch, session_expired, ...) for a refused flow; every message
// "English / 中文".

const CODEX_DIR = fileURLToPath(new URL('../../plugins/codex/', import.meta.url))
const CODEX_DIST = join(CODEX_DIR, 'ui/native/dist')

export function codexAsset(path: string): { type: string; body: Buffer } | null {
  // The package icon (manifest icon), shown on the account type card.
  if (path === manifest.icon && /^assets\/[\w.-]+\.svg$/.test(path) && existsSync(join(CODEX_DIR, path))) return { type: 'image/svg+xml', body: readFileSync(join(CODEX_DIR, path)) }
  if (!path.startsWith('ui/native/')) return null
  const rel = normalize(path.slice('ui/native/'.length))
  if (rel.startsWith('..')) return null
  const file = join(CODEX_DIST, rel)
  if (!existsSync(file)) return null
  return { type: rel.endsWith('.css') ? 'text/css' : 'text/javascript', body: readFileSync(file) }
}

/**
 * The two account types as GET /account-types lists them (before platforms
 * and endpoints), read from plugins/codex/manifest.json so the mock follows
 * the plugin; the values below stand in while the manifest is missing.
 */
const CODEX_MANIFEST = join(CODEX_DIR, 'manifest.json')
function readManifest(): any {
  try {
    return JSON.parse(readFileSync(CODEX_MANIFEST, 'utf8'))
  } catch {
    return {}
  }
}
const manifest = readManifest()
const declared = (id: string): any => (manifest.accountTypes || []).find((a: any) => a.id === id) || {}
const NAME = manifest.name || { en: 'ChatGPT (Codex)', zh: 'ChatGPT（Codex）' }
const VERSION = manifest.version || '0.1.0'
const FALLBACK = {
  codex_device: { authMethodLabel: { en: 'Device code', zh: '设备码登录' }, description: { en: 'Your own ChatGPT subscription, authorized with the Codex device code login', zh: '你自己的 ChatGPT 订阅，用 Codex 设备码登录授权' } },
  chatgpt_siwc: { authMethodLabel: { en: 'Sign in with ChatGPT', zh: 'Sign in with ChatGPT' }, description: { en: "Your own ChatGPT subscription through OpenAI's Sign in with ChatGPT", zh: '通过 OpenAI 官方 Sign in with ChatGPT 接入你自己的 ChatGPT 订阅' } }
}
export const codexAccountTypes = (['codex_device', 'chatgpt_siwc'] as const).map((type) => {
  const d = declared(type)
  return {
    plugin_key: 'codex',
    plugin_name: NAME,
    plugin_version: VERSION,
    asset_base: `/plugin-ui/codex/${VERSION}-dev`,
    trust: 'official',
    ...(manifest.icon ? { icon: manifest.icon } : {}),
    type,
    label: d.label || NAME,
    description: d.description || FALLBACK[type].description,
    creation_group: d.creationGroup || 'codex',
    auth_method_label: d.authMethodLabel || FALLBACK[type].authMethodLabel,
    form: { mode: d.form?.mode || 'native', component: d.form?.component || 'CodexAuthForm' },
    sensitive_fields: d.sensitiveFields || ['access_token', 'refresh_token', 'id_token'],
    supports: ['openai']
  }
})

/** GET /ui/plugins entry: no menu or page, only the native entry holding CodexAuthForm. */
export const codexUIPlugin = {
  key: 'codex',
  version: VERSION,
  name: NAME,
  asset_base: `/plugin-ui/codex/${VERSION}-dev`,
  menus: [],
  pages: {},
  slots: [],
  native_entry: 'ui/native/entry.js',
  trust: 'official',
  host_ui_compat: manifest.hostUICompat || '^3.6'
}

/** The plugin's ValidateCredentials as far as the mock goes: the tokens of the type's flow. */
export function codexCredentialErrors(type: string, creds: Record<string, unknown>) {
  const need = ['access_token', 'refresh_token', type === 'codex_device' ? 'chatgpt_account_id' : 'client_id']
  const missing = need.filter((k) => typeof creds[k] !== 'string' || !creds[k])
  if (!missing.length) return null
  return fail(400, 'invalid_argument', 'invalid credentials', { fields: missing.map((k) => ({ field: `credentials.${k}`, code: 'required', message: k === 'access_token' ? 'Authorize the account first' : `${k} is required for ${type}` })) })
}

/** pluginsdk.BadRequest: 400 invalid_argument with one field error. */
const badRequest = (field: string, code: string, message: string) =>
  fail(400, 'invalid_argument', 'invalid request / 请求参数不正确', { fields: [{ field, code, message }] })
const noSession = () => badRequest('session_id', 'required', 'session_id is required / 缺少 session_id')

/**
 * The query of a pasted callback, read like the plugin's parseCallback: the
 * whole address, the address without its scheme, or only the query
 * ("?code=..." / "code=..."); the fragment when the query has none.
 */
function callbackQuery(raw: string): URLSearchParams {
  let s = raw.trim().replace(/^["'<>`\s]+|["'<>`\s]+$/g, '').replace(/&amp;/g, '&')
  let fragment = ''
  const hash = s.indexOf('#')
  if (hash >= 0) [s, fragment] = [s.slice(0, hash), s.slice(hash + 1)]
  const q = s.indexOf('?')
  const query = q >= 0 ? s.slice(q + 1) : s.includes('://') || (!s.includes('=') && s.includes('/')) ? '' : s
  const params = new URLSearchParams(query)
  return !params.get('code') && !params.get('error') && fragment ? new URLSearchParams(fragment) : params
}

const token = (prefix: string) => `${prefix}.${randomBytes(24).toString('base64url')}`
const inAnHour = () => Math.floor(Date.now() / 1000) + 3600

// ------------------------------------------------------------------ device code

const deviceSessions = new Map<string, { polls: number; expires: number }>()

on('POST', '/p/codex/auth/device/start', () => {
  const session_id = randomUUID()
  deviceSessions.set(session_id, { polls: 0, expires: Date.now() + 900_000 })
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = () => Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
  return { data: { session_id, verification_url: 'https://auth.openai.com/codex/device', user_code: `${pick()}-${pick()}`, interval: 2, expires_in: 900 } }
})

on('POST', '/p/codex/auth/device/poll', (req) => {
  const id = String(req.body?.session_id || '').trim()
  if (!id) return noSession()
  const s = deviceSessions.get(id)
  if (!s || Date.now() > s.expires) {
    deviceSessions.delete(id)
    return { data: { status: 'expired', message: 'the device code expired; start again / 设备码已过期，请重新开始' } }
  }
  if (++s.polls < 3) return { data: { status: 'pending', interval: 2 } }
  deviceSessions.delete(id)
  return { data: {
    status: 'done',
    credentials: {
      access_token: token('eyJhbGciOiJSUzI1NiJ9.mock-access'),
      refresh_token: token('rt'),
      id_token: token('eyJhbGciOiJSUzI1NiJ9.mock-id'),
      expires_at: inAnHour(),
      email: 'codex-owner@example.com',
      chatgpt_account_id: randomUUID(),
      plan_type: 'plus'
    }
  } }
})

// ------------------------------------------------------------------ Sign in with ChatGPT

const siwcSessions = new Map<string, { state: string; client_id: string; host: string }>()

on('POST', '/p/codex/auth/siwc/start', (req) => {
  const clientId = String(req.body?.client_id || '')
  const host = String(req.body?.ext_agent_host_id || '') || `urn:uuid:${randomUUID()}`
  const state = randomBytes(12).toString('base64url')
  const session_id = randomUUID()
  siwcSessions.set(session_id, { state, client_id: clientId, host })
  const q = new URLSearchParams({
    client_id: clientId || 'dynamic_agent_client',
    ...(clientId ? {} : { agent_name_hint: 'sup2api' }),
    ext_agent_host_id: host,
    response_type: 'code',
    redirect_uri: 'http://127.0.0.1:1455/auth/callback',
    scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
    resource: 'https://api.openai.com/v1',
    state,
    nonce: randomBytes(12).toString('base64url'),
    code_challenge_method: 'S256',
    code_challenge: randomBytes(32).toString('base64url')
  })
  return { data: { session_id, authorize_url: `https://auth.openai.com/api/accounts/authorize?${q}` } }
})

on('POST', '/p/codex/auth/siwc/exchange', (req) => {
  const id = String(req.body?.session_id || '').trim()
  if (!id) return noSession()
  const p = callbackQuery(String(req.body?.callback_url || ''))
  if (!p.get('code') && !p.get('error'))
    return fail(400, 'invalid_callback', 'the callback address has no code: paste the whole address of the page that failed to open / 回调网址中没有 code：请粘贴打不开的那个页面的完整地址')
  const s = siwcSessions.get(id)
  if (!s) return fail(404, 'session_expired', 'the authorization session expired; generate a new link / 授权会话已过期，请重新生成链接')
  if (p.get('error') === 'access_denied') {
    siwcSessions.delete(id)
    return fail(400, 'access_denied', `authorization was denied / 授权被拒绝 (${p.get('error')})`)
  }
  if (p.get('error')) return fail(400, 'authorization_failed', `authorization failed / 授权失败 (${p.get('error')})`)
  if (p.get('state') !== s.state)
    return fail(400, 'state_mismatch', 'the callback does not belong to this authorization (state mismatch); paste the address from the latest link / 回调与本次授权不匹配（state 不一致），请粘贴最新链接的回调地址')
  const issued = p.get('client_id') || s.client_id || `agent_${randomBytes(8).toString('hex')}`
  if (s.client_id && issued !== s.client_id)
    return fail(400, 'client_mismatch', "the callback client_id differs from the account's; re-authorize with the same ChatGPT account / 回调中的 client_id 与账号已有的不同，请用同一个 ChatGPT 账号重新授权")
  siwcSessions.delete(id)
  return { data: {
    credentials: {
      access_token: token('eyJhbGciOiJSUzI1NiJ9.mock-siwc'),
      refresh_token: token('rt'),
      id_token: token('eyJhbGciOiJSUzI1NiJ9.mock-id'),
      expires_at: inAnHour(),
      email: 'siwc-owner@example.com',
      client_id: issued,
      ext_agent_host_id: s.host,
      scopes: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
    }
  } }
})
