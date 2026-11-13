import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AccountType } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { ACCOUNT_FIELD_KEYS, ACCOUNT_KEYS, PROXY_KEYS, useOwnership } from './useOwnership'

/**
 * What the caller may set on an account beyond editing it (CONTRACTS §21):
 * the server checks the group binding and custom upstreams only for an
 * own-level caller, so the all-level key covers both. `editing`: an existing
 * account (account:update scope) rather than a new one (account:create).
 */
export function useAccountCaps(editing: MaybeRefOrGetter<boolean> = false) {
  const auth = useAuthStore()
  const own = useOwnership()
  const scope = computed(() => own.scopeOf(toValue(editing) ? ACCOUNT_KEYS.update : ACCOUNT_KEYS.create))
  const all = computed(() => scope.value === 'all')
  /** Changing the account's groups. */
  const bindGroups = computed(() => all.value || auth.has([ACCOUNT_FIELD_KEYS.groupManage, ACCOUNT_FIELD_KEYS.groupBind]))
  /** Creating, or changing the upstream address of, a type with a custom upstream. */
  const relay = computed(() => all.value || auth.has(ACCOUNT_FIELD_KEYS.relay))
  /** Pasting a proxy URL (the server finds or creates the proxy). */
  const proxyByURL = computed(() => auth.has([...PROXY_KEYS.manage]))
  /** Setting guarded settings (base URL) to other than the official values. */
  const customSettings = computed(() => auth.has(ACCOUNT_FIELD_KEYS.settingsCustom))
  /** The one place deciding whether an account of type `t` can be created. */
  const creatable = (t: Pick<AccountType, 'custom_upstream'>) => !t.custom_upstream || relay.value
  return { scope, bindGroups, relay, proxyByURL, customSettings, creatable }
}
