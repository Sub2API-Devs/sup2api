import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HostPermissionReview } from '@/api/types'
import { useOptionalT } from '@/composables/optionalText'
import { hpKey, type Risk } from '../pluginUtil'

/** One host permission of the review, with the caller's rights and the diff tag. */
export interface HPRow extends HostPermissionReview {
  risk: Risk
  requiredPerm: string | null
  allowed: boolean
  locked: boolean
  diffTag: 'added' | 'widened' | null
}

/**
 * Labels shared by the consent page, its host permission table and the plugin
 * detail's grants tab: the ":" between a label and its value, and the display
 * name of a host permission (an id the core added later is shown as it is).
 */
export function useConsentLabels() {
  const { t } = useI18n()
  const tr = useOptionalT()
  return {
    colon: computed(() => t('plugins.colon')),
    hpLabel: (id: string) => tr(`plugins.hp.${hpKey(id)}`, undefined, id)
  }
}
