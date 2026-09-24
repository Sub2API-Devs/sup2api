import { createI18n } from 'vue-i18n'
import { uiMessages } from '@sub2api/ui'

// Messages live in locales/<locale>/<namespace>.ts (default export); the
// file name becomes the top-level namespace, e.g. locales/en/accounts.ts ->
// t('accounts.title'). Every namespace must exist for both zh and en.

export const LOCALES = ['zh', 'en'] as const
export type Locale = (typeof LOCALES)[number]

const modules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/*.ts', { eager: true })

const messages: Record<string, Record<string, unknown>> = { zh: {}, en: {} }
for (const [path, mod] of Object.entries(modules)) {
  const m = /\.\/locales\/([^/]+)\/([^/]+)\.ts$/.exec(path)
  if (!m) continue
  const [, locale, ns] = m
  ;(messages[locale] ||= {})[ns] = mod.default
}
for (const l of LOCALES) messages[l].ui = uiMessages[l]

const LOCALE_KEY = 's2a.locale'

function initialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: messages as any,
  missingWarn: false,
  fallbackWarn: false
})

export function setLocale(l: Locale) {
  i18n.global.locale.value = l
  localStorage.setItem(LOCALE_KEY, l)
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale
}

/** Picks the current locale from {"en","zh"} (or a bare string), falling back to en. */
export function lt(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const o = v as Record<string, string>
    return o[currentLocale()] || o.en || Object.values(o)[0] || ''
  }
  return String(v)
}

/** Merges messages under a namespace path such as "plugin.guard". */
export function addMessages(namespace: string, byLocale: Record<string, Record<string, unknown>>) {
  for (const [locale, msgs] of Object.entries(byLocale)) {
    const nested: Record<string, unknown> = {}
    let cur = nested
    const parts = namespace.split('.')
    parts.forEach((p, i) => {
      cur[p] = i === parts.length - 1 ? msgs : {}
      cur = cur[p] as Record<string, unknown>
    })
    i18n.global.mergeLocaleMessage(locale, nested as any)
  }
}
