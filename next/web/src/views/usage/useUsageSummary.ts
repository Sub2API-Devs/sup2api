import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { api } from '@sub2api/host'
import type { UsageSummaryRow } from '@/api/types'

/**
 * GET <path>?group_by=<groupBy> under the list's filters, reloaded whenever
 * they change while `enabled` holds (a closed panel costs no query). A slow
 * answer to an older filter never overwrites a newer one.
 */
export function useUsageSummary(path: string, filters: Record<string, unknown>, groupBy: 'day' | 'ip', enabled: MaybeRefOrGetter<boolean> = true) {
  const rows = ref<UsageSummaryRow[]>([])
  const loading = ref(false)
  let seq = 0

  async function reload() {
    if (!toValue(enabled)) return
    const my = ++seq
    loading.value = true
    try {
      const r = await api.get<UsageSummaryRow[] | { items?: UsageSummaryRow[] }>(path, { ...filters, group_by: groupBy })
      if (my === seq) rows.value = Array.isArray(r) ? r : r?.items || []
    } catch {
      if (my === seq) rows.value = []
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch([() => ({ ...filters }), () => toValue(enabled)], reload, { deep: true, immediate: true })
  return { rows, loading, reload }
}
