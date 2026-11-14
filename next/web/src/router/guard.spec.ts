import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Me } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { mayOpen } from './guard'

const signIn = (...permissions: string[]) => {
  useAuthStore().me = { id: 1, email: 'a@x', display_name: 'a', roles: [], permissions, superuser: false } as Me
}

describe('mayOpen', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens a page of a scoped action at any scope, a group or an id included', () => {
    for (const key of ['account:read', 'account:read:own', 'account:read:group/12', 'account:read:account/5']) {
      signIn(key)
      expect(mayOpen({ action: 'account:read' })).toBe(true)
    }
    signIn('account:create:group/12')
    expect(mayOpen({ action: 'account:read' })).toBe(false)
  })

  it('takes perm or action, and asks nothing of a page without either', () => {
    signIn('settings:read')
    expect(mayOpen({ perm: 'settings:read', action: 'account:read' })).toBe(true)
    expect(mayOpen({ perm: 'settings:manage', action: 'account:read' })).toBe(false)
    expect(mayOpen({})).toBe(true)
  })

  it('keeps perm a key of every row: a narrower scope does not open it', () => {
    signIn('account:read:group/12')
    expect(mayOpen({ perm: 'account:read' })).toBe(false)
  })
})
