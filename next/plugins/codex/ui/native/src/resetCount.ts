import { reactive } from 'vue'
import { MAX_ACCOUNT_BATCH } from '@sub2api/host'
import { summarizeResetCredits } from './host'

// The reset count each account list row shows (CodexResetBadge). The rows
// asking in one tick are answered by one POST /reset-credits/summary (per
// MAX_ACCOUNT_BATCH ids), which only reads the plugin's cache: the list
// refreshes every few seconds and must never reach OpenAI. The detail tab
// writes the count it reads live (setResetCount).

const counts = reactive(new Map<number, number>())
const pending = new Set<number>()
let scheduled = false

/** The cached count of an account; undefined when none is known. */
export const resetCount = (id: number) => counts.get(id)

export function setResetCount(id: number, n: number) {
  counts.set(id, n)
}

/** Asks for an account's count; the ids asked for in the same tick share one request. */
export function requestResetCount(id: number) {
  pending.add(id)
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => void flush())
}

async function flush() {
  const ids = [...pending]
  pending.clear()
  scheduled = false
  for (let i = 0; i < ids.length; i += MAX_ACCOUNT_BATCH) await load(ids.slice(i, i + MAX_ACCOUNT_BATCH))
}

async function load(ids: number[]) {
  try {
    const { accounts } = await summarizeResetCredits(ids)
    for (const id of ids) {
      const c = accounts[String(id)]
      if (c) counts.set(id, c.available_count)
      else counts.delete(id)
    }
  } catch {
    // Keep what was shown; the next list refresh asks again.
  }
}
