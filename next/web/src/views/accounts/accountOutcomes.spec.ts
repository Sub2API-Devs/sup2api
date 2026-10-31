import { describe, expect, it } from 'vitest'
import { formatPercent } from '@/utils/format'
import { successRate, successRateTone } from './accountOutcomes'

describe('account success rate', () => {
  it('rates successes against failed attempts and stays empty without traffic', () => {
    expect(successRate(null)).toBeNull()
    expect(successRate({ success: 0, failed: 0 })).toBeNull()
    expect(successRate({ success: 0, failed: 3 })).toBe(0)
    expect(successRate({ success: 151, failed: 5 })).toBeCloseTo(96.79, 2)
  })

  it('colours by the 99 % / 95 % thresholds', () => {
    expect(successRateTone(null)).toBe('gray')
    expect(successRateTone(99)).toBe('success')
    expect(successRateTone(98.9)).toBe('warning')
    expect(successRateTone(95)).toBe('warning')
    expect(successRateTone(94.9)).toBe('danger')
  })

  it('never rounds a failing account up to 100 %', () => {
    const rate = (success: number, total: number) => formatPercent(success, total, { floor: true })
    expect(rate(0, 0)).toBe('—')
    expect(rate(5, 5)).toBe('100.0%')
    expect(rate(999, 1000)).toBe('99.9%')
    expect(rate(9999, 10000)).toBe('99.9%')
    expect(rate(9996, 10000)).toBe('99.9%')
    expect(rate(1, 3)).toBe('33.3%')
  })
})
