import { ref } from 'vue'
import { reviewEvents, toastError, useModHost } from './host'
import type { ReviewStatus } from './types'

/**
 * Bulk review of checked records (records list, user timeline): `checked`
 * binds to the table selection (suspicious records only, the backend
 * updates no others); `done` updates the caller's rows.
 */
export function useBulkReview(done: (ids: number[], status: ReviewStatus) => void) {
  const host = useModHost()
  const checked = ref<number[]>([])
  const reviewing = ref(false)

  async function review(status: ReviewStatus) {
    const ids = [...checked.value]
    if (!ids.length) return
    reviewing.value = true
    try {
      const r = await reviewEvents(ids, status)
      done(ids, status)
      checked.value = []
      host.toast(host.t('review.done', { n: r?.updated ?? ids.length }), 'success')
    } catch (e) {
      toastError(e)
    } finally {
      reviewing.value = false
    }
  }

  return { checked, reviewing, review }
}
