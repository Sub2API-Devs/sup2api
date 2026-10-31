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

/** Shows an error toast unless it is an auth redirect or an aborted request. */
export function notifyError(e: unknown) {
  if (isApiError(e) && e.code === 'unauthenticated') return
  if (e instanceof DOMException && e.name === 'AbortError') return
  toast(errorMessage(e), 'error')
}

/**
 * i18n keys of the field error codes a page knows: code → key. A code that is
 * not listed shows the server's message (it may be English only).
 */
export type FieldCodeMessages = Record<string, string>

/**
 * Extracts field errors of an invalid_argument error. `strip` removes a
 * prefix such as "credentials." so plugin form fields line up. With `codes`,
 * a field whose code is listed shows that translation instead of the
 * server's message.
 */
export function fieldErrors(e: unknown, strip?: string, codes?: FieldCodeMessages): Record<string, string> {
  if (!(e instanceof ApiError) || e.code !== 'invalid_argument') return {}
  const t = i18n.global.t
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(e.fields)) {
    if (strip && !k.startsWith(strip)) continue
    const key = codes?.[e.fieldCodes?.[k] ?? '']
    out[strip ? k.slice(strip.length) : k] = key ? t(key) : v
  }
  return out
}
