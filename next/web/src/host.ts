import { computed } from 'vue'
import type { Router } from 'vue-router'
import { api, configureHttp, provideHost, HOST_UI_VERSION, type HostContext } from '@sub2api/host'
import { confirm, toast } from '@sub2api/ui'
import { addMessages, currentLocale, i18n, lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { requestStepUp } from '@/components/stepUp'
import { formatDateTime, formatMoney, formatNumber } from '@/utils/format'

/** Wires the HTTP client and publishes the host context for plugins. */
export function setupHost(router: Router) {
  const auth = useAuthStore()
  const app = useAppStore()
  configureHttp({
    baseURL: '/api/v1',
    locale: () => currentLocale(),
    stepUp: requestStepUp,
    onUnauthenticated: (reason) => {
      // "expired": the refresh token was rejected (expired, revoked or reused);
      // the login page then asks the user to sign in again.
      if (reason === 'expired') auth.sessionExpired = true
      const cur = router.currentRoute.value
      if (!cur.meta.public) router.replace({ path: '/login', query: { redirect: cur.fullPath } })
    }
  })

  const ctx: HostContext = {
    version: HOST_UI_VERSION,
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
      has: (k) => auth.has(k),
      any: (...keys) => auth.has(keys)
    },
    theme: computed(() => app.theme) as any,
    toast: (m, kind) => toast(m, kind),
    confirm
  }
  provideHost(ctx)
}
