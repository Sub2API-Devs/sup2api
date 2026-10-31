import { computed, ref } from 'vue'
import { api, isApiError, type Query } from '@sub2api/host'
import type { EnvironmentLayer, EnvironmentValues, EnvironmentVariable, Group, Proxy } from '@/api/types'

// Small cached lookups for selects (groups, proxies). Call refresh after
// mutations that change them.

/** One page (200 by default) of a list endpoint: the whole set for a select. `query` adds filters. */
export async function fetchFirstPage<T>(path: string, query: Query = {}, pageSize = 200): Promise<T[]> {
  return (await api.list<T>(path, { ...query, page_size: pageSize })).items
}

/** Every page of a list endpoint (the caller needs the complete set, not a dropdown). */
export async function fetchAllPages<T>(path: string, query: Query = {}, pageSize = 200): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; ; page++) {
    const result = await api.list<T>(path, { ...query, page, page_size: pageSize })
    out.push(...result.items)
    // `total` is optional on the wire: without it the seen count is the end.
    if (!result.paged || !result.items.length || out.length >= (result.page.total ?? out.length)) break
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

const environmentVariables = ref<EnvironmentVariable[]>([])
const processEnvironment = ref<EnvironmentValues>({})
/** The caller may not read the declared variables (403): pages hide their environment cards. */
const environmentDenied = ref(false)
let environmentP: Promise<void> | null = null

/**
 * The declared environment variables and the process layer (CONTRACTS §74.3);
 * they change only with the core. A 403 is remembered (`denied`) and not asked
 * again; any other failure is retried on the next call.
 */
export function useEnvironmentVariables() {
  environmentP ||= api
    .get<{ variables: EnvironmentVariable[]; process: EnvironmentValues }>('/environment/variables')
    .then((r) => {
      environmentVariables.value = r?.variables ?? []
      processEnvironment.value = r?.process ?? {}
      environmentDenied.value = false
    })
    .catch((e) => {
      if (isApiError(e) && e.status === 403) environmentDenied.value = true
      else environmentP = null
    })
  return { variables: environmentVariables, process: processEnvironment, denied: environmentDenied, ready: environmentP }
}

/** Whether a layer has variables to edit: false while loading, when denied or when none is declared for it. */
export function useEnvironmentLayer(layer: EnvironmentLayer) {
  const { variables, denied } = useEnvironmentVariables()
  return computed(() => !denied.value && variables.value.some((v) => v.layers.includes(layer)))
}

/** Groups visible to the current user (GET /me/groups), for API key creation. */
export async function fetchMyGroups(): Promise<Group[]> {
  return (await api.get<Group[]>('/me/groups')) || []
}
