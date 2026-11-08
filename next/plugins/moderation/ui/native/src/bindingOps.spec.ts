import { describe, expect, it } from 'vitest'
import { bindingKind, exemptGroups, hasAccountBindings, resolveBinding, sortBindings } from './bindingOps'
import type { Binding } from './types'

const b = (group_id: number, account_id: number, flow_id: number): Binding => ({ kind: bindingKind(group_id, account_id), group_id, account_id, flow_id })

// The same cases as internal/moderation TestFlowForAccount.
describe('resolveBinding', () => {
  const list = [b(0, 0, 1), b(9, 0, 2), b(10, 0, 0), b(9, 7, 3), b(0, 7, 0), b(0, 8, 3)]
  it.each([
    [9, 7, '9:7'],
    [5, 7, '0:7'],
    [9, 8, '0:8'],
    [10, 8, '0:8'],
    [9, 6, '9:0'],
    [5, 6, '0:0'],
    [10, 6, '10:0']
  ])('group %i, account %i goes by %s', (group, account, key) => {
    const got = resolveBinding(list, group, account)
    expect(got && `${got.group_id}:${got.account_id}`).toBe(key)
  })

  it('uses only group bindings before an account is chosen', () => {
    expect(resolveBinding(list, 9, 0)?.flow_id).toBe(2)
    expect(resolveBinding([b(9, 7, 3)], 5, 0)).toBeUndefined()
  })
})

describe('bindings', () => {
  it('names the kind from the ids', () => {
    expect([bindingKind(0, 0), bindingKind(3, 0), bindingKind(0, 4), bindingKind(3, 4)]).toEqual(['group', 'group', 'account', 'group_account'])
  })

  it('sorts most specific first', () => {
    const sorted = sortBindings([b(0, 0, 1), b(0, 8, 3), b(9, 0, 2), b(9, 7, 3), b(0, 7, 0)])
    expect(sorted.map((x) => `${x.group_id}:${x.account_id}`)).toEqual(['9:7', '0:7', '0:8', '0:0', '9:0'])
  })

  it('finds exempt groups and account bindings', () => {
    expect(exemptGroups([b(0, 0, 1), b(10, 0, 0), b(0, 7, 0)])).toEqual([10])
    expect(hasAccountBindings([b(0, 0, 1)])).toBe(false)
    expect(hasAccountBindings([b(0, 7, 0)])).toBe(true)
  })
})
