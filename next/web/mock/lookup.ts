// Mock of the entity lookup, GET /lookup/:kind (CONTRACTS, "lookup"): the
// candidates of the console's entity pickers. The protocol (q / ids / limit,
// the order, `more`) is written once in answer(); a kind only says who may
// read it and which rows of the other mock modules it lists (`mine` and
// `user_id` narrow those rows, so they hold under `ids` too).
import { fail, on, type MockRequest } from './router'
import { caller, filterOwned, hasPerm, ownerScope, type Identity } from './core'
import { accounts } from './accounts'
import { mockModelNames } from './billing'
import { ME_ID, groups, keys, myGroups, proxies, users } from './resources'

interface Row {
  id: number | string
  name: string
  hint?: string
  status?: string
  /** Listed before the other rows (accounts of prefer_group_id). */
  preferred?: boolean
}
type Failure = ReturnType<typeof fail>
interface Kind {
  /** False for models: their id is the name, so a numeric q is not an id. */
  numericId?: boolean
  rows(req: MockRequest, who: Identity, mine: boolean): Row[] | Failure
}

const MAX_IDS = 100
const MAX_Q_BYTES = 256
const invalid = (message: string) => fail(400, 'invalid_argument', message)
const denied = (permission: string) => fail(403, 'permission_denied', `${permission} is required`, { permission })
const ownerEmail = (id: number) => users.find((u) => u.id === id)?.email

const KINDS: Record<string, Kind> = {
  users: {
    rows(_req, who, mine) {
      if (mine) return invalid('mine is not supported for users')
      if (!hasPerm(who, 'user:read')) return denied('user:read')
      return users.map((u) => ({ id: u.id, name: u.email, hint: u.display_name, status: u.status }))
    }
  },
  groups: {
    rows(_req, who, mine) {
      if (!mine && !hasPerm(who, 'group:read')) return denied('group:read')
      return (mine ? myGroups() : groups).map((g) => ({ id: g.id, name: g.name, status: g.status }))
    }
  },
  'api-keys': {
    rows(req, who, mine) {
      const permission = mine ? 'apikey:self:manage' : 'usage:all:read'
      if (!hasPerm(who, permission)) return denied(permission)
      const owner = mine ? ME_ID : Number(req.query.user_id) || 0
      return keys
        .filter((k) => !owner || k.user_id === owner)
        .map((k) => ({ id: k.id, name: k.name, hint: mine ? k.key_prefix : ownerEmail(k.user_id), status: k.status }))
    }
  },
  accounts: {
    rows(req, who, mine) {
      const scope = ownerScope(who, 'account:read', 'account:own:read')
      if (!scope) return denied('account:own:read')
      const preferred = Number(req.query.prefer_group_id) || 0
      return filterOwned(accounts, scope, who, mine ? { mine: 'true' } : {}).map((a) => ({
        id: a.id,
        name: a.name,
        hint: a.plugin_key,
        status: a.status,
        preferred: !!preferred && (a.group_ids || []).includes(preferred)
      }))
    }
  },
  models: {
    numericId: false,
    rows(_req, who, mine) {
      const permission = mine ? 'apikey:self:manage' : 'price:read'
      if (!hasPerm(who, permission)) return denied(permission)
      return mockModelNames(mine).map((model) => ({ id: model, name: model }))
    }
  },
  proxies: {
    rows(_req, who, mine) {
      const scope = ownerScope(who, 'proxy:read', 'proxy:own:read')
      if (!scope) return denied('proxy:own:read')
      return filterOwned(proxies, scope, who, mine ? { mine: 'true' } : {}).map((p) => ({
        id: p.id,
        name: p.name,
        hint: `${p.protocol}://${p.host}:${p.port}`,
        status: p.status
      }))
    }
  }
}

/** The lookup protocol over a kind's rows: `ids` alone, else `q` (name contains, or a numeric id) in order, cut at `limit`. */
function answer(rows: Row[], query: Record<string, string>, numericId: boolean) {
  const item = ({ id, name, hint, status }: Row) => ({ id, name, ...(hint ? { hint } : {}), ...(status ? { status } : {}) })
  if (query.ids) {
    const ids = query.ids.split(',')
    if (ids.length > MAX_IDS) return invalid(`ids takes at most ${MAX_IDS} values`)
    return { items: rows.filter((r) => ids.includes(String(r.id))).map(item), more: false }
  }
  const q = (query.q || '').trim().toLowerCase()
  const exact = (r: Row) => numericId && /^\d+$/.test(q) && String(r.id) === q
  const rank = (r: Row) => (exact(r) ? 0 : r.preferred ? 1 : 2)
  const hits = rows
    .filter((r) => !q || exact(r) || r.name.toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) || Number(a.id) - Number(b.id))
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  return { items: hits.slice(0, limit).map(item), more: hits.length > limit }
}

on('GET', '/lookup/:kind', (req) => {
  const kind = KINDS[req.params.kind]
  if (!kind) return fail(404, 'not_found', `no lookup for ${req.params.kind}`)
  const { mine = 'false', q = '' } = req.query
  if (mine !== 'true' && mine !== 'false') return invalid('mine must be true or false')
  if (new TextEncoder().encode(q).length > MAX_Q_BYTES) return invalid(`q takes at most ${MAX_Q_BYTES} bytes`)
  const rows = kind.rows(req, caller(req), mine === 'true')
  return Array.isArray(rows) ? answer(rows, req.query, kind.numericId !== false) : rows
})
