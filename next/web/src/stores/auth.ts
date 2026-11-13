import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, session } from '@sub2api/host'
import type { Me, TokenResponse } from '@/api/types'
import { getPasskey } from '@/utils/webauthn'
import { refreshShell } from './app'

export const useAuthStore = defineStore('auth', () => {
  const me = ref<Me | null>(null)
  const balance = ref<string | null>(null)
  const loggedIn = ref(!!session.get())
  /** The session ended because it could not be renewed (login page shows a notice). */
  const sessionExpired = ref(false)
  const permSet = computed(() => new Set(me.value?.permissions || []))
  /**
   * Bumped after every refreshPermissions: whatever is derived from the
   * caller's permissions (assignable roles, the current route) is checked again.
   */
  const permissionsEpoch = ref(0)
  let refreshingPermissions: Promise<void> | null = null

  session.onChange((s) => {
    loggedIn.value = !!s
    if (!s) {
      me.value = null
      balance.value = null
    }
  })

  function has(perm: string | string[] | undefined | null): boolean {
    if (!perm || (Array.isArray(perm) && perm.length === 0)) return true
    if (me.value?.superuser) return true
    const list = Array.isArray(perm) ? perm : [perm]
    return list.some((p) => permSet.value.has(p))
  }

  /** Returns the flow token when the account asks for a second factor; the login is not done yet. */
  async function login(email: string, password: string): Promise<string | undefined> {
    const r = await api.post<TokenResponse>('/auth/login', { email, password }, { anonymous: true })
    if (r.two_factor_required) return r.flow_token
    await signedIn(r)
  }

  async function loginSecondFactor(flowToken: string, code: string) {
    await signedIn(await api.post<TokenResponse>('/auth/login/2fa', { flow_token: flowToken, code }, { anonymous: true }))
  }

  async function loginWithPasskey() {
    const begin = await api.post<{ flow_token: string; options: { publicKey: any } }>('/auth/passkey/begin', {}, { anonymous: true })
    const credential = await getPasskey(begin.options)
    await signedIn(await api.post<TokenResponse>('/auth/passkey/finish', { flow_token: begin.flow_token, credential }, { anonymous: true }))
  }

  async function signedIn(r: TokenResponse) {
    session.fromTokenResponse(r)
    sessionExpired.value = false
    if (r.user && Array.isArray(r.user.permissions)) me.value = r.user
    else await loadMe()
  }

  async function loadMe() {
    me.value = await api.get<Me>('/me')
    refreshBalance()
    return me.value
  }

  /**
   * Reloads what depends on the caller's permissions: /me, then the plugin
   * modules and menus. Concurrent callers share one reload.
   */
  function refreshPermissions(): Promise<void> {
    refreshingPermissions ??= (async () => {
      await loadMe()
      await refreshShell()
      permissionsEpoch.value++
    })().finally(() => {
      refreshingPermissions = null
    })
    return refreshingPermissions
  }

  async function refreshBalance() {
    if (!has('balance:self:read')) return
    try {
      const r = await api.get<{ balance: string }>('/me/balance')
      balance.value = r?.balance ?? null
    } catch {
      balance.value = null
    }
  }

  async function logout() {
    try {
      if (session.get()) await api.post('/auth/logout', { refresh_token: session.get()?.refresh_token })
    } catch {
      /* ignore */
    }
    session.clear()
    sessionExpired.value = false
  }

  return {
    me,
    balance,
    loggedIn,
    sessionExpired,
    permissionsEpoch,
    has,
    login,
    loginSecondFactor,
    loginWithPasskey,
    loadMe,
    refreshPermissions,
    refreshBalance,
    logout
  }
})
