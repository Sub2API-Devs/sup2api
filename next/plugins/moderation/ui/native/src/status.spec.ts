import { describe, expect, it } from 'vitest'
import { watchNew } from './status'

describe('watchNew', () => {
  it('counts the enforce-level entries with new hits, absent before 0.8.0', () => {
    expect(watchNew({ watching: 4, watching_with_new: 0, blocking: 9, blocking_with_new: 3 })).toEqual({ watching: 0, blocking: 3, total: 3 })
    expect(watchNew({ watching: 4, watching_with_new: 2, blocking: 9, blocking_with_new: 0 })).toEqual({ watching: 2, blocking: 0, total: 2 })
    expect(watchNew({ watching: 4, watching_with_new: 2, blocking: 9 })).toEqual({ watching: 2, blocking: null, total: 2 })
  })
})
