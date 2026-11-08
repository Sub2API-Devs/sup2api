import type { PluginHost } from '@sub2api/host'

// Plugin-scoped host handed to register(); shared by the codex components.
// All plugin route shapes (docs/PLUGIN-CODEX.md §4) live in this file.
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

/** The credential object both flows return (the account's credentials). */
export interface CodexCredentials {
  access_token: string
  refresh_token: string
  id_token?: string
  /** Unix seconds. */
  expires_at?: number
  email?: string
  // codex_device
  chatgpt_account_id?: string
  plan_type?: string
  // chatgpt_siwc
  client_id?: string
  ext_agent_host_id?: string
  scopes?: string | string[]
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
  /** A new poll interval (seconds), when the plugin asks to slow down. */
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

// ------------------------------------------------------------------ helpers

/** Human-readable message of a failed call (ApiError is an Error), else `fallback`. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}
