import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { formatWindow, joinWindow, splitWindow, unitMax, validWindow, windowOf } from './spmWindow'

describe('session window', () => {
  it('splits seconds into whole hours or minutes and joins them back', () => {
    expect(splitWindow(300)).toEqual({ value: 5, unit: 'minute' })
    expect(splitWindow(7200)).toEqual({ value: 2, unit: 'hour' })
    expect(splitWindow(90)).toEqual({ value: 1.5, unit: 'minute' })
    expect(splitWindow(null, 'hour')).toEqual({ value: null, unit: 'hour' })
    expect(joinWindow({ value: 5, unit: 'minute' })).toBe(300)
    expect(joinWindow({ value: 24, unit: 'hour' })).toBe(86_400)
    expect(joinWindow({ value: null, unit: 'hour' })).toBeNull()
    expect([unitMax('minute'), unitMax('hour')]).toEqual([1440, 24])
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
