import { describe, expect, it } from 'vitest'
import { levelRefused, WATCH_LEVELS } from './watchLevels'

describe('levelRefused', () => {
  it('refuses only the enforce level, and only for an allowlisted user', () => {
    expect(WATCH_LEVELS.filter((l) => levelRefused(l, true))).toEqual(['enforce'])
    expect(WATCH_LEVELS.filter((l) => levelRefused(l, false))).toEqual([])
    expect(levelRefused('enforce', undefined)).toBe(false)
  })
})
