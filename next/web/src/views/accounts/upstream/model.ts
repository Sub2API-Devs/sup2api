// The account layer of a custom upstream (settings field `upstream`,
// docs/UPSTREAM-DECLARATIVE.md §2.3) as the editor's draft, and back. The
// account type's resolved declaration (AccountType.upstream) supplies the
// defaults: an empty input inherits the default, and only what differs from
// it is stored. The hints mirror sdk/upstream (check.go, template.go) and
// sdk/paramoverride/headers.go; the server's checks stay authoritative.
import type { Upstream, UpstreamAccountLayer, UpstreamHeaderWrite } from '@/api/types'
import { HEADER_NAME } from '../paramOverride/model'

export type AuthType = 'header' | 'query' | 'none'
export type HeaderMode = 'set' | 'default' | 'append'
/** The parts of the account layer, keyed as in the stored object. */
export type Section = 'auth' | 'headers' | 'routes' | 'allowFields'

export const AUTH_TYPES: AuthType[] = ['header', 'query', 'none']
export const HEADER_MODES: HeaderMode[] = ['set', 'default', 'append']
export const SECTIONS: Section[] = ['auth', 'headers', 'routes', 'allowFields']

interface Write {
  mode: HeaderMode
  value: string
}

/** One header: a default of the type (`base`, name fixed) or one the account adds. */
export interface HeaderRow extends Write {
  id: number
  name: string
  base?: Write
  /** A default header the account drops (stored as null). */
  removed: boolean
}

/** Auth as edited: with the type's auth type, an empty name / value inherits the type's. */
export interface AuthDraft {
  type: AuthType
  name: string
  value: string
}

export interface Draft {
  auth: AuthDraft
  headers: HeaderRow[]
  /** Protocol → path; empty inherits the type's. */
  paths: Record<string, string>
  allow: string[]
}

/** Readable names of the core protocols (API names, not translated). */
const PROTOCOL_NAMES: Record<string, string> = {
  'openai.chat': 'Chat Completions',
  'openai.responses': 'Responses',
  'openai.responses_ws': 'Responses WebSocket',
  'openai.embeddings': 'Embeddings',
  'anthropic.messages': 'Messages',
  'anthropic.count_tokens': 'Count Tokens',
  'gemini.generate': 'generateContent',
  'gemini.stream_generate': 'streamGenerateContent',
  'gemini.count_tokens': 'countTokens'
}
export const protocolName = (p: string) => PROTOCOL_NAMES[p] ?? p

let nextId = 0
const present = <V>(o: Record<string, V | null> | undefined) => Object.entries(o ?? {}).filter((e): e is [string, V] => e[1] != null)
const writeOf = (w: UpstreamHeaderWrite): Write => {
  const mode = HEADER_MODES.find(m => w[m]) ?? 'set'
  return { mode, value: w[mode] ?? '' }
}

export function baseAuth(up: Upstream): AuthDraft {
  const a = up.auth ?? {}
  return { type: a.type ?? 'none', name: a.name ?? '', value: a.value ?? '' }
}
export const routeProtocols = (up: Upstream) => present(up.routes).map(([p]) => p)
export const defaultPath = (up: Upstream, protocol: string) => up.routes?.[protocol]?.path ?? ''
/** Header names are stored lower-case; a query parameter keeps its case. */
const authName = (a: AuthDraft) => (a.type === 'header' ? a.name.trim().toLowerCase() : a.name.trim())
export const headerName = (r: HeaderRow) => r.name.trim().toLowerCase()

// ---------------------------------------------------------------- read

function readAuth(layer: UpstreamAccountLayer['auth'], base: AuthDraft): AuthDraft {
  const type = layer?.type ?? base.type
  if (type === 'none' && base.type !== 'none') return { type, name: '', value: '' }
  if (type === base.type) return { type, name: layer?.name ?? '', value: layer?.value ?? '' }
  // Another type is written out whole; a field the layer leaves out merges from the type's.
  return {
    type,
    name: layer?.name === undefined ? base.name : (layer.name ?? ''),
    value: layer?.value === undefined ? base.value : (layer.value ?? '')
  }
}

function readHeaders(own: UpstreamAccountLayer['headers'] = {}, up: Upstream): HeaderRow[] {
  const defaults = present(up.headers).map(([name, w]): HeaderRow => {
    const base = writeOf(w)
    const o = own[name]
    return { id: ++nextId, name, base, removed: o === null, ...(o ? writeOf(o) : { mode: base.mode, value: '' }) }
  })
  const added = present(own)
    .filter(([name]) => !up.headers?.[name])
    .map(([name, w]): HeaderRow => ({ id: ++nextId, name, removed: false, ...writeOf(w) }))
  return [...defaults, ...added]
}

