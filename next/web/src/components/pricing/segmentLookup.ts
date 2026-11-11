import { ref } from 'vue'
import type { Segment } from '@/api/pricing'
import { fetchFirstPage } from '@/composables/lookups'

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
