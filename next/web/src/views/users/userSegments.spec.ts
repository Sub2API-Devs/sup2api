import { describe, expect, it } from 'vitest'
import type { Segment, SegmentRef } from '@/api/pricing'
import type { User } from '@/api/types'
import { PERSONAL_FILTER, moveImpact, segmentFilterOptions } from './userSegments'

const vip: SegmentRef = { id: 2, kind: 'named', name: 'VIP' }
const user = (id: number, segment?: SegmentRef): User => ({ id, email: `u${id}@example.com`, display_name: '', status: 'active', segment })
const personalOf = (u: number): SegmentRef => ({ id: 100 + u, kind: 'personal', name: `u${u}@example.com`, user_id: u })

describe('segmentFilterOptions', () => {
  it('lists all, each named segment by a string id, then the personal ones', () => {
    const segments = [{ ...vip, id: 1, name: 'Default' }, vip] as Segment[]
    expect(segmentFilterOptions(segments, { all: 'All', personal: 'Personal' })).toEqual([
      { value: '', label: 'All' },
      { value: '1', label: 'Default' },
      { value: '2', label: 'VIP' },
      { value: PERSONAL_FILTER, label: 'Personal' }
    ])
  })
})

describe('moveImpact', () => {
  const users = [user(1, vip), user(2, { id: 1, kind: 'named', name: 'Default' }), user(3, personalOf(3)), user(4)]

  it('leaves out the users already in the target', () => {
    expect(moveImpact(users, vip.id)).toEqual({ ids: [2, 3, 4], personal: 1 })
  })

  it('counts every personal user: none of them is in a named segment', () => {
    expect(moveImpact([user(3, personalOf(3)), user(5, personalOf(5))], 1)).toEqual({ ids: [3, 5], personal: 2 })
  })

  it('moves everyone while no target is chosen', () => {
    expect(moveImpact(users, null).ids).toEqual([1, 2, 3, 4])
  })
})
