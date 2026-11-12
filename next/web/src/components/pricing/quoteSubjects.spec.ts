import { describe, expect, it } from 'vitest'
import { canSimulatePrices, quoteSubjects } from './quoteSubjects'

type Auth = NonNullable<Parameters<typeof quoteSubjects>[0]>
const holding = (...perms: string[]) => ({ has: (perm: string) => perms.includes(perm) }) as unknown as Auth

describe('whom a quote may be for', () => {
  it('is a user for a caller who reads users, a user group for one who reads user groups', () => {
    expect(quoteSubjects(holding('user:read', 'segment:read'))).toEqual(['user', 'segment'])
    expect(quoteSubjects(holding('user:read'))).toEqual(['user'])
    expect(quoteSubjects(holding('segment:read'))).toEqual(['segment'])
    expect(quoteSubjects(holding('price:read'))).toEqual([])
  })
  it('opens the simulator to a caller who reads prices and groups and has someone to quote for', () => {
    expect(canSimulatePrices(holding('price:read', 'group:read', 'segment:read'))).toBe(true)
    expect(canSimulatePrices(holding('price:read', 'group:read', 'user:read'))).toBe(true)
    expect(canSimulatePrices(holding('price:read', 'group:read'))).toBe(false)
    expect(canSimulatePrices(holding('group:read', 'user:read', 'segment:read'))).toBe(false)
    // The groups to quote in are read with group:read: without it the dialog would only be refused.
    expect(canSimulatePrices(holding('price:read', 'user:read', 'segment:read'))).toBe(false)
  })
})
