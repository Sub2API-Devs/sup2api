import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { Group, Proxy } from '@/api/types'

// Small cached lookups for selects (groups, proxies). Call refresh after
// mutations that change them.

const groups = ref<Group[]>([])
const proxies = ref<Proxy[]>([])
let groupsP: Promise<void> | null = null
let proxiesP: Promise<void> | null = null

export function useGroupsLookup(force = false) {
  if (force || !groupsP) {
    groupsP = api
      .list<Group>('/groups', { page_size: 200 })
      .then((r) => {
        groups.value = r.items
      })
      .catch(() => {
        groupsP = null
      })
  }
  return { groups, ready: groupsP }
}

export function useProxiesLookup(force = false) {
  if (force || !proxiesP) {
    proxiesP = api
      .list<Proxy>('/proxies', { page_size: 200 })
      .then((r) => {
        proxies.value = r.items
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
