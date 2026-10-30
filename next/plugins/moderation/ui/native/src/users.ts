import { reactive } from 'vue'
import { isApiError } from '@sub2api/host'
import { fetchCoreUser, searchCoreUsers } from './host'

// Usernames of the core (GET /users/:id, needs user:read), cached for the
// page. Without the permission every lookup stops after the first 403 and
// the views show #id only.

const names = reactive(new Map<number, string>())
const inflight = new Set<number>()
let denied = false

/** Name of a user once loaded ('' while loading, unknown or not permitted). */
export function userName(id: number | null | undefined): string {
  if (!id) return ''
  void loadUser(id)
  return names.get(id) || ''
}

async function loadUser(id: number) {
  if (denied || names.has(id) || inflight.has(id)) return
  inflight.add(id)
  try {
    const u = await fetchCoreUser(id)
    names.set(id, u.display_name || u.email || '')
  } catch (e) {
    if (isApiError(e) && (e.status === 401 || e.status === 403)) denied = true
    names.set(id, '')
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
    for (const u of r.items) names.set(u.id, u.display_name || u.email || '')
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
