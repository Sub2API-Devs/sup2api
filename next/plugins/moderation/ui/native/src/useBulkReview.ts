import { ref } from 'vue'
import { errorMessage, reviewEvents, useModHost, type ReviewStatus } from './host'

/**
 * Bulk review of checked records (records list, user timeline): `checked`
 * binds to the table selection; `done` updates the caller's rows.
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
      await reviewEvents(ids, status)
      done(ids, status)
      checked.value = []
      host.toast(host.t('review.done', { n: ids.length }), 'success')
    } catch (e) {
      host.toast(errorMessage(e, host.t('actionFailed')), 'error')
    } finally {
      reviewing.value = false
    }
  }

  return { checked, reviewing, review }
}
