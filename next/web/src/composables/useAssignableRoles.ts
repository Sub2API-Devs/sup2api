import { computed, ref, watch } from 'vue'
import { api } from '@sub2api/host'
import type { AssignableRole } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

/** The default role: every user holds it; it is not a role one manages users by. */
export const DEFAULT_ROLE = 'user'
/** Supplier is an add-on role: a supplier is a user too. */
export const SUPPLIER_ROLE = 'supplier'

/** Role keys with the default role added when supplier is among them. */
export function withSupplierUser(keys: string[]): string[] {
  return keys.includes(SUPPLIER_ROLE) && !keys.includes(DEFAULT_ROLE) ? [...keys, DEFAULT_ROLE] : keys
}

// One list per signed-in user and permissions reload (auth.permissionsEpoch).
const roles = ref<AssignableRole[]>([])
const loaded = ref(false)
let loadedFor = ''
let pending: Promise<void> | null = null

/**
 * The caller's managed roles (GET /me/assignable-roles): the roles it may
 * assign, and the users it may act on — every role a user holds besides the
 * default one must be on the list and grantable (CONTRACTS §43.6). The server
 * decides; the console uses the list to offer only what would pass.
 */
export function useAssignableRoles() {
  const auth = useAuthStore()
  const cacheKey = () => (auth.me ? `${auth.me.id}:${auth.permissionsEpoch}` : '')

  function load(): Promise<void> {
    const key = cacheKey()
    if (!key || (key === loadedFor && (loaded.value || pending))) return pending ?? Promise.resolve()
    loadedFor = key
    loaded.value = false
    const mine = (pending = api
      .get<AssignableRole[]>('/me/assignable-roles')
      .then((list) => {
        if (loadedFor !== key) return
        roles.value = list || []
        loaded.value = true
      })
      .catch(() => {
        if (loadedFor === key) loadedFor = '' // try again next time
      })
      .finally(() => {
        if (pending === mine) pending = null
      }))
    return mine
  }
  watch(cacheKey, (k) => k && void load(), { immediate: true })

  const byKey = computed(() => new Map(roles.value.map((r) => [r.key, r])))
  /** Assigning `key` passes: on the list and grantable. */
  const assignable = (key: string) => !!byKey.value.get(key)?.grantable
  /**
   * The caller may act on a user holding `userRoles`. Unknown (list not
   * loaded) counts as yes: the server still decides.
   */
  const manageable = (userRoles: string[] | undefined) =>
    !!auth.me?.superuser || !loaded.value || (userRoles || []).every((k) => k === DEFAULT_ROLE || assignable(k))

  return { roles, loaded, load, get: (key: string) => byKey.value.get(key), assignable, manageable }
}
