import { toast } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import type { BulkFailure } from './useBulkRun'

/**
 * Reports a bulk run: a success toast, or a warning naming the first failure.
 * `messages` is where the page keeps the two texts: `<messages>.done` ({ok})
 * and `<messages>.doneWithErrors` ({ok}, {fail}, {name}, {error}).
 */
export function bulkToast(messages: string, ok: number, failed: BulkFailure<{ name: string }>[]) {
  const t = i18n.global.t
  if (!failed.length) return toast(t(`${messages}.done`, { ok }), 'success')
  const first = failed[0]
  toast(t(`${messages}.doneWithErrors`, { ok, fail: failed.length, name: first.item.name, error: errorMessage(first.error) }), 'warning')
}
