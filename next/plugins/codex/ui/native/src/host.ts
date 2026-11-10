import { isApiError, type PluginHost } from '@sub2api/host'

// Plugin-scoped host handed to register(); shared by the codex components.
// All plugin route shapes (docs/PLUGIN-CODEX.md §4) live in this file.
//
// The routes answer CONTRACTS §3.1: a success is {"data": ...}, which
// pluginApi unwraps (the shapes below are the data member); a failure is
// {"error": {code, message, details}}, thrown as an ApiError. A malformed
// request is 400 invalid_argument with details.fields; a refusal of the flow
// keeps its own code (device_auth_disabled, state_mismatch, ...). Every
// message is "English / 中文", so the form shows it as given.
let host: PluginHost | null = null

export function setHost(h: PluginHost | null) {
  host = h
}

export function useCodexHost(): PluginHost {
  if (!host) throw new Error('codex UI used before register(host)')
  return host
}

const api = () => useCodexHost().pluginApi

// ------------------------------------------------------------------ credentials

/** The credential object both flows return (the account's credentials; Go: codex.Credentials). */
export interface CodexCredentials {
  access_token: string
  /** Left out when the issuer sent none. */
  refresh_token?: string
  id_token?: string
  /** Unix seconds. */
  expires_at?: number
  email?: string
  /** ChatGPT plan, read from the tokens; either account type may carry it. */
  plan_type?: string
  // codex_device
  chatgpt_account_id?: string
  // chatgpt_siwc
  client_id?: string
  ext_agent_host_id?: string
  /** The granted scope, space separated as OAuth sends it. */
  scopes?: string
}

// ------------------------------------------------------------------ device code (codex_device)

export interface DeviceStart {
  session_id: string
  verification_url: string
  user_code: string
  /** Seconds between polls. */
  interval: number
  /** Seconds the code stays valid. */
  expires_in: number
}

export type PollStatus = 'pending' | 'done' | 'expired' | 'error'

export interface DevicePoll {
  status: PollStatus
  credentials?: CodexCredentials
  message?: string
  /** The poll interval (seconds) on pending answers; it grows when OpenAI asks to slow down. */
  interval?: number
}

export const startDevice = () => api().post<DeviceStart>('/auth/device/start', {})
export const pollDevice = (sessionId: string) => api().post<DevicePoll>('/auth/device/poll', { session_id: sessionId })

// ------------------------------------------------------------------ Sign in with ChatGPT (chatgpt_siwc)

export interface SiwcStart {
  session_id: string
  authorize_url: string
}

/** Re-authorizing an account sends its issued client_id and host id. */
export interface SiwcStartBody {
  client_id?: string
  ext_agent_host_id?: string
}

export const startSiwc = (body: SiwcStartBody) => api().post<SiwcStart>('/auth/siwc/start', body)
export const exchangeSiwc = (sessionId: string, callbackUrl: string) =>
  api().post<{ credentials: CodexCredentials }>('/auth/siwc/exchange', { session_id: sessionId, callback_url: callbackUrl })

// ------------------------------------------------------------------ official usage resets (codex_device)

/** One reset credit of the account (POST /reset-credits/list); times are Unix seconds. */
export interface ResetCredit {
  id: string
  /** OpenAI's own wording; null when it sent none. */
  title: string | null
  description: string | null
  /** "available", "redeeming", "redeemed" or a newer state. */
  status: string
  granted_at: number
  /** null: does not expire. */
  expires_at: number | null
}

export interface ResetCredits {
  available_count: number
  /** Sorted by expiry, the soonest first; a credit that does not expire last. */
  credits: ResetCredit[]
}

/** A used reset (POST /reset-credits/consume); a refusal (nothing_to_reset, no_credit, ...) is an ApiError. */
export interface ResetOutcome {
  outcome: 'reset' | 'already_redeemed'
  windows_reset: number
  /** false: the reset was used but the account's automatic disable could not be lifted. */
  account_restored: boolean
}

export const listResetCredits = (accountId: number) => api().post<ResetCredits>('/reset-credits/list', { account_id: accountId })
export const redeemResetCredit = (accountId: number, creditId?: string) =>
  api().post<ResetOutcome>('/reset-credits/consume', { account_ids: [accountId], ...(creditId ? { credit_id: creditId } : {}) })

// ------------------------------------------------------------------ helpers

/**
 * Human-readable message of a failed call, else `fallback`. An
 * invalid_argument error says which field is wrong in details.fields: its
 * messages are shown rather than the generic "invalid request".
 */
export function errorMessage(e: unknown, fallback: string): string {
  if (isApiError(e)) {
    const fields = Object.values(e.fields).filter(Boolean)
    if (fields.length) return fields.join('; ')
  }
  return e instanceof Error && e.message ? e.message : fallback
}
