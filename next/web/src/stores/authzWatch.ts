import { watch } from 'vue'
import type { Router } from 'vue-router'
import type { HttpConfig } from '@sub2api/host'
import { deniedRoute } from '@/router/guard'
import { useAuthStore } from './auth'

/**
 * Decides when the console reloads the caller's permissions (CONTRACTS §5.2):
 *
 *  - an X-Authz-Version header above both the version of the /me in hand and
 *    every header that already triggered a reload: nodes may lag or lead each
 *    other, so one header value triggers at most one reload; bursts are
 *    debounced;
 *  - a permission_denied response: what the page offered may no longer be
 *    allowed; throttled, since a page can keep hitting the same denial.
 */
export interface AuthzWatchOptions {
  /** authz_version of the /me in hand; null while there is none. */
  known: () => number | null | undefined
  refresh: () => Promise<unknown>
  debounceMs?: number
  throttleMs?: number
  now?: () => number
}

export interface AuthzWatch {
  version(v: number): void
  forbidden(): void
}

export function createAuthzWatch(o: AuthzWatchOptions): AuthzWatch {
  const debounceMs = o.debounceMs ?? 1000
  const throttleMs = o.throttleMs ?? 10_000
  const now = o.now ?? Date.now
  let triggered = 0
  let lastForbidden = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = () => void o.refresh().catch(() => undefined)

  return {
    version(v) {
      const known = o.known()
      if (known == null || v <= Math.max(known, triggered)) return
      triggered = v
      clearTimeout(timer)
      timer = setTimeout(run, debounceMs)
    },
    forbidden() {
      if (o.known() == null) return
      const t = now()
      if (t - lastForbidden < throttleMs) return
      lastForbidden = t
      run()
    }
  }
}

/**
 * The HTTP hooks that reload the caller's permissions (createAuthzWatch), and
 * after every reload the current page is left when it is no longer allowed.
 */
export function watchPermissions(router: Router): Pick<HttpConfig, 'onAuthzVersion' | 'onForbidden'> {
  const auth = useAuthStore()
  const authz = createAuthzWatch({
    known: () => (auth.me ? (auth.me.authz_version ?? 0) : null),
    refresh: () => auth.refreshPermissions()
  })
  watch(
    () => auth.permissionsEpoch,
    () => {
      const to = deniedRoute(router.currentRoute.value)
      if (to) void router.replace(to)
    }
  )
  return {
    onAuthzVersion: v => authz.version(v),
    onForbidden: e => {
      if (e.code === 'permission_denied') authz.forbidden()
    }
  }
}