/** The draft of a stored account layer (null / undefined: all defaults). */
export function readDraft(layer: UpstreamAccountLayer | null | undefined, up: Upstream): Draft {
  const filtered = up.filterFields ?? []
  return {
    auth: readAuth(layer?.auth, baseAuth(up)),
    headers: readHeaders(layer?.headers ?? {}, up),
    paths: Object.fromEntries(routeProtocols(up).map(p => [p, layer?.routes?.[p]?.path ?? ''])),
    allow: (layer?.allowFields ?? []).filter(f => filtered.includes(f))
  }
}

export const newHeader = (): HeaderRow => ({ id: ++nextId, name: '', mode: 'set', value: '', removed: false })

/** The auth draft after choosing a type: the type's own type inherits, another starts from {api_key}. */
export function authOfType(type: AuthType, up: Upstream): AuthDraft {
  return type === baseAuth(up).type || type === 'none' ? { type, name: '', value: '' } : { type, name: '', value: '{api_key}' }
}

// ---------------------------------------------------------------- write

function writeAuth(a: AuthDraft, base: AuthDraft): UpstreamAccountLayer['auth'] {
  // The layer merges field by field: another type clears what it does not set.
  if (a.type !== base.type)
    return a.type === 'none'
      ? { type: 'none', name: null, value: null }
      : { type: a.type, name: authName(a) || null, value: a.value || null }
  const out: Record<string, string> = {}
  if (authName(a) && authName(a) !== base.name) out.name = authName(a)
  if (a.value && a.value !== base.value) out.value = a.value
  return out
}

function writeHeaders(rows: HeaderRow[]): UpstreamAccountLayer['headers'] {
  const out: Record<string, UpstreamHeaderWrite | null> = {}
  for (const r of rows) {
    if (!r.base) {
      if (headerName(r)) out[headerName(r)] = { [r.mode]: r.value }
    } else if (r.removed) out[r.name] = null
    else if (r.mode !== r.base.mode || (r.value && r.value !== r.base.value)) out[r.name] = { [r.mode]: r.value || r.base.value }
  }
  return out
}

function writeRoutes(paths: Record<string, string>, up: Upstream): UpstreamAccountLayer['routes'] {
  const out: Record<string, { path: string }> = {}
  for (const p of routeProtocols(up)) {
    const v = paths[p]?.trim()
    if (v && v !== defaultPath(up, p)) out[p] = { path: v }
  }
  return out
}

const writers: Record<Section, (d: Draft, up: Upstream) => unknown> = {
  auth: (d, up) => writeAuth(d.auth, baseAuth(up)),
  headers: d => writeHeaders(d.headers),
  routes: (d, up) => writeRoutes(d.paths, up),
  allowFields: (d, up) => (up.filterFields ?? []).filter(f => d.allow.includes(f))
}

/** What the draft stores for one section; undefined when it keeps the defaults. */
export function sectionLayer(d: Draft, up: Upstream, s: Section): unknown {
  const v = writers[s](d, up)
  return v && Object.keys(v).length ? v : undefined
}

/** The account layer to store; undefined when everything is the type's default. */
export function writeLayer(d: Draft, up: Upstream): UpstreamAccountLayer | undefined {
  const out: Record<string, unknown> = {}
  for (const s of SECTIONS) {
    const v = sectionLayer(d, up, s)
    if (v !== undefined) out[s] = v
  }
  return Object.keys(out).length ? (out as UpstreamAccountLayer) : undefined
}

const DRAFT_KEY = { auth: 'auth', headers: 'headers', routes: 'paths', allowFields: 'allow' } as const satisfies Record<
  Section,
  keyof Draft
>

/** Puts one section (or all) back to the type's defaults. */
export function resetSection(d: Draft, up: Upstream, s?: Section) {
  const fresh = readDraft(undefined, up)
  for (const k of s ? [DRAFT_KEY[s]] : Object.values(DRAFT_KEY)) Object.assign(d, { [k]: fresh[k] })
}

// ---------------------------------------------------------------- hints

export type HintCode =
  'required' | 'not_here' | 'unknown_var' | 'not_field' | 'header_name' | 'header_blocked' | 'auth_header' | 'duplicate' | 'path_slash'
export interface Hint {
  code: HintCode
  name?: string
}

/** Headers no ordinary header may write (sdk/paramoverride HeaderBlocked); only auth sends a credential. */
const BLOCKED_HEADERS = new Set(
  [
    'connection keep-alive te trailer transfer-encoding upgrade expect host content-length content-encoding accept-encoding',
    'authorization x-api-key x-goog-api-key api-key cookie',
    'x-forwarded-for x-forwarded-host x-forwarded-proto x-forwarded-port x-real-ip forwarded via cf-connecting-ip true-client-ip x-client-ip x-cluster-client-ip'
  ].flatMap(group => group.split(' '))
)
const BLOCKED_PREFIXES = ['proxy-', 'sec-websocket-', 'x-sub2api-', 'x-kin-']
export const headerBlocked = (n: string) => BLOCKED_HEADERS.has(n) || BLOCKED_PREFIXES.some(p => n.startsWith(p))

