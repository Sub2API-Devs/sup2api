// The entity lookup (GET /lookup/{kind}, CONTRACTS "lookup") and what the
// console learnt from it this session: the names of the entities it saw, and
// the lookups the core refused. Shared by every EntityPicker and by the pages
// that print "name #id" (useEntityNames).
import { reactive, toValue, type MaybeRefOrGetter } from 'vue'
import { api, isApiError, session, type Query } from '@sub2api/host'
import { ENTITIES, isEntityId, type EntityKind } from './entities'

export interface EntityItem {
  /** A number; the name itself for models. */
  id: number | string
  name: string
  /** Text that helps to tell the entity apart (a user's display name, a key's owner). */
  hint?: string
  /** The entity's own status; anything but "active" shows as disabled. */
  status?: string
}
export interface LookupResult {
  items: EntityItem[]
  /** More rows match than were returned. */
  more: boolean
}
export interface LookupQuery {
  /** Name contains; digits also match the id. */
  q?: string
  /** Only these ids (q is ignored); `mine` and `scope.user_id` still narrow them. */
  ids?: Array<string | number>
  /** Only the caller's own rows. */
  mine?: boolean
  /** Parameters of the kind: `user_id` (api_key), `prefer_group_id` (account). */
  scope?: Record<string, string | number | undefined>
}

/** Ids per request (the server's cap). */
const MAX_IDS = 100
/** A caller without the permission (403) and a core without the route or the kind (404, during a rolling update). */
const UNAVAILABLE = new Set([403, 404])

// A `mine` lookup answers differently (own rows only, its own permission), so it is a realm of its own.
const realmOf = (kind: EntityKind, mine: boolean) => (mine ? `${kind}:mine` : kind)
const keyOf = (realm: string, id: string | number) => `${realm}:${id}`

/** Realms the core would not answer; not asked again this session. */
const unavailable = reactive(new Set<string>())
/** What the lookup said of an id: the entity, or null when it does not know (or will not show) it. */
const known = reactive(new Map<string, EntityItem | null>())
/** Ids whose name was asked for and has not come back yet, per realm; `queued` are those the next request takes. */
const asked = new Map<string, Set<string>>()
const queued = new Map<string, Set<string>>()

/** Counts the sessions: an answer that arrives after its session ended teaches the next one nothing. */
let era = 0

/** Forgets every name and refusal (the session ended; specs). */
export function resetEntityLookups() {
  era++
  unavailable.clear()
  known.clear()
  asked.clear()
  queued.clear()
}
// What was learnt belongs to the signed-in user. Bound by the first lookup,
// not on import: a page that only imports a picker does not touch the session.
let bound = false
function bindToSession() {
  if (bound) return
  bound = true
  session.onChange((s) => {
    if (!s) resetEntityLookups()
  })
}

/** Whether the core refused this lookup before (reactive): the picker is a plain text box then. */
export function lookupUnavailable(kind: EntityKind, mine = false): boolean {
  return unavailable.has(realmOf(kind, mine))
}

/**
 * Candidates of a kind: its first rows, those matching `q`, or the given
 * `ids`. Remembers the names it returns; a refusal (403 / 404) is remembered
 * and rethrown like any other failure.
 */
export async function lookupEntities(kind: EntityKind, { q, ids, mine = false, scope }: LookupQuery = {}): Promise<LookupResult> {
  bindToSession()
  const realm = realmOf(kind, mine)
  const query: Query = { ...scope, q: q || undefined, ids: ids?.join(','), mine: mine || undefined }
  const from = era
  try {
    const result = await api.get<LookupResult | null>(`/lookup/${ENTITIES[kind].path}`, query)
    const items = result?.items ?? []
    if (from === era) for (const item of items) known.set(keyOf(realm, item.id), item)
    return { items, more: !!result?.more }
  } catch (e) {
    if (from === era && isApiError(e) && UNAVAILABLE.has(e.status)) unavailable.add(realm)
    throw e
  }
}

/** Asks for the names of the ids queued for a realm, at most MAX_IDS a request; an id that does not come back is unknown. */
async function resolveQueued(kind: EntityKind, mine: boolean) {
  const realm = realmOf(kind, mine)
  const ids = [...(queued.get(realm) ?? [])]
  queued.delete(realm)
  const from = era
  for (let i = 0; i < ids.length; i += MAX_IDS) {
    const batch = ids.slice(i, i + MAX_IDS)
    let answered = true
    try {
      await lookupEntities(kind, { ids: batch, mine })
    } catch {
      // The ids stay unnamed ("#id"); a later read asks again unless the lookup is unavailable.
      answered = false
    }
    if (from !== era) return
    if (answered) for (const id of batch) if (!known.has(keyOf(realm, id))) known.set(keyOf(realm, id), null)
    for (const id of batch) asked.get(realm)?.delete(id)
  }
}

/** Queues an id for the realm's next names request; the ids asked within one tick share it. */
function ask(kind: EntityKind, mine: boolean, id: string) {
  const realm = realmOf(kind, mine)
  if (unavailable.has(realm) || asked.get(realm)?.has(id)) return
  if (!asked.has(realm)) asked.set(realm, new Set())
  asked.get(realm)!.add(id)
  if (!queued.has(realm)) {
    queued.set(realm, new Set())
    queueMicrotask(() => void resolveQueued(kind, mine))
  }
  queued.get(realm)!.add(id)
}

/**
 * Names of entities by id for a page (filter chips, cells), from the cache
 * the pickers fill. Both functions are reactive reads (use them in a template
 * or a computed): an id not seen yet is looked up, and the text changes once
 * its name arrives. `mine` = the page lists the caller's own entities.
 */
export function useEntityNames(options: { mine?: MaybeRefOrGetter<boolean | undefined> } = {}) {
  /** The entity's name; undefined while unknown, for an id the lookup does not know or cannot hold (0, of a page's own candidate), and for ''. */
  function name(kind: EntityKind, id: string | number | null | undefined): string | undefined {
    const text = String(id ?? '')
    if (!text) return undefined
    if (!ENTITIES[kind].numeric) return text
    const mine = !!toValue(options.mine)
    const key = keyOf(realmOf(kind, mine), text)
    if (!known.has(key) && isEntityId(text)) ask(kind, mine, text)
    return known.get(key)?.name
  }
  /** "name #id"; "#id" while the name is unknown; the bare name for a kind whose id is its name; '' for no id. */
  function label(kind: EntityKind, id: string | number | null | undefined): string {
    const text = String(id ?? '')
    if (!text) return ''
    if (!ENTITIES[kind].numeric) return text
    const found = name(kind, text)
    return found ? `${found} #${text}` : `#${text}`
  }
  return { name, label }
}
