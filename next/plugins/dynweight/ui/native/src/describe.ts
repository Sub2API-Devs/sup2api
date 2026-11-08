import {
  directionOf,
  readItems,
  whenRefs,
  type Direction,
  type ItemDraft,
  type ListProblem,
  type Problem,
  type ReadonlyReason
} from './items'
import { percentileMetric, type Action, type ActionType, type Condition, type Rule, type Scope, type Strategy, type When } from './host'

// Sentences of the adjustment items: the trigger ("错误率 ≥ 30%"), its
// windows ("最近 3 个窗口中 2 次"), the actions ("权重降低 30%（按当前）")
// and the cooldown. The table, the editor's preview and the group diff of
// the configuration page all read them, so an item says the same everywhere.

export type Translate = (key: string, params?: Record<string, unknown>) => string

/** A threshold with its unit: "30%", "10 s" (whole seconds from 1000 ms), "1500 ms", "0". */
function threshold(c: Condition): string {
  if (c.metric === 'error_rate') return `${c.value}%`
  if (c.metric === 'weight') return String(c.value)
  return c.value >= 1000 && c.value % 1000 === 0 ? `${c.value / 1000} s` : `${c.value} ms`
}

/** One condition: "首字耗时 P95 ≥ 10 s", with "（仅非流式）" when it counts other requests than its rule. */
export function describeCondition(c: Condition, scope: Scope, t: Translate): string {
  const p = percentileMetric(c.metric) ? ` P${c.p ?? '?'}` : ''
  const text = `${t(`metric.${c.metric}`)}${p} ${t(`op.${c.op}`)} ${threshold(c)}`
  return c.scope && c.metric !== 'weight' && c.scope !== (scope || 'all') ? t('it.d.scoped', { text, scope: t(`scope.${c.scope}`) }) : text
}

/** The conditions as one sentence: "且" binds before "或", so a group of several among several groups is put in parentheses. */
export function describeConditions(conditions: Condition[], scope: Scope, t: Translate): string {
  const groups: string[][] = []
  conditions.forEach((c, j) => {
    if (j === 0 || c.join === 'or') groups.push([])
    groups[groups.length - 1].push(describeCondition(c, scope, t))
  })
  const and = ` ${t('join.and')} `
  const many = groups.length > 1
  return groups.map(g => (many && g.length > 1 ? t('it.paren', { text: g.join(and) }) : g.join(and))).join(` ${t('join.or')} `)
}

/** "最近 3 个窗口中 2 次", or "当前窗口命中即触发" for 1 / 1. */
export function describeWindows(periods: number | null, hits: number | null, t: Translate): string {
  return periods === 1 && hits === 1 ? t('it.d.windowNow') : t('it.d.windows', { n: periods ?? '?', m: hits ?? '?' })
}

/** "权重降低 30%（按当前）", "权重抬高 5", "清理 30% 粘性会话". */
export function describeAction(a: Action, t: Translate): string {
  if (a.type === 'affinity_clear') return t('it.d.clear', { v: a.percent ?? '?' })
  const v = `${a.value ?? '?'}${a.mode === 'fixed' ? '' : '%'}`
  return t(a.type === 'weight_climb' ? 'it.d.climb' : 'it.d.degrade', {
    v,
    basis: a.mode && a.mode !== 'fixed' ? t(`it.d.basis.${a.mode}`) : ''
  }).trim()
}

/** The parts of an item row. */
export interface ItemParts {
  direction: Direction | null
  /** The action types in order (the type chips). */
  types: ActionType[]
  /** The conditions sentence; for a read-only item the rules its trigger combines. */
  trigger: string
  /** The windows, and how many conditions hold without samples; '' for a read-only item. */
  windows: string
  /** "仅流式" / "仅非流式" for a rule that counts only those; ''. */
  scope: string
  actions: string[]
  cooldown: string
}

