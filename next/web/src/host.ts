import { computed } from 'vue'
import type { Router } from 'vue-router'
import { api, configureHttp, provideHost, session, startKeepAlive, HOST_UI_VERSION, type HostContext } from '@sub2api/host'
import { confirm, toast } from '@sub2api/ui'
import { addMessages, currentLocale, i18n, lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { watchPermissions } from '@/stores/authzWatch'
import { hostComponents } from '@/components/plugin/hostComponents'
import { formatDateTime, formatMoney, formatNumber } from '@/utils/format'
import { cancelStepUps, requestStepUp } from '@/components/stepUp/stepUp'

/** Wires the HTTP client and publishes the host context for plugins. */
export function setupHost(router: Router) {
  const auth = useAuthStore()
  const app = useAppStore()
  configureHttp({
    // baseURL stays at @sub2api/host's API_BASE; see packages/host/src/routes.ts.
    locale: () => currentLocale(),
    onUnauthenticated: reason => {
      // "expired": the refresh token was rejected (expired, revoked or reused);
      // the login page then asks the user to sign in again.
      if (reason === 'expired') auth.sessionExpired = true
      const cur = router.currentRoute.value
      if (!cur.meta.public) router.replace({ path: '/login', query: { redirect: cur.fullPath } })
    },
    ...watchPermissions(router),
    // High-risk operations answer 403 verification_required: verify, then replay with the proof.
    onVerificationRequired: requestStepUp
  })
  // Signed out (or the session could not be renewed): no verification is left to ask for.
  session.onChange((s) => !s && cancelStepUps())
  // A login lasts while it is used: renew the access token before it expires.
  startKeepAlive()

  const ctx: HostContext = {
    version: HOST_UI_VERSION,
    components: hostComponents,
    api,
    router,
    i18n: {
      locale: computed(() => i18n.global.locale.value) as any,
      t: (key, params) => (params ? i18n.global.t(key, params) : i18n.global.t(key)),
      text: lt,
      addMessages,
      formatNumber: (n, d) => formatNumber(n, d),
      formatMoney: (v, d) => formatMoney(v, d),
      formatDateTime
    },
    permissions: {
      superuser: () => !!auth.me?.superuser,
      has: k => auth.has(k),
      any: (...keys) => auth.has(keys)
    },
    theme: computed(() => app.theme) as any,
    toast: (m, kind) => toast(m, kind),
    confirm
  }
  provideHost(ctx)
}
