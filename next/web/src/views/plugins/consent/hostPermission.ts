import type { HostPermissionReview } from '@/api/types'
import type { Risk } from '../pluginUtil'

/** One host permission of the review, with the caller's rights and the diff tag. */
export interface HPRow extends HostPermissionReview {
  risk: Risk
  requiredPerm: string | null
  allowed: boolean
  locked: boolean
  diffTag: 'added' | 'widened' | null
}
