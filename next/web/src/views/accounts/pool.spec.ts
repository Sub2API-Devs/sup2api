import { describe, expect, it } from 'vitest'
import { runPool } from './pool'

const tick = (ms = 0) => new Promise((ok) => setTimeout(ok, ms))

describe('runPool', () => {
  it('keeps at most `limit` workers in flight and visits every item once, in order', async () => {
    let inFlight = 0
    let peak = 0
    const started: number[] = []
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      started.push(n)
      inFlight++
      peak = Math.max(peak, inFlight)
      await tick(n % 3)
      inFlight--
    })
    expect(peak).toBe(3)
    expect(started).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('handles empty input, limits above the item count and bad limits', async () => {
    const seen: number[] = []
    await runPool([], 3, async () => void seen.push(0))
    await runPool([1, 2], 10, async (n) => void seen.push(n))
    await runPool([3], 0, async (n) => void seen.push(n))
    expect(seen).toEqual([1, 2, 3])
  })

  it('a failing worker does not stop the others', async () => {
    const seen: number[] = []
    await runPool([1, 2, 3], 2, async (n) => {
      if (n === 1) throw new Error('boom')
      seen.push(n)
    })
    expect(seen).toEqual([2, 3])
  })

  it('stops starting new items once aborted', async () => {
    const ctrl = new AbortController()
    const seen: number[] = []
    await runPool([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n)
      if (n === 2) ctrl.abort()
      await tick()
    }, ctrl.signal)
    expect(seen).toEqual([1, 2])
  })
})
