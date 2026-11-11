import { describe, expect, it } from 'vitest'
import { hasOwnRate, myGroupLabel, myRate } from './myGroup'

describe('a group as its caller gets it', () => {
  it('takes the rate of the caller, else the default of the group', () => {
    expect(myRate({ rate_multiplier: '1', effective_rate: '0.72' })).toBe('0.72')
    expect(myRate({ rate_multiplier: '1.5' })).toBe('1.5')
    // A free group: a rate of zero is a rate of its own.
    expect(myRate({ rate_multiplier: 1, effective_rate: '0' })).toBe('0')
  })

  it('tells a rate of the caller from the default by value, not by spelling', () => {
    expect(hasOwnRate({ rate_multiplier: '1', effective_rate: '0.9' })).toBe(true)
    expect(hasOwnRate({ rate_multiplier: 1, effective_rate: '1.0' })).toBe(false)
    expect(hasOwnRate({ rate_multiplier: '1.5' })).toBe(false)
  })

  it('labels a choice by name and rate, and marks a private group granted to the caller', () => {
    expect(myGroupLabel({ name: 'default', rate_multiplier: '1', effective_rate: '0.9' }, 'exclusive')).toBe('default · ×0.9')
    expect(myGroupLabel({ name: 'vip', rate_multiplier: '0.8', effective_rate: '0.72', exclusive: true }, 'exclusive')).toBe('vip · ×0.72 · exclusive')
    expect(myGroupLabel({ name: 'old', rate_multiplier: '2', exclusive: false }, 'exclusive')).toBe('old · ×2')
  })
})
