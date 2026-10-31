import { reactive } from 'vue'
import { fetchAuditors, fetchChannels, fetchFlows, fetchGroups, useModHost } from './host'
import { onSessionEnd } from './session'
import type { Auditor, Channel, Flow, Group } from './types'

// Flows, auditors, channels and groups, shared by every tab: the CRUD tabs
// list them and refresh the lists a change touches, the other views take
// names and filters from them. useCatalog() loads what is missing (ensure);
// the header refresh and the overview's auto refresh reload them. A list
// that fails to load keeps its previous rows and records the error
// (errors.<list>) for its tab. The lists belong to one login: they are
// dropped when the session ends (session.ts), and answers of a load started
// before are ignored.

export type ListKey = 'flows' | 'auditors' | 'channels' | 'groups'
const ALL: readonly ListKey[] = ['flows', 'auditors', 'channels', 'groups']
const FETCH: Record<ListKey, () => Promise<unknown>> = { flows: fetchFlows, auditors: fetchAuditors, channels: fetchChannels, groups: fetchGroups }

const state = reactive({
  flows: [] as Flow[],
  auditors: [] as Auditor[],
  channels: [] as Channel[],
  groups: [] as Group[],
  errors: { flows: null, auditors: null, channels: null, groups: null } as Record<ListKey, unknown>,
  /** every list loaded once */
  loaded: false,
  loading: false
})
const loadedKeys = new Set<ListKey>()
const queued = new Set<ListKey>()
let inflight = new Set<ListKey>()
let loading: Promise<void> | null = null
/** Bumped by a session end: loads of the previous session write nothing. */
let gen = 0

async function load(keys: ListKey[], my: number) {
  const results = await Promise.allSettled(keys.map((k) => FETCH[k]()))
  if (my !== gen) return
  keys.forEach((k, i) => {
    const r = results[i]
    state.errors[k] = r.status === 'rejected' ? r.reason : null
    if (r.status === 'fulfilled') Object.assign(state, { [k]: Array.isArray(r.value) ? r.value : [] })
    loadedKeys.add(k)
  })
  state.loaded = ALL.every((k) => loadedKeys.has(k))
}

/**
 * Reloads the given lists (all by default). Calls during a load queue their
 * lists for one more load after it, so each list ends with a load started
 * after the latest call that named it.
 */
function refresh(keys: readonly ListKey[] = ALL): Promise<void> {
  for (const k of keys) queued.add(k)
  if (loading) return loading
  state.loading = true
  const my = gen
  loading = (async () => {
    while (queued.size && my === gen) {
      inflight = new Set(queued)
      queued.clear()
      await load([...inflight], my)
    }
  })().finally(() => {
    if (my !== gen) return
    inflight = new Set()
    loading = null
    state.loading = false
  })
  return loading
}

/** Drops every list (session end); the next useCatalog() loads them again. */
function reset() {
  gen++
  Object.assign(state, { flows: [], auditors: [], channels: [], groups: [], loaded: false, loading: false })
  state.errors = { flows: null, auditors: null, channels: null, groups: null }
  loadedKeys.clear()
  queued.clear()
  inflight = new Set()
  loading = null
}
onSessionEnd(reset)

/** Loads the lists neither loaded nor loading yet. */
function ensure(): Promise<void> {
  const missing = ALL.filter((k) => !loadedKeys.has(k) && !queued.has(k) && !inflight.has(k))
  return missing.length ? refresh(missing) : (loading ?? Promise.resolve())
}

const byId = <T extends { id: number }>(list: T[], id: number | null | undefined) => (id ? list.find((x) => x.id === id) : undefined)

export function useCatalog() {
  void ensure()
  return {
    state,
    refresh,
    ensure,
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
