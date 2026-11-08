// Pure helpers of the codex account form (no host, no DOM): which flows an
// account type shows, how fresh credentials replace the old ones, and the
// checks on what the operator pastes. Covered by flow.spec.ts.
import type { CodexCredentials } from './host'

export type Flow = 'device' | 'siwc'

/** Account types of the plugin (manifest accountTypes[].id). */
export const DEVICE_TYPE = 'codex_device'
export const SIWC_TYPE = 'chatgpt_siwc'

/** Flows of an account type; both when the type is not known. */
export function flowsFor(type: string | null | undefined): Flow[] {
  if (type === DEVICE_TYPE) return ['device']
  if (type === SIWC_TYPE) return ['siwc']
  return ['device', 'siwc']
}

/** The account type the form is for: the editor's accountType prop, else the account's own. */
export function typeOf(accountType: { type?: string } | null | undefined, account: { type?: string } | null | undefined): string {
  return accountType?.type || account?.type || ''
}

/**
 * Credential keys the flows write. A fresh authorization replaces all of
 * them, so a key the new flow does not return (a device account's plan on a
 * Sign in with ChatGPT login, an id_token the issuer left out) does not
 * survive as a stale or masked value; any other key is kept.
 */
export const CODEX_FIELDS = [
  'access_token',
  'refresh_token',
  'id_token',
  'expires_at',
  'email',
  'chatgpt_account_id',
  'plan_type',
  'client_id',
  'ext_agent_host_id',
  'scopes'
] as const

export function mergeCredentials(current: Record<string, unknown> | null | undefined, fresh: CodexCredentials): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(current || {}) }
  for (const k of CODEX_FIELDS) delete out[k]
  for (const [k, v] of Object.entries(fresh)) if (v !== undefined && v !== null) out[k] = v
  return out
}

/** Whether the credentials hold an access token (the core's mask "******" counts: it keeps the stored one). */
export function hasAccessToken(creds: Record<string, unknown> | null | undefined): boolean {
  const v = creds?.access_token
  return typeof v === 'string' && v.trim() !== ''
}

export interface CredentialSummary {
  email: string
  plan: string
  /** ms since the epoch, or null when unknown. */
  expiresAt: number | null
  accountId: string
  clientId: string
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function summarize(creds: Record<string, unknown> | null | undefined): CredentialSummary {
  const c = creds || {}
  const exp = Number(c.expires_at)
  return {
    email: str(c.email),
    plan: str(c.plan_type),
    expiresAt: Number.isFinite(exp) && exp > 0 ? exp * 1000 : null,
    accountId: str(c.chatgpt_account_id),
    clientId: str(c.client_id)
  }
}

/** Seconds as m:ss (or h:mm:ss); negative counts as 0. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/**
 * Shape of the callback address pasted back after Sign in with ChatGPT (only
 * a hint: the plugin parses and checks it). It reads what the plugin's
 * parseCallback reads: the whole address, the address without its scheme, or
 * only the query ("?code=..." or "code=..."), with parameters in the fragment
 * when the query has none; surrounding quotes or angle brackets and
 * HTML-escaped ampersands are tolerated.
 *   empty    nothing pasted yet
 *   invalid  the plugin cannot read it (a malformed %-escape or a ";")
 *   denied   it carries error= (consent refused or failed)
 *   no_code  no code= parameter
 *   ok       looks like the callback
 */
export type CallbackShape = 'empty' | 'invalid' | 'denied' | 'no_code' | 'ok'

/** Characters parseCallback trims around the pasted text. */
const CALLBACK_TRIM = /^["'<>`\s]+|["'<>`\s]+$/g

/** The query parameters of a pasted callback, or null when the plugin could not read them (Go url.ParseQuery). */
function callbackParams(query: string): URLSearchParams | null {
  if (query.includes(';') || /%(?![0-9a-fA-F]{2})/.test(query)) return null
  return new URLSearchParams(query)
}

export function callbackShape(raw: string): CallbackShape {
  let text = raw.trim().replace(CALLBACK_TRIM, '').replace(/&amp;/g, '&')
  if (!text) return 'empty'
  let fragment = ''
  const hash = text.indexOf('#')
  if (hash >= 0) {
    fragment = text.slice(hash + 1)
    text = text.slice(0, hash)
  }
  const q = text.indexOf('?')
  let query: string
  if (q >= 0) query = text.slice(q + 1)
  else if (text.includes('://') || (!text.includes('=') && text.includes('/'))) query = '' // an address without a query
  else query = text
  let params = callbackParams(query)
  if (!params) return 'invalid'
  if (!params.get('code') && !params.get('error') && fragment) params = callbackParams(fragment) ?? params
  if (params.get('error')?.trim()) return 'denied'
  return params.get('code')?.trim() ? 'ok' : 'no_code'
}

/** Device code polling: the delay when the plugin gives no usable interval, and the shortest one. */
export const DEFAULT_POLL_MS = 5000
export const MIN_POLL_SECONDS = 2
/** Lifetime of a device code when the start answer has none (Codex: 15 minutes). */
export const DEFAULT_CODE_TTL_SECONDS = 900
/** Failed poll requests in a row (a dropped request, a restarting node) before the flow gives up. */
export const MAX_POLL_FAILURES = 3
/** How often the countdown ticks. */
export const COUNTDOWN_TICK_MS = 1000

/** Poll delay in ms for an interval in seconds: at least MIN_POLL_SECONDS, DEFAULT_POLL_MS when unusable. */
export function pollDelay(interval: unknown): number {
  const n = Number(interval)
  return Number.isFinite(n) && n > 0 ? Math.max(MIN_POLL_SECONDS, n) * 1000 : DEFAULT_POLL_MS
}

/** Plans with a message (plan.<id>); others are shown as given. */
export const KNOWN_PLANS = ['free', 'go', 'plus', 'pro', 'team', 'business', 'enterprise', 'edu'] as const
