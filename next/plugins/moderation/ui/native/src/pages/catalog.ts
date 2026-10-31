import { reactive, shallowRef } from 'vue'
import { fetchAuditors, fetchChannels, fetchFlows, type Auditor, type Channel, type Flow } from '../host'
import { fetchStatus, type Status } from '../stats'

// Flows, auditors and channels of the plugin for labels in lists and details
// (flow name, current version, auditor name and type). Loaded once per page;
// the tabs that edit them prime the cache with what they just loaded.

const state = reactive({ flows: null as Flow[] | null, auditors: null as Auditor[] | null, channels: null as Channel[] | null })
const loading: Partial<Record<keyof typeof state, Promise<unknown>>> = {}

function load<K extends keyof typeof state>(key: K, fetch: () => Promise<NonNullable<(typeof state)[K]>>, force: boolean) {
  if (!force && loading[key]) return loading[key] as Promise<NonNullable<(typeof state)[K]>>
  const p = fetch()
    .then((v) => (state[key] = v as (typeof state)[K]))
    .catch(() => {
      delete loading[key]
      return [] as unknown as NonNullable<(typeof state)[K]>
    })
  loading[key] = p
  return p as Promise<NonNullable<(typeof state)[K]>>
}

export const loadFlows = (force = false) => load('flows', fetchFlows, force)
export const loadAuditors = (force = false) => load('auditors', fetchAuditors, force)
export const loadChannels = (force = false) => load('channels', fetchChannels, force)

/** Replaces the cached list with fresh data from an editing tab. */
export function prime(key: 'flows', v: Flow[]): void
export function prime(key: 'auditors', v: Auditor[]): void
export function prime(key: 'channels', v: Channel[]): void
export function prime(key: keyof typeof state, v: Flow[] | Auditor[] | Channel[]) {
  ;(state as Record<string, unknown>)[key] = v
  loading[key] = Promise.resolve(v)
}

/** Whether a list has loaded (false after a failed load). */
export const isLoaded = (key: keyof typeof state) => state[key] !== null
export const flowOf = (id: number) => state.flows?.find((f) => f.id === id)
export const auditorOf = (id: number) => state.auditors?.find((a) => a.id === id)
export const channelOf = (id: number) => state.channels?.find((c) => c.id === id)

// GET /status for the watch list counts and the error-rate alert threshold.
export const status = shallowRef<Status | null>(null)
let statusP: Promise<Status | null> | null = null
export function loadStatus(force = false): Promise<Status | null> {
  if (!force && statusP) return statusP
  statusP = fetchStatus()
    .then((s) => (status.value = s))
    .catch(() => {
      statusP = null
      return status.value
    })
  return statusP
}
