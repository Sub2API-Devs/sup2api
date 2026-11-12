import { reactive } from 'vue'
import { isApiError, listAll, MAX_ACCOUNT_BATCH } from '@sub2api/host'
import { useDwHost, type Named } from './host'

// Names of the core groups and accounts for the tables and texts, read
// through the core API with the viewer's own permissions (group:read,
// account:read). The groups are few: loaded once, again after a failure. The
// accounts are looked up by id as they are shown: the ids asked for in one
// tick together, MAX_ACCOUNT_BATCH per GET /accounts?ids=. Without the
// permissions the names read "#id"; after a first refusal no more accounts
// are looked up by id. Picking a group or an account is the core's entity
// picker (host.components.EntityPicker), which keeps names of its own.
const MAX_GROUPS = 1000

const state = reactive({ groups: [] as Named[], accounts: {} as Record<number, string> })
let loading: Promise<void> | null = null
const looked = new Set<number>()
let queued: number[] | null = null
let accountsDenied = false

const named = ({ id, name }: Named): Named => ({ id, name })
const label = (name: string | undefined, id: number) => (name ? `${name} #${id}` : `#${id}`)

function loadGroups() {
  loading ??= listAll<Named>(useDwHost().api, '/groups', { max: MAX_GROUPS }).then(
    (groups) => {
      state.groups = groups.map(named)
    },
    () => {
      loading = null
    }
  )
}

/** Queues the name of an account not seen yet, once. */
function lookUp(id: number) {
  if (id <= 0 || accountsDenied || looked.has(id)) return
  looked.add(id)
  if (!queued) {
    queued = []
    queueMicrotask(flushLookUps)
  }
  queued.push(id)
}

function flushLookUps() {
  const ids = queued ?? []
  queued = null
  for (let i = 0; i < ids.length; i += MAX_ACCOUNT_BATCH) {
    const batch = ids.slice(i, i + MAX_ACCOUNT_BATCH)
    listAll<Named>(useDwHost().api, '/accounts', { query: { ids: batch.join(','), orphaned: 'all' }, max: batch.length })
      .then((found) => {
        for (const a of found) state.accounts[a.id] = a.name
      })
      .catch((e) => {
        if (isApiError(e) && (e.status === 401 || e.status === 403)) accountsDenied = true
      })
  }
}

export function useCatalog() {
  loadGroups()
  return {
    state,
    groupName: (id: number) => label(state.groups.find((g) => g.id === id)?.name, id),
    /** The name the plugin saw scheduling offer, else the core's. */
    accountName: (id: number, seen?: string) => {
      if (seen) return label(seen, id)
      if (!(id in state.accounts)) lookUp(id)
      return label(state.accounts[id], id)
    }
  }
}