/** A combined trigger in rule names: "错误率过高 且 （首字挂死 或 首字慢）". */
function describeWhen(w: When | null, t: Translate, nested = false): string {
  if (w === null || w === undefined) return ''
  if (typeof w === 'string') return w
  const all = 'all' in w
  const list = (all ? w.all : w.any).map(m => describeWhen(m, t, true))
  const text = list.join(` ${t(all ? 'join.and' : 'join.or')} `)
  return nested && list.length > 1 ? t('it.paren', { text }) : text
}

const actionParts = (actions: Action[], cooldown: number | null | undefined, t: Translate) => ({
  direction: directionOf(actions),
  types: actions.map(a => a.type),
  actions: actions.map(a => describeAction(a, t)),
  cooldown: cooldown ? t('it.d.cooldown', { n: cooldown }) : ''
})

/** The row parts of an editable item. */
export function describeDraft(d: ItemDraft, t: Translate): ItemParts {
  const pass = d.conditions.filter(c => c.when_empty === 'pass').length
  const windows = describeWindows(d.periods, d.hit_periods, t)
  return {
    ...actionParts(d.actions, d.cooldown_seconds, t),
    trigger: describeConditions(d.conditions, d.scope, t),
    windows: pass ? `${windows} · ${t('it.d.passEmpty', { n: pass })}` : windows,
    scope: d.scope !== 'all' ? t(`scope.${d.scope}`) : ''
  }
}

/** The row parts of a read-only item: its trigger in rule names. */
export function describeStored(s: Strategy, t: Translate): ItemParts {
  return {
    ...actionParts(Array.isArray(s.actions) ? s.actions : [], s.cooldown_seconds, t),
    trigger: describeWhen(s.when, t),
    windows: '',
    scope: ''
  }
}

/** Why an item is read-only. */
export function describeReason(r: ReadonlyReason, t: Translate): string {
  return r.kind === 'composite' ? t('it.ro.composite') : t(`it.ro.${r.kind}`, { rule: r.rule })
}

/** One line of row parts: "错误率 ≥ 30% · 最近 3 个窗口中 2 次 → 权重降低 30%（按当前），清理 30% 粘性会话 · 冷却 60 秒". */
export function partsSentence(p: ItemParts, t: Translate): string {
  const trigger = [p.scope, p.trigger, p.windows].filter(Boolean).join(' · ')
  const actions = p.actions.reduce((a, b) => (a ? t('it.d.and', { a, b }) : b), '')
  return [`${trigger} → ${actions}`, p.cooldown].filter(Boolean).join(' · ')
}

/** One sentence of an item (trigger → actions), for the group diff and anywhere else that names an item in a line. */
export function describeItemSentence(strategy: Strategy, rules: Rule[], t: Translate): string {
  // Read the strategy among the layer's rules (the others only matter for "shared", which a sentence does not say).
  const entry = readItems(
    rules.filter(r => whenRefs(strategy.when).includes(r.name)),
    [strategy]
  )[0]
  return partsSentence(entry.draft ? describeDraft(entry.draft, t) : describeStored(strategy, t), t)
}

/** A validation problem as a line: where ("条件 2：", "规则「x」：") and what. */
export function describeProblem(p: Problem | ListProblem, t: Translate): string {
  let where = ''
  if ('part' in p && p.index >= 0) {
    const rule = p.part === 'rules'
    where = p.name?.trim()
      ? t(rule ? 'it.at.rule' : 'it.at.item', { name: p.name })
      : t(rule ? 'it.at.ruleN' : 'it.at.itemN', { i: p.index + 1 })
  }
  const [list, i] = p.path.split('.')
  if (list === 'conditions' && i !== undefined) where += t('it.at.cond', { i: Number(i) + 1 })
  if (list === 'actions' && i !== undefined) where += t('it.at.action', { i: Number(i) + 1 })
  return where + t(`it.err.${p.key}`, p.params)
}

/** Names in a run: "a、b" / "a, b". */
export const nameList = (names: string[], t: Translate) => names.join(t('it.sep'))

/** The name of a copy: "x 副本 2". */
export const copyNamer = (t: Translate) => (name: string, n: number) => t('item.copyName', { name, n })
