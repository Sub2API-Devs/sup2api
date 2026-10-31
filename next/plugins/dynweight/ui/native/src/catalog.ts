import { reactive } from 'vue'
import { fetchAll, type Named } from './host'

// Names of the core groups and accounts, loaded once through the core API
// with the viewer's own permissions (group:read, account:read). Without them
// a list stays empty: its picker falls back to typing an id, its names to
// "#id".
const state = reactive({ groups: [] as Named[], accounts: [] as Named[] })
let loading: Promise<void> | null = null

const label = (list: Named[], id: number) => {
  const name = list.find((x) => x.id === id)?.name
  return name ? `${name} #${id}` : `#${id}`
}

export function useCatalog() {
  loading ??= Promise.all([fetchAll('/groups'), fetchAll('/accounts')]).then(([groups, accounts]) => {
    state.groups = groups
    state.accounts = accounts
  })
  return {
    state,
    groupName: (id: number) => label(state.groups, id),
    /** The name the plugin saw scheduling offer, else the catalog's. */
    accountName: (id: number, seen?: string) => (seen ? `${seen} #${id}` : label(state.accounts, id))
  }
}
