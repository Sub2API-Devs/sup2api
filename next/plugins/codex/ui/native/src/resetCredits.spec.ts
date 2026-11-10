import { describe, expect, it } from 'vitest'
import { anyFull, availableCredits, unixMs, usageWindows } from './resetCredits'

describe('resetCredits helpers', () => {
  it('keeps only the available credits, in the order the plugin sent', () => {
    const credits = [
      { id: 'a', title: '', description: '', status: 'redeemed', granted_at: 1, expires_at: null },
      { id: 'b', title: '', description: '', status: 'available', granted_at: 1, expires_at: 10 },
      { id: 'c', title: '', description: '', status: 'redeeming', granted_at: 1, expires_at: 5 },
      { id: 'd', title: '', description: '', status: 'available', granted_at: 1, expires_at: null }
    ]
    expect(availableCredits({ available_count: 2, credits }).map((c) => c.id)).toEqual(['b', 'd'])
    expect(availableCredits(null)).toEqual([])
  })

  it('reads the 5 h and weekly windows in that order and marks the used-up ones', () => {
    const ws = usageWindows({
      windows: [
        { key: '7d', utilization: 63.4, resets_at: 'w' },
        { key: '7d_fable', utilization: 100, resets_at: null },
        { key: '5h', utilization: 100, resets_at: 'h' }
      ]
    })
    expect(ws).toEqual([
      { key: '5h', percent: 100, resetsAt: 'h', full: true },
      { key: '7d', percent: 63, resetsAt: 'w', full: false }
    ])
    expect(anyFull(ws)).toBe(true)
  })

  it('does not count an unknown or already reset window as used up', () => {
    const ws = usageWindows({
      windows: [
        { key: '5h', utilization: 0, utilization_unknown: true, resets_at: null },
        { key: '7d', utilization: 100, expired: true, resets_at: null }
      ]
    })
    expect(ws.map((w) => [w.percent, w.full])).toEqual([
      [null, false],
      [100, false]
    ])
    expect(anyFull(ws)).toBe(false)
    expect(usageWindows(null)).toEqual([])
  })

  it('turns Unix seconds into milliseconds, leaving absent times null', () => {
    expect(unixMs(1700000000)).toBe(1700000000000)
    expect(unixMs(0)).toBeNull()
    expect(unixMs(null)).toBeNull()
  })
})
