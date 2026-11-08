import { toast } from '@sub2api/ui'
import type { BulkFailure } from '@/composables/useBulkRun'
import { i18n } from '@/i18n'
import { errorMessage } from '@/utils/errors'

/** Reports a bulk run on accounts: a success toast, or a warning naming the first failure. */
export function bulkToast(ok: number, failed: BulkFailure<{ name: string }>[]) {
  const t = i18n.global.t
  if (!failed.length) return toast(t('accounts.bulk.done', { ok }), 'success')
  const first = failed[0]
  toast(t('accounts.bulk.doneWithErrors', { ok, fail: failed.length, name: first.item.name, error: errorMessage(first.error) }), 'warning')
}
