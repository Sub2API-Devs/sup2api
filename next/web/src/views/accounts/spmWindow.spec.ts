import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { formatWindow, joinWindow, splitWindow, unitRange, validWindow, windowOf } from './spmWindow'

describe('session window', () => {
  it('splits seconds into whole hours, minutes or seconds and joins whole numbers back', () => {
    expect(splitWindow(300)).toEqual({ value: 5, unit: 'minute' })
    expect(splitWindow(7200)).toEqual({ value: 2, unit: 'hour' })
    expect(splitWindow(90)).toEqual({ value: 90, unit: 'second' })
    expect(splitWindow(null, 'hour')).toEqual({ value: null, unit: 'hour' })
    expect(joinWindow({ value: 5, unit: 'minute' })).toBe(300)
    expect(joinWindow({ value: 24, unit: 'hour' })).toBe(86_400)
    expect(joinWindow({ value: null, unit: 'hour' })).toBeNull()
    expect(joinWindow({ value: 90, unit: 'second' })).toBe(90)
    expect(joinWindow({ value: 1.5, unit: 'minute' })).toBeNaN()
    expect(validWindow(NaN)).toBe(false)
    expect([unitRange('second'), unitRange('minute'), unitRange('hour')]).toEqual([
      [60, 86_400],
      [1, 1440],
      [1, 24]
    ])
  })
  it('takes an absent or empty window as 1 minute and accepts 1 minute to 24 hours', () => {
    expect([windowOf(undefined), windowOf(null), windowOf(0), windowOf(600)]).toEqual([60, 60, 60, 600])
    expect([null, undefined, 60, 86_400].every(validWindow)).toBe(true)
    expect([0, 59, 86_401, 90.5].some(validWindow)).toBe(false)
  })
  it('labels a window short in each language', () => {
    const t = i18n.global.t
    i18n.global.locale.value = 'zh'
    expect([300, 3600, 90, undefined].map(s => formatWindow(t, s))).toEqual(['5分', '1小时', '90秒', '1分'])
    i18n.global.locale.value = 'en'
    expect([300, 7200, 90].map(s => formatWindow(t, s))).toEqual(['5m', '2h', '90s'])
  })
})
