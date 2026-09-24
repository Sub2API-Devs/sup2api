// Session-aware HTTP client for the console API (/api/v1).
//
// Contract (docs/CONTRACTS.md §3):
//   success  -> {"data": ...}            list -> {"data": [...], "page": {...}}
//   failure  -> {"error": {code, message, details}}
// 401 triggers one refresh attempt (POST /auth/refresh) and a retry.
// 403 step_up_required asks the registered step-up handler for a token
// (password dialog -> POST /auth/step-up) and retries with X-Step-Up-Token.

export interface FieldError {
  field: string
  code?: string
  message: string
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, any> & { fields?: FieldError[] }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, any>
  /** field path -> message, from details.fields of invalid_argument errors */
  readonly fields: Record<string, string>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.code)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code || 'internal'
    this.details = body.details || {}
    const fields: Record<string, string> = {}
    for (const f of body.details?.fields || []) {
      if (f && f.field) fields[f.field] = localizedText(f.message) || f.code || 'invalid'
    }
    this.fields = fields
  }
}

/** Field messages may be plain strings or {en, zh} objects (e.g. price expressions). */
function localizedText(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const m = v as Record<string, unknown>
    const loc = config.locale?.() || 'en'
    const s = m[loc] ?? m.en ?? Object.values(m)[0]
    return typeof s === 'string' ? s : ''
  }
  return ''
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export interface PageInfo {
  page: number
  page_size: number
  total: number
}

export interface ListResult<T> {
  items: T[]
  page: PageInfo
}

export type Query = Record<string, string | number | boolean | null | undefined | Array<string | number>>

export interface RequestOptions {
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Do not attach the access token / do not try to refresh. */
  anonymous?: boolean
  /** Do not open the step-up dialog on step_up_required. */
  noStepUp?: boolean
}

// ------------------------------------------------------------------ session

export interface Session {
  access_token: string
  refresh_token: string
  /** epoch ms */
  expires_at: number
}

const SESSION_KEY = 's2a.session'
const listeners = new Set<(s: Session | null) => void>()

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

let current: Session | null = typeof localStorage !== 'undefined' ? readSession() : null

export const session = {
  get(): Session | null {
    return current
  },
  set(s: Session | null) {
    current = s
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((fn) => fn(s))
  },
  /** Store a login/refresh response ({access_token, refresh_token, expires_in}). */
  fromTokenResponse(r: { access_token: string; refresh_token: string; expires_in: number }) {
    session.set({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: Date.now() + (r.expires_in || 7200) * 1000
    })
  },
  clear() {
    session.set(null)
    stepUpToken = null
  },
  onChange(fn: (s: Session | null) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SESSION_KEY) {
      current = readSession()
      listeners.forEach((fn) => fn(current))
    }
  })
}

// ------------------------------------------------------------------ config

/**
 * Why the session ended: "expired" when a signed-in session could not be
 * renewed (refresh token expired, revoked or reused), "unauthenticated" when
 * there was no session.
 */
export type UnauthenticatedReason = 'expired' | 'unauthenticated'

export interface HttpConfig {
  baseURL: string
  /** Called when the session is gone (refresh failed). */
  onUnauthenticated?: (reason: UnauthenticatedReason) => void
  /**
   * Asks the user to confirm their password and returns a step-up token
   * (already obtained from POST /auth/step-up), or null when cancelled.
   */
  stepUp?: () => Promise<{ token: string; expiresIn: number } | null>
  locale?: () => string
}

const config: HttpConfig = { baseURL: '/api/v1' }

export function configureHttp(c: Partial<HttpConfig>) {
  Object.assign(config, c)
}

let stepUpToken: { token: string; until: number } | null = null
let refreshing: Promise<RefreshOutcome> | null = null
let stepUpPending: Promise<{ token: string; expiresIn: number } | null> | null = null

function buildURL(path: string, query?: Query): string {
  const base = /^https?:\/\//.test(path) || path.startsWith(config.baseURL + '/') ? '' : config.baseURL
  let url = base + (path.startsWith('/') ? path : '/' + path)
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)))
      else qs.append(k, String(v))
    }
    const s = qs.toString()
    if (s) url += (url.includes('?') ? '&' : '?') + s
  }
  return url
}

