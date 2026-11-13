import { describe, expect, it } from 'vitest'
import { P, PERMISSIONS, ROLE_KEY_PATTERN, SCOPE_TYPE } from './permissions'

// The generated catalog is consistent with itself (the Go golden test keeps it
// in step with the core).
describe('generated permissions', () => {
  it('lists every key once, with metadata', () => {
    const keys = Object.values(P)
    expect(new Set(keys).size).toBe(keys.length)
    expect(Object.keys(PERMISSIONS).sort()).toEqual([...keys].sort())
    for (const meta of Object.values(PERMISSIONS)) {
      for (const r of meta.requires) expect(keys).toContain(r)
      expect(meta.description.en).not.toBe('')
    }
  })

  it('lists the scopable actions with their resource', () => {
    expect(SCOPE_TYPE[P.AccountRead]).toBe('account')
    expect(SCOPE_TYPE[P.ProxyManage]).toBe('proxy')
    expect(PERMISSIONS[P.AccountUpdate].requires).toEqual([P.AccountRead])
  })

  it('matches role keys like the core', () => {
    expect(ROLE_KEY_PATTERN.test('vip_ops')).toBe(true)
    expect(ROLE_KEY_PATTERN.test('Ops')).toBe(false)
    expect(ROLE_KEY_PATTERN.test('a')).toBe(false)
  })
})
