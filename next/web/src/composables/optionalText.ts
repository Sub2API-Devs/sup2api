import { useI18n } from 'vue-i18n'

/**
 * Translates a code whose key may not exist: `te(key) ? t(key, params) : fallback`
 * (fallback defaults to the key's last segment). Status, reason and kind labels
 * use it so a code the core adds later is shown as it is instead of as a key.
 */
export function useOptionalT(): (key: string, params?: Record<string, unknown>, fallback?: string) => string {
  const { t, te } = useI18n()
  return (key, params, fallback) => {
    if (te(key)) return t(key, params as never)
    return fallback ?? key.slice(key.lastIndexOf('.') + 1)
  }
}
