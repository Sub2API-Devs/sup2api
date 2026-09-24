import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, session } from '@sub2api/host'
import type { Me, TokenResponse } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const me = ref<Me | null>(null)
  const balance = ref<string | null>(null)
  const loggedIn = ref(!!session.get())
  const permSet = computed(() => new Set(me.value?.permissions || []))

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

  async function login(email: string, password: string) {
    const r = await api.post<TokenResponse>('/auth/login', { email, password }, { anonymous: true, noStepUp: true })
    session.fromTokenResponse(r)
    if (r.user && Array.isArray(r.user.permissions)) me.value = r.user
    else await loadMe()
  }

  async function loadMe() {
    me.value = await api.get<Me>('/me')
    refreshBalance()
    return me.value
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
      if (session.get()) await api.post('/auth/logout', { refresh_token: session.get()?.refresh_token }, { noStepUp: true })
    } catch {
      /* ignore */
    }
    session.clear()
  }

  return { me, balance, loggedIn, has, login, loadMe, refreshBalance, logout }
})
