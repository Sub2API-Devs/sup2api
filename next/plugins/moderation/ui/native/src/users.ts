import { reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { fetchCoreUser, searchCoreUsers, useModHost } from './host'
import type { CoreUser } from './types'

// Users of the core (GET /users/:id, needs user:read), cached for the page:
// name, status and roles. Without the permission every lookup stops after
// the first 403 and the views show #id only.

const users = reactive(new Map<number, CoreUser | null>())
const inflight = new Set<number>()
let denied = false

const nameOf = (u: CoreUser | null | undefined) => u?.display_name || u?.email || ''

/** The core user once loaded (null while loading, unknown or not permitted). */
export function coreUser(id: number | null | undefined): CoreUser | null {
  if (!id) return null
  void loadUser(id)
  return users.get(id) ?? null
}

/** Name of a user once loaded ('' while loading, unknown or not permitted). */
export const userName = (id: number | null | undefined): string => nameOf(coreUser(id))

async function loadUser(id: number) {
  if (denied || users.has(id) || inflight.has(id)) return
  inflight.add(id)
  try {
    users.set(id, await fetchCoreUser(id))
  } catch (e) {
    if (isApiError(e) && (e.status === 401 || e.status === 403)) denied = true
    users.set(id, null)
  } finally {
    inflight.delete(id)
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
  try {
    const r = await searchCoreUsers(v)
    for (const u of r.items) users.set(u.id, u)
    return r.items.length ? r.items.map((u) => u.id) : [NO_USER]
  } catch (e) {
    if (isApiError(e) && (e.status === 401 || e.status === 403)) denied = true
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