type Place = 'auth' | 'header' | 'path' | 'query'
/** Where each template variable (or `prefix.`) may be written (template.go place.allowed). */
const VAR_PLACES: Record<string, Place[]> = {
  api_key: ['auth', 'query'],
  base_url: ['auth', 'header'],
  model: ['auth', 'header', 'path', 'query'],
  'credentials.': ['auth', 'header', 'path', 'query'],
  'client_header.': ['header']
}
const VAR_RE = /\{([a-z_]+(?:\.[A-Za-z0-9_-]+)?)\}/g
const REQUIRED: Hint = { code: 'required' }

/** The first problem of a template written at place. */
export function templateHint(tpl: string, place: Place, up: Upstream): Hint | undefined {
  for (const [, name] of tpl.matchAll(VAR_RE)) {
    const dot = name.indexOf('.')
    const prefix = dot < 0 ? name : name.slice(0, dot + 1)
    const key = name.slice(prefix.length)
    const shown = `{${name}}`
    if (!VAR_PLACES[prefix]) return { code: 'unknown_var', name: shown }
    if (!VAR_PLACES[prefix].includes(place)) return { code: 'not_here', name: shown }
    if (prefix === 'credentials.' && !up.credentials?.fields?.includes(key)) return { code: 'not_field', name: shown }
    if (prefix === 'client_header.' && headerBlocked(key)) return { code: 'header_blocked', name: key }
  }
  return undefined
}

/** The auth header in effect (empty for query or none auth). */
function authHeader(a: AuthDraft, up: Upstream): string {
  if (a.type !== 'header') return ''
  return authName(a) || (a.type === baseAuth(up).type ? baseAuth(up).name : '')
}

export function authHints(a: AuthDraft, up: Upstream): { name?: Hint; value?: Hint } {
  if (a.type === 'none') return {}
  const inherit = a.type === baseAuth(up).type
  const name = authName(a) || (inherit ? baseAuth(up).name : '')
  const value = a.value || (inherit ? baseAuth(up).value : '')
  return {
    name: !name ? REQUIRED : a.type === 'header' && !HEADER_NAME.test(name) ? { code: 'header_name' } : undefined,
    value: value ? templateHint(value, 'auth', up) : REQUIRED
  }
}

export function headerHint(r: HeaderRow, d: Draft, up: Upstream): Hint | undefined {
  const name = headerName(r)
  if (r.removed || (!name && !r.value)) return undefined
  if (!r.base) {
    if (!name) return REQUIRED
    if (!HEADER_NAME.test(name)) return { code: 'header_name' }
    if (d.headers.some(o => o !== r && !o.removed && headerName(o) === name)) return { code: 'duplicate', name }
  }
  if (headerBlocked(name)) return { code: 'header_blocked', name }
  if (name === authHeader(d.auth, up)) return { code: 'auth_header', name }
  const value = r.value || r.base?.value || ''
  return value ? templateHint(value, 'header', up) : REQUIRED
}

export function pathHint(path: string, up: Upstream): Hint | undefined {
  const v = path.trim()
  if (!v) return undefined
  if (!v.startsWith('/')) return { code: 'path_slash' }
  const q = v.indexOf('?')
  return q < 0 ? templateHint(v, 'path', up) : (templateHint(v.slice(0, q), 'path', up) ?? templateHint(v.slice(q + 1), 'query', up))
}

// ---------------------------------------------------------------- server errors

const LAYER_PATH = /^(auth|headers|routes|allowFields)\b/
/** A route's error is on the route ('routes.<protocol>'): its path is the only part an account sets. */
const normalizePath = (p: string) => p.replace(/^(routes\..+)\.path$/, '$1')

/**
 * Server errors of the account layer by path inside it ('auth.name',
 * 'headers.x-foo', 'routes.openai.chat', 'allowFields'). The core reports
 * them on the field itself as "<path>: <message>" (sdk/upstream Validate)
 * and the form schema under `<field>.<path>`. A message on the field that
 * names no part stays with the field (its form frame shows it); one under
 * an unknown nested path is returned under ''.
 */
export function layerErrors(errors: Record<string, string>, field = 'upstream'): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, msg] of Object.entries(errors)) {
    if (k === field) {
      const m = /^([\w.\-[\]]+): ([\s\S]*)$/.exec(msg)
      if (m && LAYER_PATH.test(m[1])) out[normalizePath(m[1])] = m[2]
    } else if (k.startsWith(`${field}.`)) {
      const p = k.slice(field.length + 1)
      out[LAYER_PATH.test(p) ? normalizePath(p) : ''] = msg
    }
  }
  return out
}
