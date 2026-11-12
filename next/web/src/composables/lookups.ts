import { computed, reactive, ref, watch } from 'vue'
import { api, isApiError, type Query } from '@sub2api/host'
import type { EnvironmentLayer, EnvironmentValues, EnvironmentVariable, Group, Proxy } from '@/api/types'
import { forgetEntityNames } from '@/components/entity/lookup'

// Small cached lists of the groups and proxies (their first page), for pages
// that need more of them than a name. Call refresh (`force`) after mutations
// that change them: the entity pickers' names of them are dropped with it.

/** Rows of a first page: one that holds as many may not be the whole set. */
const FIRST_PAGE = 200

/** One page (200 by default) of a list endpoint: the whole set for a select. `query` adds filters. */
export async function fetchFirstPage<T>(path: string, query: Query = {}, pageSize = FIRST_PAGE): Promise<T[]> {
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

/** Groups past the first page, read by id; null while asked for and where the core shows none. */
const farGroups = reactive(new Map<number, Group | null>())

export function useGroupsLookup(force = false) {
  if (force) {
    forgetEntityNames('group')
    farGroups.clear()
  }
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

/**
 * The cached groups and, of `ids`, those past the first page: the entity
 * picker picks among every group, and a page that reads more of the picked
 * ones than a name (their conversion policies) must not miss them. Each is
 * read once (GET /groups/:id); nothing is asked while the first page is the
 * whole set.
 */
export function useGroupsWith(ids: () => number[]) {
  const { groups, ready } = useGroupsLookup()
  watch(
    ids,
    async (wanted) => {
      await ready
      if (groups.value.length < FIRST_PAGE) return
      for (const id of wanted) {
        if (farGroups.has(id) || groups.value.some((g) => g.id === id)) continue
        farGroups.set(id, null)
        // An id the core has no group for (deleted, mistyped) stays unknown.
        void api.get<Group>(`/groups/${id}`).then((g) => farGroups.set(id, g), () => undefined)
      }
    },
    { immediate: true }
  )
  return computed(() => [...groups.value, ...[...farGroups.values()].filter((g) => g !== null)])
}

export function useProxiesLookup(force = false) {
  if (force) forgetEntityNames('proxy')
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
