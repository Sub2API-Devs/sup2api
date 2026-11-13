import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Where a caller lacking the route's `perm` goes (its deniedRedirect, else
 * /forbidden); undefined when the caller may stay. The navigation guard and
 * the recheck after the permissions reload both ask it.
 */
export function deniedRoute(to: RouteLocationNormalized): RouteLocationRaw | undefined {
  if (!to.meta.perm || useAuthStore().has(to.meta.perm)) return undefined
  const redirect = to.meta.deniedRedirect?.(to)
  if (redirect) return redirect
  const perm = Array.isArray(to.meta.perm) ? to.meta.perm.join(' / ') : to.meta.perm
  return { path: '/forbidden', query: { perm } }
}
