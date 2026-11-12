// The user groups (segments) of the users page: the list's filter, and what
// moving users from one to another changes.
import { ref, type Ref } from 'vue'
import type { SelectOption } from '@sub2api/ui'
import type { User } from '@/api/types'
import type { Segment } from '@/api/pricing'
import { useSegmentsLookup } from '@/components/pricing/segmentLookup'
import { useAuthStore } from '@/stores/auth'

/** The named segments when the caller may list them (segment:read), none otherwise. */
export function useNamedSegments(): Ref<Segment[]> {
  return useAuthStore().has('segment:read') ? useSegmentsLookup().segments : ref([])
}

/** The ?segment= value of GET /users that matches every personal segment. */
export const PERSONAL_FILTER = 'personal'

/** The segment filter of the users list. Ids are strings, as the address bar hands them over. */
export function segmentFilterOptions(segments: Segment[], labels: { all: string; personal: string }): SelectOption[] {
  return [{ value: '', label: labels.all }, ...segments.map((s) => ({ value: String(s.id), label: s.name })), { value: PERSONAL_FILTER, label: labels.personal }]
}

/** What moving users to a named segment changes. */
export interface MoveImpact {
  /** The users who are not in it yet. */
  ids: number[]
  /** How many of them lose a personal segment, settings included. */
  personal: number
}

export function moveImpact(users: User[], target: number | null): MoveImpact {
  const moving = users.filter((u) => u.segment?.id !== target)
  return { ids: moving.map((u) => u.id), personal: moving.filter((u) => u.segment?.kind === 'personal').length }
}
