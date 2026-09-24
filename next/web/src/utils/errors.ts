import { ApiError, isApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import { toast } from '@sub2api/ui'

/** Human readable, localized error message. */
export function errorMessage(e: unknown): string {
  const t = i18n.global.t
  if (isApiError(e)) {
    const fallback = t(`auth.errors.${e.code}`)
    const base = e.message && e.message !== e.code ? e.message : fallback
    return base
  }
  if (e instanceof TypeError) return t('auth.errors.network')
  if (e instanceof Error) return e.message
  return String(e)
}

/** Shows an error toast unless it is a cancelled step-up / auth redirect. */
export function notifyError(e: unknown) {
  if (isApiError(e) && (e.code === 'unauthenticated' || e.code === 'step_up_required')) return
  if (e instanceof DOMException && e.name === 'AbortError') return
  toast(errorMessage(e), 'error')
}

/**
 * Extracts field errors of an invalid_argument error. `strip` removes a
 * prefix such as "credentials." so plugin form fields line up.
 */
export function fieldErrors(e: unknown, strip?: string): Record<string, string> {
  if (!(e instanceof ApiError) || e.code !== 'invalid_argument') return {}
  if (!strip) return { ...e.fields }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(e.fields)) {
    if (k.startsWith(strip)) out[k.slice(strip.length)] = v
  }
  return out
}
