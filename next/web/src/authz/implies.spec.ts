import { describe, expect, it } from 'vitest'
// The vectors the server's perm package runs too (CONTRACTS §21).
import vectors from '../../../sdk/permvectors/vectors.json'
import { canonicalPermission, implies, parsePermission, permissionIndex, reduceScopes, scopeAllowsRow, type Scope } from './implies'

interface CanonicalVector { in: string; out?: string; invalid?: boolean }
interface ImpliesVector { have: string; want: string; ok: boolean }

describe('shared permission vectors', () => {
  it.each((vectors.canonical as CanonicalVector[]).map((v) => [v.in, v] as const))('canonical %s', (_, v) => {
    expect(canonicalPermission(v.in)).toBe(v.invalid ? null : v.out)
  })

  it.each((vectors.implies as ImpliesVector[]).map((v) => [`${v.have} => ${v.want}`, v] as const))('implies %s', (_, v) => {
    const have = parsePermission(v.have)!
    const want = parsePermission(v.want)!
    expect(implies(have, want)).toBe(v.ok)
    expect(permissionIndex([v.have]).has(v.want)).toBe(v.ok)
  })
})

describe('permissionIndex', () => {
  const idx = permissionIndex(['account:read:own', 'account:update:group/12', 'account:update:group/12/account/5', 'proxy:own:manage', 'user:read', 'account:read:bad/1'])

  it('answers an action at any scope, and nothing for one not held', () => {
    expect(idx.hasAction('account:read')).toBe(true)
    expect(idx.hasAction('proxy:manage')).toBe(true)
    expect(idx.hasAction('account:delete')).toBe(false)
  })

  it('keeps "every row" checks at every row', () => {
    expect(idx.has('account:read')).toBe(false)
    expect(idx.has('account:own:read')).toBe(true)
    expect(idx.has('proxy:manage:own')).toBe(true)
    expect(idx.has('user:read')).toBe(true)
    expect(idx.has('nonsense:x:group/1')).toBe(false)
  })

  it('lists the scopes held, without those another implies', () => {
    expect(idx.scopes('account:update')).toEqual([{ all: false, own: false, group: 12, id: 0 }])
    expect(idx.scopes('account:delete')).toEqual([])
  })
})

describe('reduceScopes', () => {
  it('drops duplicates and implied scopes', () => {
    const s = (k: string) => parsePermission(`account:read:${k}`)!.scope
    expect(reduceScopes([s('own'), s('own'), s('group/1'), s('group/1/account/2'), s('group/*')])).toEqual([s('own'), s('group/*')])
  })
})

describe('scopeAllowsRow', () => {
  const s = (k: string): Scope => parsePermission(k ? `account:update:${k}` : 'account:update')!.scope
  const row = { id: 125, created_by: 7, group_ids: [12, 13] }

  it.each([
    ['', 7, true],
    ['own', 7, true],
    ['own', 8, false],
    ['account/125', 8, true],
    ['account/126', 8, false],
    ['group/12', 8, true],
    ['group/14', 8, false],
    ['group/*', 8, true],
    ['group/13/account/125', 8, true],
    ['group/14/account/125', 8, false],
    ['group/*/account/125', 8, true]
  ] as const)('%s for user %s: %s', (scope, me, ok) => {
    expect(scopeAllowsRow(s(scope), row, me)).toBe(ok)
  })

  it('needs a group for a group range, and a known creator for own', () => {
    const ungrouped = { id: 125, created_by: null, group_ids: [] }
    expect(scopeAllowsRow(s('group/*'), ungrouped, 7)).toBe(false)
    expect(scopeAllowsRow(s('group/*/account/125'), ungrouped, 7)).toBe(false)
    expect(scopeAllowsRow(s('account/125'), ungrouped, 7)).toBe(true)
    expect(scopeAllowsRow(s('own'), ungrouped, undefined)).toBe(false)
    expect(scopeAllowsRow(s('own'), null, 7)).toBe(false)
  })
})
