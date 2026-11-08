import { describe, expect, it } from 'vitest'
import messages from './messages'
import { KNOWN_PLANS } from './flow'

// zh and en must have the same keys (a missing one shows the raw key).
const keys = (o: unknown, prefix = ''): string[] =>
  o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k)) : [prefix]

describe('messages', () => {
  it('zh and en have the same keys', () => {
    const zh = new Set(keys(messages.zh))
    const en = new Set(keys(messages.en))
    expect([...zh].filter((k) => !en.has(k))).toEqual([])
    expect([...en].filter((k) => !zh.has(k))).toEqual([])
  })

  it('names every known plan', () => {
    for (const lang of [messages.zh, messages.en]) expect(KNOWN_PLANS.filter((p) => !(p in lang.plan))).toEqual([])
  })

  it('keeps vue-i18n special characters out of plain text', () => {
    // {name} placeholders are fine; a lone @ or | would be parsed as syntax.
    const leaves = (o: unknown): string[] => (o && typeof o === 'object' ? Object.values(o).flatMap(leaves) : [String(o)])
    for (const lang of [messages.zh, messages.en]) expect(leaves(lang).filter((s) => /[@|]/.test(s))).toEqual([])
  })
})
