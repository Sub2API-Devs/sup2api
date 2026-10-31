import { reactive } from 'vue'
import type { ApiError } from '@sub2api/host'
import { fetchGroups, useModHost, type Group } from './host'

// Names of core groups and users for the moderation pages. They come from the
// core API (GET /groups needs group:read, GET /users/:id needs user:read);
// without the permission, or on failure, callers show the id. Results are
// cached for the page's lifetime.

const state = reactive({ groups: null as Group[] | null })
let groupsLoading: Promise<Group[]> | null = null

/** All core groups, loaded once; [] without group:read. */
export function loadGroups(): Promise<Group[]> {
  groupsLoading ??= fetchGroups().then((g) => (state.groups = g))
  return groupsLoading
}

/** The loaded groups (null until loadGroups resolves). */
export const groupList = () => state.groups

/** Group label; 0 is the default group (requests without a group binding). */
export function groupName(id: number): string {
  const t = useModHost().t
  if (id === 0) return t('directory.defaultGroup')
  const g = state.groups?.find((x) => x.id === id)
  return g ? g.name : t('directory.group', { id })
}

interface UserRef {
  id: number
  email: string
  display_name: string
}

const users = reactive(new Map<number, UserRef | null>())
const pending = new Set<number>()
let canReadUsers = true

/** Loads users in the background; userName() picks them up when they arrive. */
export function loadUsers(ids: Iterable<number>) {
  if (!canReadUsers) return
  const api = useModHost().api
  for (const id of ids) {
    if (id <= 0 || users.has(id) || pending.has(id)) continue
    pending.add(id)
    api
      .get<UserRef>(`/users/${id}`)
      .then((u) => users.set(id, { id: u.id, email: u.email, display_name: u.display_name }))
      .catch((e: ApiError) => {
        if (e?.status === 403) canReadUsers = false
        users.set(id, null)
      })
      .finally(() => pending.delete(id))
  }
}

/** "name (#id)" when known, else "#id". */
export function userName(id: number): string {
  const u = users.get(id)
  const name = u ? u.display_name || u.email : ''
  return name ? `${name} (#${id})` : `#${id}`
}
