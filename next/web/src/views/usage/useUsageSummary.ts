import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { api } from '@sub2api/host'
import type { UsageSummaryRow } from '@/api/types'
import { browserTZ } from '@/components/stats/stats'

/**
 * GET <path>?group_by=<groupBy>&tz=<browser time zone> under the list's
 * filters, reloaded whenever they (or groupBy) change while `enabled` holds
 * (a closed panel costs no query). A slow answer to an older filter never
 * overwrites a newer one; a failure is kept in `error` so the page can show
 * it instead of zeros.
 */
export function useUsageSummary(
  path: string,
  filters: Record<string, unknown>,
  groupBy: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
  /** More query parameters (order, limit), watched like the filters. */
  extra: MaybeRefOrGetter<Record<string, unknown>> = {}
) {
  const rows = ref<UsageSummaryRow[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  let seq = 0

  async function reload() {
    if (!toValue(enabled)) return
    const my = ++seq
    loading.value = true
    error.value = null
    try {
      const r = await api.get<UsageSummaryRow[] | { items?: UsageSummaryRow[] }>(path, { ...filters, ...toValue(extra), group_by: toValue(groupBy), tz: browserTZ() })
      if (my === seq) rows.value = Array.isArray(r) ? r : r?.items || []
    } catch (e) {
      if (my === seq) {
        rows.value = []
        error.value = e
      }
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch([() => ({ ...filters }), () => toValue(groupBy), () => toValue(enabled), () => ({ ...toValue(extra) })], reload, { deep: true, immediate: true })
  return { rows, loading, error, reload }
}
