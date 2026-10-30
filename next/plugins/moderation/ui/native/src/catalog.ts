import { reactive } from 'vue'
import { fetchAuditors, fetchChannels, fetchFlows, fetchGroups, useModHost, type Auditor, type Channel, type Flow, type Group } from './host'

// Flows, auditors, channels and groups shared by the views for names and
// filters. Loaded once on first use; refresh() reloads them (header refresh
// and the overview's auto refresh). A list that fails to load stays empty and
// the views fall back to #id.

const state = reactive({ flows: [] as Flow[], auditors: [] as Auditor[], channels: [] as Channel[], groups: [] as Group[], loaded: false })
let loading: Promise<void> | null = null

const settled = <T>(r: PromiseSettledResult<T[]>) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])

async function load() {
  const [flows, auditors, channels, groups] = await Promise.allSettled([fetchFlows(), fetchAuditors(), fetchChannels(), fetchGroups()])
  Object.assign(state, { flows: settled(flows), auditors: settled(auditors), channels: settled(channels), groups: settled(groups), loaded: true })
}

function refresh(): Promise<void> {
  loading = load().finally(() => (loading = null))
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
