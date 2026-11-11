import { ref } from 'vue'
import type { User } from '@/api/types'
import type { Segment, SegmentRef } from '@/api/pricing'
import { fetchFirstPage } from '@/composables/lookups'

/** A user as GET /users returns it: with the segment it belongs to. */
export type SegmentedUser = User & { segment?: SegmentRef }
/** What the personal-segment dialogs need of a user. */
export type PersonalDialogUser = Pick<SegmentedUser, 'id' | 'email' | 'display_name' | 'segment'>

const segments = ref<Segment[]>([])
let segmentsP: Promise<void> | null = null

/** The named segments, cached for selects (as useGroupsLookup). Call with `force` after one was created, renamed or deleted. */
export function useSegmentsLookup(force = false) {
  if (force || !segmentsP) {
    segmentsP = fetchFirstPage<Segment>('/segments')
      .then((items) => {
        segments.value = items
      })
      .catch(() => {
        segmentsP = null
      })
  }
  return { segments, ready: segmentsP }
}
