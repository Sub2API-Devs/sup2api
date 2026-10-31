import { reactive } from 'vue'
import { isApiError, listAll } from '@sub2api/host'
import { useDwHost, type Named } from './host'

// Names of the core groups and accounts, read through the core API with the
// viewer's own permissions (group:read, account:read). The groups are few:
// loaded once, again after a failure. The accounts are searched by name as
// typed (q=) and looked up by id as they are shown. Without the permissions
// the pickers still take a typed id and the names read "#id"; after a first
// refusal no more accounts are looked up by id.
const MAX_GROUPS = 1000
const SEARCH_SIZE = 20

const state = reactive({ groups: [] as Named[], accounts: {} as Record<number, string> })
let loading: Promise<void> | null = null
const looked = new Set<number>()
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

/** Fetches the name of an account not seen yet, once. */
function lookUp(id: number) {
  if (id <= 0 || accountsDenied || looked.has(id)) return
  looked.add(id)
  useDwHost()
    .api.get<Named>(`/accounts/${id}`)
    .then((a) => (state.accounts[id] = a.name))
    .catch((e) => {
      if (isApiError(e) && (e.status === 401 || e.status === 403)) accountsDenied = true
    })
}

/** The first accounts whose name contains q; [] when not readable. */
export async function searchAccounts(q: string): Promise<Named[]> {
  try {
    const r = await useDwHost().api.list<Named>('/accounts', { q: q.trim(), page_size: SEARCH_SIZE })
    const found = r.items.map(named)
    for (const a of found) state.accounts[a.id] = a.name
    return found
  } catch {
    return []
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
