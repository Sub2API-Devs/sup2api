import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Me } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useAccountCaps } from './useAccountCaps'

const signIn = (...permissions: string[]) => {
  useAuthStore().me = { id: 1, email: 'a@x', display_name: 'a', roles: [], permissions, superuser: false } as Me
}

describe('useAccountCaps', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('an all-level caller binds groups and creates custom upstreams without the extra keys', () => {
    signIn('account:create', 'account:update:own')
    const create = useAccountCaps()
    expect(create.scope.value).toBe('all')
    expect([create.bindGroups.value, create.relay.value, create.creatable({ custom_upstream: true })]).toEqual([true, true, true])
    // Editing is decided by the update keys: own level here.
    const edit = useAccountCaps(true)
    expect(edit.scope.value).toBe('own')
    expect([edit.bindGroups.value, edit.relay.value]).toEqual([false, false])
  })

  it('an own-level caller needs account:group:bind or group:manage, and account:relay', () => {
    signIn('account:create:own', 'account:group:bind')
    const c = useAccountCaps()
    expect(c.bindGroups.value).toBe(true)
    expect(c.creatable({ custom_upstream: true })).toBe(false)
    expect(c.creatable({ custom_upstream: false })).toBe(true)
    signIn('account:create:own', 'group:manage', 'account:relay')
    expect([c.bindGroups.value, c.creatable({ custom_upstream: true })]).toEqual([true, true])
  })

  it('a group-scoped caller binds the groups of its scope without the binding keys', () => {
    signIn('account:create:group/12', 'account:update:account/5')
    expect([useAccountCaps().scope.value, useAccountCaps().bindGroups.value]).toEqual(['own', true])
    expect(useAccountCaps(true).bindGroups.value).toBe(false)
  })

  it('pasting a proxy URL takes a proxy management key; custom settings their own key', () => {
    signIn('account:create')
    const c = useAccountCaps()
    expect([c.proxyByURL.value, c.customSettings.value]).toEqual([false, false])
    signIn('account:create', 'proxy:manage:own', 'account:settings:custom')
    expect([c.proxyByURL.value, c.customSettings.value]).toEqual([true, true])
    // proxy/<id> reaches existing proxies only: it creates none.
    signIn('account:create', 'proxy:manage:proxy/8')
    expect(c.proxyByURL.value).toBe(false)
  })
})
