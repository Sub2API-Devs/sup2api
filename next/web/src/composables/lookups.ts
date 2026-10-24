import { ref } from 'vue'
import { api, type Query } from '@sub2api/host'
import type { Group, Proxy } from '@/api/types'

// Small cached lookups for selects (groups, proxies). Call refresh after
// mutations that change them.

/** One page (200 by default) of a list endpoint: the whole set for a select. `query` adds filters. */
export async function fetchFirstPage<T>(path: string, pageSize = 200, query: Query = {}): Promise<T[]> {
  return (await api.list<T>(path, { ...query, page_size: pageSize })).items
}

/** Every page of a list endpoint (the caller needs the complete set, not a dropdown). */
export async function fetchAllPages<T>(path: string, pageSize = 200, query: Query = {}): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; ; page++) {
    const result = await api.list<T>(path, { ...query, page, page_size: pageSize })
    out.push(...result.items)
    if (!result.paged || !result.items.length || out.length >= result.page.total) break
  }
  return out
}

const groups = ref<Group[]>([])
const proxies = ref<Proxy[]>([])
let groupsP: Promise<void> | null = null
let proxiesP: Promise<void> | null = null

export function useGroupsLookup(force = false) {
  if (force || !groupsP) {
    groupsP = fetchFirstPage<Group>('/groups')
      .then((items) => {
        groups.value = items
      })
      .catch(() => {
        groupsP = null
      })
  }
  return { groups, ready: groupsP }
}

export function useProxiesLookup(force = false) {
  if (force || !proxiesP) {
    proxiesP = fetchFirstPage<Proxy>('/proxies')
      .then((items) => {
        proxies.value = items
      })
      .catch(() => {
        proxiesP = null
      })
  }
  return { proxies, ready: proxiesP }
}

/** Groups visible to the current user (GET /me/groups), for API key creation. */
export async function fetchMyGroups(): Promise<Group[]> {
  return (await api.get<Group[]>('/me/groups')) || []
}
