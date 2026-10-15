// Text of CCGateway states and failures (docs/CCGATEWAY-DRAFT-RUNTIMES.md):
// a known details.reason through ccgateway.reason.*, an unknown reason as the
// API's English message, otherwise a localized generic (auth.errors.<code>).
import { useI18n } from 'vue-i18n'
import { isApiError } from '@sub2api/host'
import { knownReason, knownStatus, reasonDisplay, reasonOf } from './ccgAuthFlow'

/** A failure as the panels show it: the translated cause and its reason code (data-reason). */
export interface CcgFailure {
  detail: string
  reason: string
}

export function useCcgError(): (e: unknown) => string {
  const { t, te } = useI18n()
  return (e: unknown) => {
    const d = reasonDisplay(e)
    if (d) return 'key' in d ? t(d.key) : d.message
    if (isApiError(e)) return te(`auth.errors.${e.code}`) ? t(`auth.errors.${e.code}`) : e.message
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return t('ccgateway.accountAuth.timeout')
    if (e instanceof TypeError) return t('auth.errors.network')
    return e instanceof Error ? e.message : ''
  }
}

/** Status and reason codes translated; unknown codes are shown as they are. */
export function useCcgText() {
  const { t } = useI18n()
  const describe = useCcgError()
  /** A container status (GET .../status); an unknown one shows its code. */
  const statusLabel = (s: string | undefined) => {
    const k = knownStatus(s)
    return k ? t(`ccgateway.status.${k}`) : s || t('ccgateway.status.unknown')
  }
  /** A reason code; `fallback` (an i18n key) when there is none. */
  const reasonLabel = (r: string | undefined, fallback?: string) => {
    const k = knownReason(r)
    if (k) return t(`ccgateway.reason.${k}`)
    return r || (fallback ? t(fallback) : '')
  }
  /** Why a container is blocked, as the title of its notice. */
  const blockedTitle = (r: string | undefined) => t('ccgateway.accountAuth.blockedTitle', { reason: reasonLabel(r, 'ccgateway.accountAuth.blockedUnknown') })
  const failureOf = (e: unknown): CcgFailure => ({ detail: describe(e), reason: reasonOf(e) })
  return { describe, statusLabel, reasonLabel, blockedTitle, failureOf }
}
