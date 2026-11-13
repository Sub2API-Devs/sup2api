import type { RouteLocationNormalized, RouteLocationRaw, RouteMeta } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/** Whether the caller may open a page: it asks nothing, or one of its `perm` keys or `action`s (at any scope) is held. */
export function mayOpen(meta: Pick<RouteMeta, 'perm' | 'action'>): boolean {
  if (!meta.perm && !meta.action) return true
  const auth = useAuthStore()
  return (!!meta.perm && auth.has(meta.perm)) || (!!meta.action && auth.hasAction(meta.action))
}

/**
 * Where a caller lacking the route's `perm` / `action` goes (its
 * deniedRedirect, else /forbidden); undefined when the caller may stay. The
 * navigation guard and the recheck after the permissions reload both ask it.
 */
export function deniedRoute(to: RouteLocationNormalized): RouteLocationRaw | undefined {
  if (mayOpen(to.meta)) return undefined
  const redirect = to.meta.deniedRedirect?.(to)
  if (redirect) return redirect
  const perm = [to.meta.perm ?? [], to.meta.action ?? []].flat().join(' / ')
  return { path: '/forbidden', query: { perm } }
}