// ------------------------------------------------------------------ token refresh
//
// The server rotates refresh tokens and treats a rotated token presented again
// as theft: it revokes the whole login (CONTRACTS §14.2). So a refresh token
// must be sent at most once, even with several tabs or parallel 401s:
//   - in a tab, concurrent callers share one in-flight refresh;
//   - across tabs, refreshes are serialized by a Web Lock (localStorage lock
//     as fallback) and, once holding the lock, a tab first re-reads the
//     session: when another tab already refreshed, it adopts that session
//     instead of presenting the (now rotated) token again;
//   - a request that failed with an access token that is no longer current
//     (someone refreshed meanwhile) is simply retried.

/** ok: session renewed; invalid: refresh token rejected; error: network / server error. */
type RefreshOutcome = 'ok' | 'invalid' | 'error'

const REFRESH_LOCK = 's2a.refresh'
const STORAGE_LOCK_KEY = 's2a.refresh.lock'
const STORAGE_LOCK_TTL_MS = 10_000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Re-reads the session written by other tabs (the storage event may not have fired yet). */
function syncSession(): Session | null {
  if (typeof localStorage === 'undefined') return current
  let raw: string | null
  try {
    raw = localStorage.getItem(SESSION_KEY)
  } catch {
    return current // storage unavailable: keep the in-memory session
  }
  const stored = raw ? readSession() : null
  if (stored?.access_token !== current?.access_token) {
    current = stored
    listeners.forEach((fn) => fn(current))
  }
  return current
}

/** Best-effort cross-tab mutex in localStorage (browsers without Web Locks, e.g. plain http). */
async function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  const me = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const owner = () => {
    try {
      return (JSON.parse(localStorage.getItem(STORAGE_LOCK_KEY) || 'null') as { owner: string; until: number } | null) || null
    } catch {
      return null
    }
  }
  const deadline = Date.now() + STORAGE_LOCK_TTL_MS
  try {
    while (Date.now() < deadline) {
      const held = owner()
      if (!held || held.until < Date.now()) {
        localStorage.setItem(STORAGE_LOCK_KEY, JSON.stringify({ owner: me, until: Date.now() + STORAGE_LOCK_TTL_MS }))
        await sleep(25) // let a concurrent writer win or lose
        if (owner()?.owner === me) break
      }
      await sleep(80)
    }
  } catch {
    /* storage unavailable: run unlocked */
  }
  try {
    return await fn()
  } finally {
    try {
      if (owner()?.owner === me) localStorage.removeItem(STORAGE_LOCK_KEY)
    } catch {
      /* ignore */
    }
  }
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
  if (locks?.request) return locks.request(REFRESH_LOCK, { mode: 'exclusive' }, fn) as Promise<T>
  if (typeof localStorage !== 'undefined') return withStorageLock(fn)
  return fn()
}

