import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get } }))
const auth = vi.hoisted(() => ({ state: null as null | { me: { id: number; superuser: boolean } | null; permissionsEpoch: number } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth.state }))

import { useAssignableRoles, withSupplierUser } from './useAssignableRoles'

const role = (key: string, grantable = true) => ({ key, name: key, builtin: true, grantable })

describe('useAssignableRoles', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('loads once per user and permissions reload, and never serves another list meanwhile', async () => {
    auth.state = reactive({ me: { id: 101, superuser: false }, permissionsEpoch: 1 })
    mocks.get.mockResolvedValue([role('supplier')])
    const a = useAssignableRoles()
    useAssignableRoles()
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(a.assignable('supplier')).toBe(true)

    let release!: (v: unknown) => void
    mocks.get.mockReturnValue(new Promise((r) => (release = r)))
    auth.state.permissionsEpoch++
    await flushPromises()
    expect(a.roles.value).toEqual([])
    expect(a.assignable('supplier')).toBe(false)
    release([role('operator')])
    await flushPromises()
    expect(a.assignable('operator')).toBe(true)

    auth.state.me = null
    await flushPromises()
    expect(a.roles.value).toEqual([])
  })

  it('retries after a failed load', async () => {
    auth.state = reactive({ me: { id: 102, superuser: false }, permissionsEpoch: 1 })
    mocks.get.mockRejectedValueOnce(new Error('down')).mockResolvedValue([role('user')])
    const a = useAssignableRoles()
    await flushPromises()
    expect(a.loaded.value).toBe(false)
    expect(a.manageable(['admin'])).toBe(true) // unknown: the server decides
    await a.load()
    expect(a.loaded.value).toBe(true)
    expect(a.manageable(['admin'])).toBe(false)
    expect(a.manageable(['user'])).toBe(true)
  })

  it('withSupplierUser adds the default role to supplier only', () => {
    expect(withSupplierUser(['supplier'])).toEqual(['supplier', 'user'])
    expect(withSupplierUser(['operator'])).toEqual(['operator'])
  })
})
