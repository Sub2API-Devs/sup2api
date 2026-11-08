import { describe, expect, it } from 'vitest'
import { describeDraft, describeItemSentence, describeStored, partsSentence } from './describe'
import type { Rule, Strategy } from './host'
import { readItems } from './items'
import { DEFAULT_RULES_JSON, DEFAULT_STRATEGIES_JSON } from './items.fixture'
import messages from './messages'

// A translator over the plugin's messages, as host.t resolves plugin keys.
function translator(lang: 'zh' | 'en') {
  return (key: string, params: Record<string, unknown> = {}) => {
    const msg = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages[lang])
    if (typeof msg !== 'string') throw new Error(`missing message ${key}`)
    return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k]))
  }
}
const zh = translator('zh')

const rules: Rule[] = JSON.parse(DEFAULT_RULES_JSON)
const strategies: Strategy[] = JSON.parse(DEFAULT_STRATEGIES_JSON)

describe('describe', () => {
  it('describes the 5 default items', () => {
    const rows = readItems(rules, strategies).map(e => describeDraft(e.draft!, zh))
    expect(rows.map(r => r.trigger)).toEqual([
      '错误率 ≥ 30%',
      '首字耗时 P95 ≥ 10 s',
      '首字耗时 P100 ≥ 60 s 或 整次耗时 P100 ≥ 120 s（仅非流式）',
      '错误率 < 15% 且 首字耗时 P95 < 10 s 且 首字耗时 P100 < 60 s 且 整次耗时 P100 < 120 s（仅非流式）',
      '有效权重 ≤ 0'
    ])
    expect(rows.map(r => r.windows)).toEqual([
      '最近 3 个窗口中 2 次',
      '最近 3 个窗口中 2 次',
      '当前窗口命中即触发',
      '当前窗口命中即触发 · 3 个条件无样本时视为满足',
      '最近 2 个窗口中 2 次'
    ])
    expect(rows.map(r => r.actions)).toEqual([
      ['权重降低 30%（按当前）', '清理 30% 粘性会话'],
      ['权重降低 30%（按当前）', '清理 30% 粘性会话'],
      ['权重降低 50%（按当前）', '清理 30% 粘性会话'],
      ['权重抬高 10%（按基准）'],
      ['权重抬高 10%（按基准）']
    ])
    expect(rows.map(r => r.direction)).toEqual(['degrade', 'degrade', 'degrade', 'climb', 'climb'])
    expect(rows[0].types).toEqual(['weight_degrade', 'affinity_clear'])
  })

  it('writes an item as one sentence', () => {
    expect(describeItemSentence(strategies[0], rules, zh)).toBe(
      '错误率 ≥ 30% · 最近 3 个窗口中 2 次 → 权重降低 30%（按当前），清理 30% 粘性会话'
    )
    expect(describeItemSentence({ ...strategies[4], cooldown_seconds: 60 }, rules, zh)).toBe(
      '有效权重 ≤ 0 · 最近 2 个窗口中 2 次 → 权重抬高 10%（按基准） · 冷却 60 秒'
    )
    expect(describeItemSentence({ ...strategies[0], when: { all: ['错误率过高', { any: ['首字挂死', '复活探测'] }] } }, rules, zh)).toBe(
      '错误率过高 且 （首字挂死 或 复活探测） → 权重降低 30%（按当前），清理 30% 粘性会话'
    )
  })

  it('formats thresholds, groups, rule scopes and fixed amounts', () => {
    const [entry] = readItems(
      [
        {
          name: 'r',
          scope: 'stream',
          conditions: [
            { metric: 'ttfb', p: 90, op: 'gte', value: 1500 },
            { join: 'and', metric: 'error_rate', op: 'gt', value: 5 },
            { join: 'or', metric: 'latency', p: 99, op: 'lt', value: 2000, scope: 'non_stream' }
          ],
          periods: 1,
          hit_periods: 1
        }
      ],
      [{ name: 's', when: 'r', actions: [{ type: 'weight_degrade', mode: 'fixed', value: 5 }] }]
    )
    const p = describeDraft(entry.draft!, zh)
    expect(p.trigger).toBe('（首字耗时 P90 ≥ 1500 ms 且 错误率 > 5%） 或 整次耗时 P99 < 2 s（仅非流式）')
    expect(p.scope).toBe('仅流式')
    expect(partsSentence(p, zh)).toBe(
      '仅流式 · （首字耗时 P90 ≥ 1500 ms 且 错误率 > 5%） 或 整次耗时 P99 < 2 s（仅非流式） · 当前窗口命中即触发 → 权重降低 5'
    )
  })

  it('has English sentences too', () => {
    const en = translator('en')
    const p = describeStored(strategies[3], en)
    expect(p.actions).toEqual(['weight +10% (of base)'])
    expect(describeItemSentence({ ...strategies[0], when: { all: ['a', { any: ['b', 'c'] }] } }, rules, en)).toBe(
      'a and (b or c) → weight −30% (of current), clear 30% of sticky sessions'
    )
    expect(describeItemSentence(strategies[1], rules, en)).toBe(
      'First token P95 ≥ 10 s · 2 of the last 3 windows → weight −30% (of current), clear 30% of sticky sessions'
    )
  })
})

// zh and en must have the same keys (a missing one shows the raw key).
const keys = (o: unknown, prefix = ''): string[] =>
  o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k)) : [prefix]

describe('messages-items', () => {
  it('zh and en have the same keys', () => {
    const z = new Set(keys(messages.zh.it))
    const e = new Set(keys(messages.en.it))
    expect([...z].filter(k => !e.has(k))).toEqual([])
    expect([...e].filter(k => !z.has(k))).toEqual([])
  })
})
