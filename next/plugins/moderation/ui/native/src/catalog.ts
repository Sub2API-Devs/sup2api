import { reactive } from 'vue'
import { fetchAuditors, fetchChannels, fetchFlows, fetchGroups, useModHost, type Auditor, type Channel, type Flow, type Group } from './host'

// Flows, auditors, channels and groups, shared by every tab: the CRUD tabs
// list them and call refresh() after a change, the other views take names
// and filters from them. Loaded on first use; the header refresh and the
// overview's auto refresh reload them. A list that fails to load keeps its
// previous rows and records the error (errors.<list>) for its tab.

type ListKey = 'flows' | 'auditors' | 'channels' | 'groups'

const state = reactive({
  flows: [] as Flow[],
  auditors: [] as Auditor[],
  channels: [] as Channel[],
  groups: [] as Group[],
  errors: { flows: null, auditors: null, channels: null, groups: null } as Record<ListKey, unknown>,
  loaded: false,
  loading: false
})
let loading: Promise<void> | null = null
let again = false

async function load() {
  const keys: ListKey[] = ['flows', 'auditors', 'channels', 'groups']
  const results = await Promise.allSettled([fetchFlows(), fetchAuditors(), fetchChannels(), fetchGroups()])
  keys.forEach((k, i) => {
    const r = results[i]
    state.errors[k] = r.status === 'rejected' ? r.reason : null
    if (r.status === 'fulfilled') Object.assign(state, { [k]: Array.isArray(r.value) ? r.value : [] })
  })
  state.loaded = true
}

/**
 * Reloads the lists. Calls during a load merge into one more load after it,
 * so the state always ends with a load started after the latest call.
 */
function refresh(): Promise<void> {
  if (loading) {
    again = true
    return loading
  }
  state.loading = true
  loading = (async () => {
    do {
      again = false
      await load()
    } while (again)
  })().finally(() => {
    loading = null
    state.loading = false
  })
  return loading
}

const byId = <T extends { id: number }>(list: T[], id: number | null | undefined) => (id ? list.find((x) => x.id === id) : undefined)

export function useCatalog() {
  if (!state.loaded && !loading) void refresh()
  return {
    state,
    refresh,
    flow: (id: number | null | undefined) => byId(state.flows, id),
    auditor: (id: number | null | undefined) => byId(state.auditors, id),
    channel: (id: number | null | undefined) => byId(state.channels, id),
    flowName: (id: number) => byId(state.flows, id)?.name || `#${id}`,
    auditorName: (id: number) => byId(state.auditors, id)?.name || `#${id}`,
    channelName: (id: number) => byId(state.channels, id)?.name || `#${id}`,
    /** group 0 is the default group */
    groupName: (id: number) => (id ? byId(state.groups, id)?.name || `#${id}` : useModHost().t('defaultGroup')),
    /** group select options with the default group 0; empty when groups are not readable */
    groupOptions: () =>
      state.groups.length ? [{ value: 0, label: useModHost().t('defaultGroup') }, ...state.groups.map((g) => ({ value: g.id, label: `${g.name} #${g.id}` }))] : []
  }
}
