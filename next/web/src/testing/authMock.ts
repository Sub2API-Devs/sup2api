import { canonicalPermission, permissionIndex } from '@/authz/implies'

const canonical = (k: string) => canonicalPermission(k) ?? k

/**
 * The permission answers of an auth store mock whose caller holds every key
 * but the denied ones (read on every call: specs reassign the list). Keys
 * compare in their canonical spelling (account:own:read = account:read:own);
 * a scoped action is held at some scope while its key or its own scope is.
 */
export function deniedAuth(denied: () => readonly string[]) {
  const has = (perm: string | string[]) => [perm].flat().some((k) => !denied().map(canonical).includes(canonical(k)))
  const hasAction = (action: string | string[]) => [action].flat().some((a) => has([a, `${a}:own`]))
  return { has, hasAction }
}

/** The permission answers of an auth store mock whose caller holds the granted keys (read on every call), as the store answers them. */
export function grantedAuth(granted: () => readonly string[]) {
  const index = () => permissionIndex(granted())
  return {
    has: (perm: string | string[]) => [perm].flat().some((k) => index().has(k)),
    hasAction: (action: string | string[]) => [action].flat().some((a) => index().hasAction(a)),
    scopes: (action: string) => index().scopes(action)
  }
}