async function doRefresh(stale: string | undefined): Promise<RefreshOutcome> {
  // Another tab may have refreshed while this one waited for the lock.
  const s = syncSession()
  if (!s?.refresh_token) return 'invalid'
  if (stale && s.access_token !== stale) return 'ok'
  try {
    const res = await fetch(buildURL('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    })
    if (res.status === 400 || res.status === 401 || res.status === 403) return 'invalid'
    if (!res.ok) return 'error'
    const json = await safeJSON(res)
    if (!json?.data?.access_token) return 'error'
    session.fromTokenResponse(json.data)
    return 'ok'
  } catch {
    return 'error'
  }
}

/**
 * Renews the session after a 401. `stale` is the access token the failed
 * request carried; when the session already holds a different one, the
 * request is just retried.
 */
function refreshSession(stale: string | undefined): Promise<RefreshOutcome> {
  const s = session.get()
  if (s && stale && s.access_token !== stale) return Promise.resolve('ok')
  if (!refreshing) {
    refreshing = withRefreshLock(() => doRefresh(stale)).finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function obtainStepUp(): Promise<string | null> {
  if (!config.stepUp) return null
  if (!stepUpPending) {
    stepUpPending = config.stepUp().finally(() => setTimeout(() => (stepUpPending = null), 0))
  }
  const r = await stepUpPending
  if (!r) return null
  // Keep a small safety margin before server-side expiry.
  stepUpToken = { token: r.token, until: Date.now() + Math.max(0, r.expiresIn - 10) * 1000 }
  return r.token
}

/** Low-level request returning the parsed JSON envelope (or null for 204). */
export async function requestRaw(method: string, path: string, opts: RequestOptions = {}): Promise<any> {
  /** Access token carried by the last attempt. */
  let sentToken: string | undefined
  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers || {}) }
    const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData
    let body: BodyInit | undefined
    if (opts.body !== undefined) {
      if (isForm) body = opts.body as FormData
      else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(opts.body)
      }
    }
    const s = session.get()
    sentToken = !opts.anonymous ? s?.access_token : undefined
    if (sentToken) headers['Authorization'] = 'Bearer ' + sentToken
    if (stepUpToken && stepUpToken.until > Date.now() && !headers['X-Step-Up-Token']) {
      headers['X-Step-Up-Token'] = stepUpToken.token
    }
    const loc = config.locale?.()
    if (loc) headers['Accept-Language'] = loc
    return fetch(buildURL(path, opts.query), { method, headers, body, signal: opts.signal })
  }

  let res = await doFetch()

  if (res.status === 401 && !opts.anonymous) {
    const hadSession = !!session.get()
    const outcome: RefreshOutcome = hadSession ? await refreshSession(sentToken) : 'invalid'
    if (outcome === 'ok') res = await doFetch()
    // A network / server error while refreshing keeps the session: the next
    // request tries again instead of signing the user out.
    if (res.status === 401 && outcome !== 'error') {
      session.clear()
      config.onUnauthenticated?.(hadSession ? 'expired' : 'unauthenticated')
    }
  }

  if (res.status === 403 && !opts.noStepUp) {
    const peek = await safeJSON(res.clone())
    if (peek?.error?.code === 'step_up_required') {
      stepUpToken = null
      const token = await obtainStepUp()
      if (token) {
        opts = { ...opts, headers: { ...(opts.headers || {}), 'X-Step-Up-Token': token } }
        res = await doFetch()
      }
    }
  }

  if (res.status === 204) return null
  const json = await safeJSON(res)
  if (!res.ok) {
    const body: ApiErrorBody = json?.error || { code: statusCode(res.status), message: res.statusText || 'request failed' }
    throw new ApiError(res.status, body)
  }
  return json
}

function statusCode(status: number): string {
  switch (status) {
    case 400:
      return 'invalid_argument'
    case 401:
      return 'unauthenticated'
    case 403:
      return 'permission_denied'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 429:
      return 'rate_limited'
    case 503:
      return 'unavailable'
    default:
      return 'internal'
  }
}

async function safeJSON(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Request returning the `data` member of the envelope. */
export async function request<T = any>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const json = await requestRaw(method, path, opts)
  return (json && 'data' in json ? json.data : json) as T
}

/** List request returning items and page info. */
export async function requestList<T = any>(path: string, query?: Query, opts: RequestOptions = {}): Promise<ListResult<T>> {
  const json = await requestRaw('GET', path, { ...opts, query })
  const items: T[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
  const page: PageInfo = json?.page || { page: 1, page_size: items.length, total: items.length }
  return { items, page }
}

export interface ApiClient {
  get<T = any>(path: string, query?: Query, opts?: RequestOptions): Promise<T>
  list<T = any>(path: string, query?: Query, opts?: RequestOptions): Promise<ListResult<T>>
  post<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>
  put<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>
  patch<T = any>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>
  del<T = any>(path: string, query?: Query, opts?: RequestOptions): Promise<T>
  upload<T = any>(path: string, form: FormData, opts?: RequestOptions): Promise<T>
  request<T = any>(method: string, path: string, opts?: RequestOptions): Promise<T>
}

/** Creates a client whose relative paths are joined to prefix (e.g. "/p/guard"). */
export function createClient(prefix = ''): ApiClient {
  const p = (path: string) => {
    if (!prefix) return path
    return prefix.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path)
  }
  return {
    get: (path, query, opts) => request('GET', p(path), { ...opts, query }),
    list: (path, query, opts) => requestList(p(path), query, opts),
    post: (path, body, opts) => request('POST', p(path), { ...opts, body }),
    put: (path, body, opts) => request('PUT', p(path), { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', p(path), { ...opts, body }),
    del: (path, query, opts) => request('DELETE', p(path), { ...opts, query }),
    upload: (path, form, opts) => request('POST', p(path), { ...opts, body: form }),
    request: (method, path, opts) => request(method, p(path), opts)
  }
}

/** Console API client rooted at /api/v1. */
export const api: ApiClient = createClient()
