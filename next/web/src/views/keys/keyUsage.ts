import { ref } from 'vue'
import { api } from '@sub2api/host'
import type { UsageSummaryRow } from '@/api/types'
import { startOfToday } from '@/utils/format'
import { notifyError } from '@/utils/errors'

/** Requests and cost of one API key: today (local day) and since it exists. */
export interface KeyUsage {
  today?: UsageSummaryRow
  total?: UsageSummaryRow
}

const summary = (from: Date) => api.get<UsageSummaryRow[]>('/me/usage/summary', { group_by: 'api_key', from: from.toISOString() })
const byKey = (rows: UsageSummaryRow[] | null) => new Map((rows || []).map((r) => [r.key, r]))

/** Usage of the caller's API keys (GET /me/usage/summary?group_by=api_key). */
export function useKeyUsage() {
  const usage = ref(new Map<string, KeyUsage>())
  async function load() {
    try {
      const [today, total] = (await Promise.all([summary(startOfToday()), summary(new Date(0))])).map(byKey)
      usage.value = new Map([...total.keys()].map((k) => [k, { today: today.get(k), total: total.get(k) }]))
    } catch (e) {
      notifyError(e)
    }
  }
  const of = (id: number): KeyUsage => usage.value.get(String(id)) ?? {}
  return { load, of }
}
