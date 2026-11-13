import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Me } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useScope } from './useScope'

const signIn = (permissions: string[], superuser = false) => {
  useAuthStore().me = { id: 7, email: 'a@x', display_name: 'a', roles: [], permissions, superuser } as Me
}
const row = (id: number, created_by: number | null, group_ids: number[] = []) => ({ id, created_by, group_ids })

describe('useScope', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rates the reach of an action: every row, a restricted scope, or none', () => {
    signIn(['account:update', 'account:read:group/12', 'account:own:test'])
    const s = useScope()
    expect([s.level('account:update'), s.level('account:read'), s.level('account:test'), s.level('account:delete')]).toEqual(['all', 'own', 'own', null])
    signIn([], true)
    expect(s.level('account:delete')).toBe('all')
  })

  it('judges a row by any held scope: own, a group, an id, a group and id', () => {
    signIn(['account:update:own', 'account:update:group/12', 'account:update:account/5', 'account:update:group/3/account/9'])
    const s = useScope()
    expect(s.can(row(1, 7), 'account:update')).toBe(true)
    expect(s.can(row(1, 8, [12]), 'account:update')).toBe(true)
    expect(s.can(row(5, null), 'account:update')).toBe(true)
    expect(s.can(row(9, 8, [3]), 'account:update')).toBe(true)
    expect(s.can(row(9, 8, [4]), 'account:update')).toBe(false)
    expect(s.can(row(2, 8, [13]), 'account:update')).toBe(false)
    expect(s.can(row(1, 7), 'account:delete')).toBe(false)
  })

  it('keeps the supplier rule: only rows the caller created, never a row without a creator', () => {
    signIn(['account:own:update', 'proxy:own:manage'])
    const s = useScope()
    expect(s.can(row(1, 7), 'account:update')).toBe(true)
    expect(s.can(row(1, null), 'account:update')).toBe(false)
    expect(s.can({ id: 3, created_by: 7 }, 'proxy:manage')).toBe(true)
    expect(s.can({ id: 3, created_by: 8 }, 'proxy:manage')).toBe(false)
  })

  it('reaches a proxy by its id', () => {
    signIn(['proxy:manage:proxy/8'])
    const s = useScope()
    expect([s.can({ id: 8, created_by: 1 }, 'proxy:manage'), s.can({ id: 9, created_by: 7 }, 'proxy:manage')]).toEqual([true, false])
  })
})
