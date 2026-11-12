import { describe, expect, it } from 'vitest'
import { inheritedRate, validRate } from './pricingFormat'

describe('a rate typed in a form', () => {
  it('is a decimal of 0 or more with at most four decimals', () => {
    expect(['0', '1', ' 0.8 ', '1.2345'].every(validRate)).toBe(true)
    expect(['', null, undefined, '-1', '0.', '.5', 'x', '1.23456'].some(validRate)).toBe(false)
  })
  it('stays below 1000000, as the server keeps it', () => {
    expect(validRate('999999.9999')).toBe(true)
    expect(validRate('1000000')).toBe(false)
  })
})

describe('the rate a segment inherits', () => {
  const rate = (group_default: string, discount: string) => inheritedRate({ group_default, discount })

  it('is the default of the group times the discount', () => {
    expect(rate('1.2', '0.9')).toBe(1.08)
    expect(rate('1.2', '1')).toBe(1.2)
  })
  it('keeps four decimals, rounded half up as the server rounds', () => {
    expect(rate('0.3333', '0.3333')).toBe(0.1111)
    expect(rate('0.5125', '0.5')).toBe(0.2563)
    expect(rate('0.0001', '0.4')).toBe(0)
  })
  it('is capped at the largest rate', () => {
    expect(rate('999999', '2')).toBe(999999.9999)
  })
})
