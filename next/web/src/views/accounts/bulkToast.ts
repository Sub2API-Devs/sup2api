import { toast } from '@sub2api/ui'
import type { BulkFailure } from '@/composables/useBulkRun'
import { errorMessage } from '@/utils/errors'

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Reports a bulk run on accounts: a success toast, or a warning naming the first failure. */
export function bulkToast(t: Translate, ok: number, failed: BulkFailure<{ name: string }>[]) {
  if (!failed.length) return toast(t('accounts.bulk.done', { ok }), 'success')
  const first = failed[0]
  toast(t('accounts.bulk.doneWithErrors', { ok, fail: failed.length, name: first.item.name, error: errorMessage(first.error) }), 'warning')
}
