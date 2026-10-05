// Shows the cause of a failed CCGateway call (docs/CCGATEWAY-DRAFT-RUNTIMES.md):
// a known details.reason through ccgateway.reason.*, an unknown reason as the
// API's English message, otherwise a localized generic (auth.errors.<code>).
import { useI18n } from 'vue-i18n'
import { isApiError } from '@sub2api/host'
import { reasonDisplay } from './ccgAuthFlow'

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
