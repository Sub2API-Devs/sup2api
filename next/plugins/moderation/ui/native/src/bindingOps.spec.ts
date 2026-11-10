import { describe, expect, it } from 'vitest'
import { bindingKind, exemptGroups, fallbackOf, hasAccountBindings, resolveBinding, resolveSteps, sortBindings } from './bindingOps'
import type { Binding } from './types'

const b = (group_id: number, account_id: number, flow_id: number): Binding => ({ kind: bindingKind(group_id, account_id), group_id, account_id, flow_id })
/** Flows 1-3 are live, 4 and 5 are disabled or unpublished: GET /bindings marks their bindings inactive. */
const all = (...list: Array<[number, number, number]>): Binding[] => list.map(([g, a, f]) => ({ ...b(g, a, f), ...(f > 3 ? { inactive: true } : {}) }))
const keyOf = (x: Binding | undefined) => x && `${x.group_id}:${x.account_id}`

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

// The 0.8.0 cases of TestFlowForAccount: a binding to a disabled or
// unpublished flow does not apply and a wider binding decides.
describe('resolveBinding with inactive bindings', () => {
  const flow = (list: Binding[], group: number, account: number) => resolveBinding(list, group, account)?.flow_id ?? 0

  it('group bound to a disabled flow takes the default flow', () => {
    const list = all([0, 0, 1], [9, 0, 4])
    expect(flow(list, 9, 6)).toBe(1)
    expect(flow(list, 9, 0)).toBe(1)
  })

  it('group bound to an unpublished flow falls back', () => {
    expect(flow(all([0, 0, 2], [9, 0, 5]), 9, 6)).toBe(2)
    expect(resolveBinding(all([9, 0, 5]), 9, 6)).toBeUndefined()
  })

  it('group + account bound to a disabled flow takes the account binding', () => {
    expect(flow(all([0, 0, 1], [9, 0, 2], [9, 7, 4], [0, 7, 3]), 9, 7)).toBe(3)
  })

  it('both account bindings disabled take the group flow', () => {
    const list = all([0, 0, 1], [9, 0, 2], [9, 7, 4], [0, 7, 5])
    expect(flow(list, 9, 7)).toBe(2)
    expect(flow(list, 5, 7)).toBe(1)
  })

  it('every level disabled or absent is not moderated', () => {
    const list = all([0, 0, 4], [9, 0, 5], [9, 7, 4], [0, 7, 5])
    expect(resolveBinding(list, 9, 7)).toBeUndefined()
    expect(resolveBinding(list, 9, 6)).toBeUndefined()
    expect(resolveBinding(list, 5, 6)).toBeUndefined()
    expect(resolveBinding([], 9, 7)).toBeUndefined()
  })

  it('flow 0 exempts and does not fall back', () => {
    const list = all([0, 0, 1], [9, 0, 2], [9, 7, 0], [0, 7, 3])
    expect(keyOf(resolveBinding(list, 9, 7))).toBe('9:7')
    expect(flow(list, 9, 7)).toBe(0)
    expect(flow(list, 5, 7)).toBe(3)
    // An exempt group does not fall back to the default either.
    expect(keyOf(resolveBinding(all([0, 0, 1], [10, 0, 0]), 10, 6))).toBe('10:0')
  })

  it('lists the inactive bindings passed over, most specific first', () => {
    const list = all([0, 0, 1], [9, 0, 2], [9, 7, 4], [0, 7, 5])
    const steps = resolveSteps(list, 9, 7)
    expect(keyOf(steps.hit)).toBe('9:0')
    expect(steps.skipped.map(keyOf)).toEqual(['9:7', '0:7'])
    expect(resolveSteps(list, 9, 6).skipped).toEqual([])
    expect(resolveSteps(all([0, 0, 4]), 0, 0)).toEqual({ hit: undefined, skipped: all([0, 0, 4]) })
  })

  it('tells what an inactive binding falls back to', () => {
    const list = all([0, 0, 1], [9, 0, 2], [9, 7, 4], [0, 7, 3], [8, 0, 5])
    expect(keyOf(fallbackOf(list, { group_id: 9, account_id: 7 }))).toBe('0:7')
    expect(keyOf(fallbackOf(list, { group_id: 8, account_id: 0 }))).toBe('0:0')
    expect(fallbackOf(all([0, 0, 4], [9, 0, 2]), { group_id: 0, account_id: 0 })).toBeUndefined()
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
