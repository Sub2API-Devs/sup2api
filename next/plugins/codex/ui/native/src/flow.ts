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
 * a hint: the plugin parses and checks it).
 *   empty    nothing pasted yet
 *   invalid  not an http(s) address
 *   denied   the address carries ?error= (consent refused or failed)
 *   no_code  an address without ?code=
 *   ok       looks like the callback
 */
export type CallbackShape = 'empty' | 'invalid' | 'denied' | 'no_code' | 'ok'

export function callbackShape(raw: string): CallbackShape {
  const text = raw.trim()
  if (!text) return 'empty'
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return 'invalid'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid'
  if (url.searchParams.get('error')) return 'denied'
  return url.searchParams.get('code') ? 'ok' : 'no_code'
}

/** Poll delay in ms for an interval in seconds: at least 2 s, 5 s when unusable. */
export function pollDelay(interval: unknown): number {
  const n = Number(interval)
  return Number.isFinite(n) && n > 0 ? Math.max(2, n) * 1000 : 5000
}

/** Plans with a message (plan.<id>); others are shown as given. */
export const KNOWN_PLANS = ['free', 'go', 'plus', 'pro', 'team', 'business', 'enterprise', 'edu'] as const
