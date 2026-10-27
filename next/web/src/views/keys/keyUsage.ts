import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { UsageSummaryRow } from '@/api/types'
import { rangeBounds } from '@sub2api/ui'
import { startOfToday } from '@/utils/format'
import { notifyError } from '@/utils/errors'

/**
 * Requests and cost of one API key: today and the last 30 days (local
 * calendar days, the dashboard's windows). Not "since it exists": that would
 * scan the whole usage history of every key on each visit.
 */
export interface KeyUsage {
  today?: UsageSummaryRow
  last30d?: UsageSummaryRow
}

const summary = (from: string) => api.get<UsageSummaryRow[]>('/me/usage/summary', { group_by: 'api_key', from })
const byKey = (rows: UsageSummaryRow[] | null) => new Map((rows || []).map((r) => [r.key, r]))

/** Usage of the caller's API keys (GET /me/usage/summary?group_by=api_key). */
export function useKeyUsage() {
  const usage = ref(new Map<string, KeyUsage>())
  async function load() {
    try {
      const [today, last30d] = (await Promise.all([summary(startOfToday().toISOString()), summary(rangeBounds('30d').from)])).map(byKey)
      usage.value = new Map([...last30d.keys()].map((k) => [k, { today: today.get(k), last30d: last30d.get(k) }]))
    } catch (e) {
      notifyError(e)
    }
  }
  const of = (id: number): KeyUsage => usage.value.get(String(id)) ?? {}
  return { load, of }
}
