import { describe, expect, it } from 'vitest'
import { uiMessages } from '@sub2api/ui'

// Locale checks the ESLint i18n plugin cannot do on TypeScript locale modules:
// zh/en parity per namespace and existence of every literal key used in code.

type Tree = Record<string, unknown>
const modules = import.meta.glob<{ default: Tree }>('./locales/*/*.ts', { eager: true })

function leaves(v: unknown, prefix = ''): string[] {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.entries(v as Tree).flatMap(([k, x]) => leaves(x, prefix ? `${prefix}.${k}` : k))
  }
  return [prefix]
}

const byLocale: Record<string, Tree> = { zh: {}, en: {} }
for (const [path, mod] of Object.entries(modules)) {
  const [, locale, ns] = /\.\/locales\/([^/]+)\/([^/]+)\.ts$/.exec(path)!
  ;(byLocale[locale] ||= {})[ns] = mod.default
}
byLocale.zh.ui = uiMessages.zh
byLocale.en.ui = uiMessages.en

describe('locales', () => {
  it('zh and en define the same namespaces and keys', () => {
    expect(Object.keys(byLocale.zh).sort()).toEqual(Object.keys(byLocale.en).sort())
    for (const ns of Object.keys(byLocale.en)) {
      expect(leaves(byLocale.zh[ns], ns).sort(), ns).toEqual(leaves(byLocale.en[ns], ns).sort())
    }
  })

  it('every literal t() key used in source exists', () => {
    const sources = import.meta.glob<string>(['/src/**/*.{vue,ts}', '/packages/ui/src/**/*.{vue,ts}', '!/src/**/*.spec.ts', '!/src/i18n/locales/**'], {
      query: '?raw',
      import: 'default',
      eager: true
    })
    const known = new Set(leaves(byLocale.en))
    // Prefixes of known keys: t('a.b') may legitimately address a subtree (tm / rt).
    const prefixes = new Set<string>()
    for (const k of known) {
      const parts = k.split('.')
      for (let i = 1; i < parts.length; i++) prefixes.add(parts.slice(0, i).join('.'))
    }
    const missing: string[] = []
    const re = /(?<![\w$.])(?:\$?t|te|tm)\(\s*'([a-zA-Z][\w-]*(?:\.[\w-]+)+)'/g
    for (const [file, text] of Object.entries(sources)) {
      for (const m of text.matchAll(re)) {
        const key = m[1]
        if (!known.has(key) && !prefixes.has(key)) missing.push(`${file}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})
