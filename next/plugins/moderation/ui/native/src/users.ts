import { reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { fetchCoreUser, fetchUsers, searchCoreUsers, useModHost } from './host'
import { onSessionEnd } from './session'
import type { CoreUser } from './types'

// Users of the core, cached for the page. The ids a render asks for are
// looked up together through the plugin (GET /users, grant users.read),
// which works for every moderator and gives display name and status only.
// When the plugin cannot (503 users_unavailable: no grant, older core) each
// id goes to the core's GET /users/:id, which needs user:read and adds email
// and roles; it stops after the first 403 (the views then show #id). Other
// plugin errors leave the batch unknown for RETRY_MS, then a render asks again.

const users = reactive(new Map<number, CoreUser | null>())
const inflight = new Set<number>()
/** ids asked for during the current tick, looked up in one call */
const pending = new Set<number>()
let viaPlugin = true
let denied = false
const RETRY_MS = 30_000
/** Bumped by a session end: lookups of the previous session write nothing. */
let gen = 0

// The cache and the permission findings (viaPlugin, denied) are of one
// login: a session end drops them (session.ts).
onSessionEnd(() => {
  gen++
  users.clear()
  inflight.clear()
  pending.clear()
  viaPlugin = true
  denied = false
})

const nameOf = (u: CoreUser | null | undefined) => u?.display_name || u?.email || ''

/** The core user once loaded (null while loading, unknown or not permitted). */
export function coreUser(id: number | null | undefined): CoreUser | null {
  if (!id) return null
  void loadUser(id)
  return users.get(id) ?? null
}

/** Name of a user once loaded ('' while loading, unknown or not permitted). */
export const userName = (id: number | null | undefined): string => nameOf(coreUser(id))

function loadUser(id: number) {
  if (users.has(id) || inflight.has(id) || pending.has(id)) return
  if (!pending.size) queueMicrotask(loadPending)
  pending.add(id)
}

/** Looks the pending ids up, at most 500 per plugin call (its limit). */
async function loadPending() {
  const my = gen
  const ids = [...pending]
  pending.clear()
  for (const id of ids) inflight.add(id)
  for (let i = 0; i < ids.length && my === gen; i += 500) {
    const batch = ids.slice(i, i + 500)
    if (!viaPlugin || !(await loadViaPlugin(batch, my))) await Promise.all(batch.map((id) => loadCoreUser(id, my)))
  }
  if (my === gen) for (const id of ids) inflight.delete(id)
}

/**
 * Looks a batch up through the plugin; false when the plugin cannot
 * (users_unavailable), and the core is asked from then on. Other errors
 * leave the batch unknown for RETRY_MS.
 */
async function loadViaPlugin(batch: number[], my: number): Promise<boolean> {
  try {
    const found = await fetchUsers(batch)
    if (my !== gen) return true
    for (const u of found) users.set(u.id, u)
    for (const id of batch) if (!users.has(id)) users.set(id, null)
    return true
  } catch (e) {
    if (my !== gen) return true
    if (isApiError(e) && e.code === 'users_unavailable') {
      viaPlugin = false
      return false
    }
    for (const id of batch) users.set(id, null)
    setTimeout(() => my === gen && batch.forEach((id) => users.get(id) === null && users.delete(id)), RETRY_MS)
    return true
  }
}

async function loadCoreUser(id: number, my: number) {
  if (my !== gen) return
  if (denied) {
    users.set(id, null)
    return
  }
  try {
    const u = await fetchCoreUser(id)
    if (my === gen) users.set(id, u)
  } catch (e) {
    if (my !== gen) return
    if (isApiError(e) && (e.status === 401 || e.status === 403)) denied = true
    users.set(id, null)
  }
}

/** No user matched a username search: an id no user has, so the filter matches nothing. */
const NO_USER = Number.MAX_SAFE_INTEGER

/**
 * Resolves a user search (an id, or a name / email fragment through the
 * core) to user ids. null = a name search is not possible (no user:read).
 */
export async function resolveUserIds(q: string): Promise<number[] | null> {
  const v = q.trim()
  if (/^\d+$/.test(v)) return [Number(v)]
  if (denied) return null
  const my = gen
  try {
    const r = await searchCoreUsers(v)
    if (my === gen) for (const u of r.items) users.set(u.id, u)
    return r.items.length ? r.items.map((u) => u.id) : [NO_USER]
  } catch (e) {
    if (my === gen && isApiError(e) && (e.status === 401 || e.status === 403)) denied = true
    return null
  }
}

/** user_id / user_ids query of a resolved search ({} when the search is empty). */
export function userQuery(ids: number[] | null): { user_id?: number; user_ids?: string } {
  if (!ids?.length) return {}
  return ids.length === 1 ? { user_id: ids[0] } : { user_ids: ids.join(',') }
}

/**
 * The user filter of a list: `resolve(q)` turns the search into `query`
 * (user_id / user_ids) and `error` (no user:read for a name). Returns false
 * when a newer search started meanwhile, which then decides.
 */
export function useUserFilter(initial: number[] | null = null) {
  const t = useModHost().t
  const query = ref(userQuery(initial))
  const error = ref('')
  let seq = 0
  async function resolve(q: string): Promise<boolean> {
    const my = ++seq
    const ids = q.trim() ? await resolveUserIds(q) : []
    if (my !== seq) return false
    error.value = ids === null ? t('events.userSearchDenied') : ''
    query.value = userQuery(ids)
    return true
  }
  return { query, error, resolve }
}
