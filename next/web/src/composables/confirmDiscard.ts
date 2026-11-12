import { confirm } from '@sub2api/ui'
import { i18n } from '@/i18n'

/**
 * Leaving an editor: asks first when it holds unsaved changes (`dirty`), in
 * the same words everywhere. Resolves true when there is nothing to lose or
 * the user gives it up; false keeps the editor open.
 */
export async function confirmDiscard(dirty: boolean | undefined): Promise<boolean> {
  if (!dirty) return true
  const { t } = i18n.global
  return confirm({ title: t('common.unsaved.title'), message: t('common.unsaved.message'), cancelText: t('common.unsaved.stay'), confirmText: t('common.unsaved.discard'), danger: true })
}
