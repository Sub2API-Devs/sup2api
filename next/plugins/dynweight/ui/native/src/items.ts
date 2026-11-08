import {
  clone,
  omit,
  opsOf,
  percentileMetric,
  type Action,
  type ActionType,
  type Condition,
  type Metric,
  type Rule,
  type Scope,
  type Strategy,
  type When
} from './host'

// Adjustment items: the unit the configuration page edits, a strategy folded
// together with the one rule its `when` names (new-api's dynamic weight
// items). Reading derives an item per strategy from the two stored lists;
// writing emits both lists again: a rule nobody changed stays byte for byte,
// a changed rule another strategy still uses is copied for this item
// (copy-on-write), a rule nobody references any more leaves with the item.
// Whatever one item cannot show (a `when` over several rules, a missing or
// disabled rule) is a read-only entry kept verbatim. Everything here is pure:
// the components hold the state, the tests drive these functions.

export const MAX_ITEMS = 20 // rules.MaxStrategies (and MaxRules)
export const MAX_CONDITIONS = 10
export const MAX_PERIODS = 60
export const MAX_NAME = 64
const MAX_ACTIONS = 3

export type Direction = 'degrade' | 'climb'

/** The editable form of an item: the strategy's fields and its rule's. Numbers are null while an input is emptied. */
export interface ItemDraft {
  name: string
  enabled: boolean
  scope: Scope
  conditions: Condition[]
  periods: number | null
  hit_periods: number | null
  actions: Action[]
  cooldown_seconds: number | null
  /** The stored rule the item was read from (shared: another strategy references it too); null for a new item or a copy. */
  source: { rule: string; shared: boolean } | null
  /** The rule-owned fields as read: a draft differing from them writes its own rule. */
  origin: string
}

export type ReadonlyReason = { kind: 'composite' } | { kind: 'missing'; rule: string } | { kind: 'disabled'; rule: string }

/** One item: the stored strategy, verbatim, and its draft, or why it is read-only. */
export interface ItemEntry {
  strategy: Strategy
  draft: ItemDraft | null
  reason?: ReadonlyReason
}

// ------------------------------------------------------------------ when

/** Rule names a trigger references. */
export function whenRefs(w: When | null | undefined): string[] {
  if (w === null || w === undefined) return []
  if (typeof w === 'string') return [w]
  const list = 'all' in w ? w.all : w.any
  return Array.isArray(list) ? list.flatMap(whenRefs) : []
}

/** The trigger with rule `from` renamed `to`. */
function renamedWhen(w: When, from: string, to: string): When {
  if (typeof w === 'string') return w === from ? to : w
  const each = (list: When[]) => list.map(m => renamedWhen(m, from, to))
  return 'all' in w ? { all: each(w.all) } : { any: each(w.any) }
}

/** The rule of a bare name or a one-name all / any; null for anything else. */
function singleRef(w: When): string | null {
  if (typeof w === 'string') return w
  const list = 'all' in w ? w.all : w.any
  return list.length === 1 && typeof list[0] === 'string' ? list[0] : null
}

// ------------------------------------------------------------------ read

const ruleKey = (d: Pick<ItemDraft, 'scope' | 'conditions' | 'periods' | 'hit_periods'>) =>
  JSON.stringify([d.scope, d.conditions, d.periods, d.hit_periods])

/** Whether the draft's rule-owned fields differ from what was read: it then writes its own rule. */
export const isForked = (d: ItemDraft) => d.source === null || ruleKey(d) !== d.origin

const ruleScope = (s: Rule['scope']): Scope => (s === 'stream' || s === 'non_stream' ? s : 'all')

/** The stored lists as items, one per strategy in order. Nothing is rewritten by reading. */
export function readItems(rules: Rule[], strategies: Strategy[]): ItemEntry[] {
  const byName = new Map<string, Rule>()
  for (const r of rules) if (!byName.has(r.name)) byName.set(r.name, r)
  const refs = strategies.map(s => whenRefs(s.when))
  return strategies.map((strategy, i): ItemEntry => {
    const base = {
      name: strategy.name,
      enabled: strategy.enabled !== false,
      actions: clone(Array.isArray(strategy.actions) ? strategy.actions : []),
      cooldown_seconds: strategy.cooldown_seconds ?? 0
    }
    const when = strategy.when
    if (when === null || when === undefined || when === '') {
      const fields = { scope: 'all' as Scope, conditions: [], periods: 1, hit_periods: 1 }
      return { strategy, draft: { ...base, ...fields, source: null, origin: ruleKey(fields) } }
    }
    const name = singleRef(when)
    if (name === null) return { strategy, draft: null, reason: { kind: 'composite' } }
    const rule = byName.get(name)
    if (!rule) return { strategy, draft: null, reason: { kind: 'missing', rule: name } }
    if (rule.enabled === false) return { strategy, draft: null, reason: { kind: 'disabled', rule: name } }
    const fields = {
      scope: ruleScope(rule.scope),
      conditions: clone(rule.conditions),
      periods: rule.periods ?? 1,
      hit_periods: rule.hit_periods ?? 1
    }
    const shared = refs.some((list, j) => j !== i && list.includes(name))
    return { strategy, draft: { ...base, ...fields, source: { rule: name, shared }, origin: ruleKey(fields) } }
  })
}

// ------------------------------------------------------------------ write

const sameScope = (a: string | undefined, b: string | undefined) => (a || 'all') === (b || 'all')

/** A condition in the plugin's canonical form and key order (as rules.Condition.normalize leaves it). */
function canonicalCondition(c: Condition, j: number, scope: Scope): Condition {
  const sample = c.metric !== 'weight'
  return {
    ...(j > 0 ? { join: c.join } : {}),
    metric: c.metric,
    ...(percentileMetric(c.metric) ? { p: c.p } : {}),
    op: c.op,
    value: c.value,
    ...(sample && c.scope && !sameScope(c.scope, scope) ? { scope: c.scope } : {}),
    ...(sample && c.when_empty === 'pass' ? { when_empty: 'pass' as const } : {})
  } as Condition
}

function ruleFromDraft(d: ItemDraft, name: string): Rule {
  return {
    name,
    ...(d.scope !== 'all' ? { scope: d.scope } : {}),
    conditions: d.conditions.map((c, j) => canonicalCondition(c, j, d.scope)),
    periods: d.periods as number,
    hit_periods: d.hit_periods as number
  }
}

function canonicalAction(a: Action): Action {
  if (a.type === 'affinity_clear') return { type: a.type, percent: a.percent }
  return { type: a.type, mode: a.mode, value: a.value }
}

function strategyFromDraft(d: ItemDraft, when: When | null): Strategy {
  return {
    name: d.name.trim(),
    ...(d.enabled ? {} : { enabled: false }),
    when,
    actions: d.actions.map(canonicalAction),
    ...(d.cooldown_seconds ? { cooldown_seconds: d.cooldown_seconds } : {})
  }
}

/** `base` (cut to the name limit) or `base (2)`, `base (3)`… : the first not in `taken`. */
function freeName(base: string, taken: Set<string>): string {
  const cut = (suffix: string) => [...base].slice(0, MAX_NAME - suffix.length).join('') + suffix
  let name = cut('')
  for (let n = 2; taken.has(name); n++) name = cut(` (${n})`)
  return name
}

export interface Written {
  rules: Rule[]
  strategies: Strategy[]
  /** Names of the rules no item references any more, which left with the write. */
  dropped: string[]
}

/**
 * Writes the items back as the two lists. A read-only entry keeps its
 * strategy and every rule it references verbatim. An item that did not change
 * its rule keeps it verbatim (and its `when`); one that changed it updates it
 * in place unless another item still holds it, and then, like a new item or a
 * copy, gets a new rule named after the item. Renaming an item renames the
 * rule of the same name with it, unless another item holds that rule or the
 * new name is a rule's already. Kept rules stay in their order, new ones
 * follow in item order; rules nobody holds are dropped and named.
 */
export function writeItems(entries: ItemEntry[], rules: Rule[]): Written {
  const byName = new Map<string, Rule>()
  for (const r of rules) if (!byName.has(r.name)) byName.set(r.name, r)
  const held = entries.map(e => (e.draft ? (e.draft.source ? [e.draft.source.rule] : []) : whenRefs(e.strategy.when)))
  const heldByOthers = (i: number, name: string) => held.some((names, j) => j !== i && names.includes(name))

  // Pass 1: which items keep their stored rule, so the names left free are known.
  const keeps = entries.map((e, i) => {
    const src = e.draft?.source?.rule
    return !!src && byName.has(src) && (!isForked(e.draft!) || !heldByOthers(i, src))
  })
  const surviving = new Set<string>()
  entries.forEach((e, i) => {
    if (!e.draft) held[i].forEach(n => surviving.add(n))
    else if (keeps[i]) surviving.add(e.draft.source!.rule)
  })

  const names = new Set([...surviving].filter(n => byName.has(n)))
  const updated = new Map<string, Rule>()
  const strategies: Strategy[] = []
  const generated: Rule[] = []
  entries.forEach((e, i) => {
    const d = e.draft
    if (!d) return strategies.push(e.strategy)
    if (!keeps[i]) {
      const name = freeName(d.name.trim(), names)
      names.add(name)
      generated.push(ruleFromDraft(d, name))
      return strategies.push(strategyFromDraft(d, name))
    }
    const src = d.source!.rule
    const stored = byName.get(src)!
    let rule = isForked(d) ? ruleFromDraft(d, src) : stored
    let when = e.strategy.when
    const to = d.name.trim()
    if (src === e.strategy.name.trim() && to !== src && to !== '' && !names.has(to) && !heldByOthers(i, src)) {
      names.delete(src)
      names.add(to)
      rule = { ...rule, name: to }
      when = renamedWhen(when as When, src, to)
    }
    if (rule !== stored) updated.set(src, rule)
    strategies.push(strategyFromDraft(d, when))
  })

  const kept: Rule[] = []
  const dropped: string[] = []
  for (const r of rules) {
    if (surviving.has(r.name)) kept.push(updated.get(r.name) ?? r)
    else dropped.push(r.name)
  }
  return { rules: [...kept, ...generated], strategies, dropped }
}

// ------------------------------------------------------------------ list operations

/** The item's name (trimmed): the draft's, or the stored strategy's of a read-only entry. */
export const entryName = (e: ItemEntry) => (e.draft ? e.draft.name : e.strategy.name).trim()

/** Whether the item is switched on: the draft's switch, or the stored strategy's. */
export const entryEnabled = (e: ItemEntry) => (e.draft ? e.draft.enabled : e.strategy.enabled !== false)

/**
 * Whether the item may be switched on: not while its trigger references a
 * missing or disabled rule, which the plugin refuses for an enabled strategy
 * (switching it off stays possible).
 */
export function entryCanEnable(e: ItemEntry, rules: Rule[]): boolean {
  if (e.draft) return true
  const live = new Set(rules.filter(r => r.enabled !== false).map(r => r.name))
  return whenRefs(e.strategy.when).every(r => live.has(r))
}

/** Entry `i` with its enabled switch set: the draft's, or the stored strategy's of a read-only entry. Switching on an entry with a missing or disabled rule is refused. */
export function toggleEntry(entries: ItemEntry[], i: number, enabled: boolean): ItemEntry[] {
  return entries.map((e, j) => {
    if (j !== i) return e
    if (enabled && (e.reason?.kind === 'missing' || e.reason?.kind === 'disabled')) return e
    if (e.draft) return { ...e, draft: { ...e.draft, enabled } }
    const rest = omit(e.strategy, 'enabled')
    return { ...e, strategy: enabled ? rest : { ...rest, enabled: false } }
  })
}

/** Item names in use, and the rule names items hold: a new name avoids both so its rule can carry it too. */
function takenNames(entries: ItemEntry[]): Set<string> {
  const taken = new Set<string>()
  for (const e of entries) {
    taken.add(entryName(e))
    for (const r of e.draft ? (e.draft.source ? [e.draft.source.rule] : []) : whenRefs(e.strategy.when)) taken.add(r)
  }
  return taken
}

/** The first `make(n)` (n = 1, 2, …) no item or held rule uses. */
export function uniqueItemName(entries: ItemEntry[], make: (n: number) => string): string {
  const taken = takenNames(entries)
  let n = 1
  while (taken.has(make(n))) n++
  return make(n)
}

/**
 * A copy of entry `i` inserted after it, named copyName(name, n). A draft is
 * copied as a new item (its own rule once written, so editing the copy never
 * touches the original); a read-only entry keeps its strategy but the name.
 */
export function duplicateEntry(entries: ItemEntry[], i: number, copyName: (name: string, n: number) => string): ItemEntry[] {
  const src = entries[i]
  if (!src) return entries
  const name = uniqueItemName(entries, n => copyName(entryName(src), n))
  const copy: ItemEntry = src.draft
    ? { strategy: src.strategy, draft: { ...clone({ ...src.draft, source: null }), name } }
    : { ...src, strategy: { ...clone(src.strategy), name } }
  return [...entries.slice(0, i + 1), copy, ...entries.slice(i + 1)]
}

export function moveEntry(entries: ItemEntry[], i: number, by: -1 | 1): ItemEntry[] {
  const j = i + by
  if (!entries[i] || !entries[j]) return entries
  const next = [...entries]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export const removeEntry = (entries: ItemEntry[], i: number): ItemEntry[] => entries.filter((_, j) => j !== i)

// ------------------------------------------------------------------ drafts

export const weightAction = (direction: Direction): Action =>
  direction === 'climb'
    ? { type: 'weight_climb', mode: 'base_percent', value: 10 }
    : { type: 'weight_degrade', mode: 'current_percent', value: 30 }

export const newAction = (type: ActionType): Action =>
  type === 'affinity_clear' ? { type, percent: 30 } : weightAction(type === 'weight_climb' ? 'climb' : 'degrade')

/** A condition row of a metric with its usual threshold, keeping a join. */
export function newCondition(metric: Metric, join?: Condition['join']): Condition {
  const seed: Record<Metric, Omit<Condition, 'metric'>> = {
    error_rate: { op: 'gte', value: 30 },
    ttfb: { p: 95, op: 'gte', value: 10000 },
    latency: { p: 95, op: 'gte', value: 30000 },
    weight: { op: 'lte', value: 0 }
  }
  return { ...(join ? { join } : {}), metric, ...seed[metric] }
}

/** A new degrade item: error rate ≥ 30% in 2 of 3 windows lowers the weight 30% of the current one. */
export function newDraft(name: string): ItemDraft {
  return {
    name,
    enabled: true,
    scope: 'all',
    conditions: [newCondition('error_rate')],
    periods: 3,
    hit_periods: 2,
    actions: [weightAction('degrade')],
    cooldown_seconds: 0,
    source: null,
    origin: ''
  }
}

/** A strategy placeholder for a new item's entry (writing a draft without a source never reads it). */
export const newEntry = (draft: ItemDraft): ItemEntry => ({ strategy: { name: draft.name, when: null, actions: [] }, draft })

const isWeight = (t: ActionType | string) => t === 'weight_degrade' || t === 'weight_climb'

/** The direction of a strategy or draft: its weight action's, null without one. */
export function directionOf(actions: Action[] | undefined): Direction | null {
  const a = (actions ?? []).find(x => isWeight(x?.type))
  if (!a) return null
  return a.type === 'weight_climb' ? 'climb' : 'degrade'
}

/** Action types the "add action" button can still add: one weight action and one sticky clear at most (as the plugin accepts). */
export function addableActions(actions: Action[]): ActionType[] {
  const hasWeight = actions.some(a => isWeight(a.type))
  const hasClear = actions.some(a => a.type === 'affinity_clear')
  if (actions.length >= MAX_ACTIONS) return []
  return [...(hasWeight ? [] : (['weight_degrade', 'weight_climb'] as const)), ...(hasClear ? [] : (['affinity_clear'] as const))]
}

/** Types the type select of action `a` offers: its own, the other direction for a weight action, and what could be added. */
export function actionTypeChoices(actions: Action[], a: Action): ActionType[] {
  const others = actions.filter(x => x !== a)
  const all: ActionType[] = ['weight_degrade', 'weight_climb', 'affinity_clear']
  return all.filter(t => t === a.type || (t === 'affinity_clear' ? !others.some(x => x.type === t) : !others.some(x => isWeight(x.type))))
}

/** Action `a` turned into `type`: a weight action switching direction keeps its amount, otherwise the type's default. */
export function retypedAction(a: Action, type: ActionType): Action {
  if (isWeight(a.type) && isWeight(type)) return { type, mode: a.mode, value: a.value }
  return newAction(type)
}

/** A condition switched to another metric: that metric's default, keeping the join. */
export const remetric = (c: Condition, metric: Metric): Condition => (metric === c.metric ? c : newCondition(metric, c.join))

/** The conditions without row j; the next row becomes the first and loses its join. */
export function removeCondition(conditions: Condition[], j: number): Condition[] {
  const next = conditions.filter((_, k) => k !== j)
  if (j === 0 && next[0]) {
    next[0] = omit(next[0], 'join')
  }
  return next
}

// ------------------------------------------------------------------ validation (mirrors internal/rules)

/** A problem the plugin would refuse: an i18n key under it.err with params, at `path`. */
export interface Problem {
  /** Draft paths: name, conditions, conditions.0.value, periods, hit_periods, actions, actions.1.value, cooldown_seconds. */
  path: string
  key: string
  params?: Record<string, unknown>
}

const missing = (v: unknown) => v === null || v === undefined
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const SCOPES = ['', 'all', 'stream', 'non_stream']
const LIMITS: Record<Metric, [number, number]> = { error_rate: [0, 100], ttfb: [1, 86400000], latency: [1, 86400000], weight: [0, 1000000] }

function checkName(name: unknown, path = 'name'): Problem[] {
  const n = typeof name === 'string' ? name.trim() : ''
  if (n === '') return [{ path, key: 'nameRequired' }]
  if ([...n].length > MAX_NAME) return [{ path, key: 'nameLong', params: { n: MAX_NAME } }]
  return []
}

function checkCondition(c: Condition, j: number, scope: Scope | string): Problem[] {
  const at = (field: string) => `conditions.${j}.${field}`
  const out: Problem[] = []
  if (!SCOPES.includes(c.scope ?? '')) out.push({ path: at('scope'), key: 'scope' })
  if (!['', 'fail', 'pass'].includes(c.when_empty ?? '')) out.push({ path: at('when_empty'), key: 'whenEmpty' })
  // The plugin reads when_empty fail as unset before this check.
  if (c.metric === 'weight' && (c.scope || c.when_empty === 'pass')) out.push({ path: at('scope'), key: 'weightScope' })
  if (j > 0 && c.join !== 'and' && c.join !== 'or') out.push({ path: at('join'), key: 'join' })
  const limits = LIMITS[c.metric]
  if (!limits) return [...out, { path: at('metric'), key: 'metric' }]
  if (percentileMetric(c.metric)) {
    if (missing(c.p)) out.push({ path: at('p'), key: 'required' })
    else if (!isInt(c.p) || c.p < 50 || c.p > 100) out.push({ path: at('p'), key: 'p' })
  } else if (c.p) out.push({ path: at('p'), key: 'pOnly' })
  if (!opsOf(c.metric).includes(c.op)) out.push({ path: at('op'), key: 'op' })
  if (missing(c.value)) out.push({ path: at('value'), key: 'required' })
  else if (!isInt(c.value) || c.value < limits[0] || c.value > limits[1])
    out.push({ path: at('value'), key: 'value', params: { min: limits[0], max: limits[1] } })
  if (c.metric === 'ttfb' && (c.scope || scope) === 'non_stream') out.push({ path: at('scope'), key: 'ttfbNonStream' })
  return out
}

/** `least`: the smallest N and M taken; 0 for stored lists (the plugin reads 0 as "left out", 1), 1 for drafts. */
function checkRuleFields(scope: unknown, conditions: Condition[], periods: unknown, hits: unknown, least: 0 | 1): Problem[] {
  const out: Problem[] = []
  if (!SCOPES.includes((scope as string) ?? '')) out.push({ path: 'scope', key: 'scope' })
  if (conditions.length < 1 || conditions.length > MAX_CONDITIONS)
    out.push({ path: 'conditions', key: 'conditions', params: { n: MAX_CONDITIONS } })
  conditions.forEach((c, j) => out.push(...checkCondition(c, j, (scope as string) || 'all')))
  if (missing(periods)) out.push({ path: 'periods', key: 'required' })
  else if (!isInt(periods) || periods < least || periods > MAX_PERIODS)
    out.push({ path: 'periods', key: 'periods', params: { n: MAX_PERIODS } })
  if (missing(hits)) out.push({ path: 'hit_periods', key: 'required' })
  // Against an emptied N only the range is known.
  else if (!isInt(hits) || hits < least || hits > (isInt(periods) ? Math.max(periods, 1) : MAX_PERIODS))
    out.push({ path: 'hit_periods', key: 'hitPeriods' })
  return out
}

function checkActions(actions: Action[], cooldown: unknown): Problem[] {
  const out: Problem[] = []
  if (actions.length < 1 || actions.length > MAX_ACTIONS) out.push({ path: 'actions', key: 'actions', params: { n: MAX_ACTIONS } })
  actions.forEach((a, j) => {
    const at = (field: string) => `actions.${j}.${field}`
    if (isWeight(a.type)) {
      if (a.mode !== 'base_percent' && a.mode !== 'current_percent' && a.mode !== 'fixed') out.push({ path: at('mode'), key: 'mode' })
      else if (missing(a.value)) out.push({ path: at('value'), key: 'required' })
      else if (a.mode === 'fixed' ? !isInt(a.value) || a.value < 1 : !isInt(a.value) || a.value < 1 || a.value > 100)
        out.push({ path: at('value'), key: a.mode === 'fixed' ? 'fixedValue' : 'percentValue' })
    } else if (a.type === 'affinity_clear') {
      if (missing(a.percent)) out.push({ path: at('percent'), key: 'required' })
      else if (!isInt(a.percent) || a.percent < 1 || a.percent > 100) out.push({ path: at('percent'), key: 'percent' })
    } else out.push({ path: at('type'), key: 'type' })
    const before = actions.slice(0, j)
    if (before.some(x => x.type === a.type)) out.push({ path: at('type'), key: 'dupType' })
    else if (isWeight(a.type) && before.some(x => isWeight(x.type))) out.push({ path: at('type'), key: 'twoWeights' })
  })
  if (missing(cooldown)) out.push({ path: 'cooldown_seconds', key: 'required' })
  else if (!isInt(cooldown) || cooldown < 0) out.push({ path: 'cooldown_seconds', key: 'cooldown' })
  return out
}

/** What the plugin would refuse in draft `d`, which lives in `entries` (another item of the same name counts). */
export function validateDraft(d: ItemDraft, entries: ItemEntry[]): Problem[] {
  const out = checkName(d.name)
  const name = d.name.trim()
  if (!out.length && entries.some(e => e.draft !== d && entryName(e) === name)) out.push({ path: 'name', key: 'nameDup' })
  return [...out, ...checkRuleFields(d.scope, d.conditions, d.periods, d.hit_periods, 1), ...checkActions(d.actions, d.cooldown_seconds)]
}

/** A problem of a whole list: which list, which entry (-1 for the list). */
export interface ListProblem extends Problem {
  part: 'rules' | 'strategies'
  index: number
  name: string
}

/** Validates `when` as rules.compileWhen does. */
function checkWhen(w: When | null | undefined, rules: Map<string, Rule>, enabled: boolean, depth = 0): Problem | null {
  if (w === null || w === undefined || w === '') return { path: 'when', key: 'when' }
  if (typeof w === 'string') {
    const r = rules.get(w)
    if (!r) return { path: 'when', key: 'unknownRule', params: { name: w } }
    if (enabled && r.enabled === false) return { path: 'when', key: 'disabledRule', params: { name: w } }
    return null
  }
  const keys = Object.keys(w)
  const list = (w as Record<string, When[]>)[keys[0]]
  if (keys.length !== 1 || !['all', 'any'].includes(keys[0]) || !Array.isArray(list)) return { path: 'when', key: 'whenShape' }
  if (!list.length) return { path: 'when', key: 'when' }
  if (depth >= 1 && list.some(m => typeof m !== 'string')) return { path: 'when', key: 'whenDepth' }
  for (const m of list) {
    const p = checkWhen(m, rules, enabled, depth + 1)
    if (p) return p
  }
  return null
}

/**
 * What the plugin would refuse in a layer's two lists (rules.Layer.normalize,
 * minus the layer's scalars): counts, each rule, each strategy against the
 * rules, and duplicate names.
 */
export function validateLists(rules: Rule[], strategies: Strategy[]): ListProblem[] {
  const out: ListProblem[] = []
  const add = (part: ListProblem['part'], index: number, name: string, ps: Problem[]) =>
    ps.forEach(p => out.push({ ...p, part, index, name }))
  if (rules.length > MAX_ITEMS) add('rules', -1, '', [{ path: '', key: 'maxRules', params: { n: MAX_ITEMS } }])
  if (strategies.length > MAX_ITEMS) add('strategies', -1, '', [{ path: '', key: 'maxItems', params: { n: MAX_ITEMS } }])
  const byName = new Map<string, Rule>()
  rules.forEach((r, i) => {
    const conditions = Array.isArray(r.conditions) ? r.conditions : []
    add('rules', i, r.name, [...checkName(r.name), ...checkRuleFields(r.scope, conditions, r.periods ?? 0, r.hit_periods ?? 0, 0)])
    if (byName.has(r.name.trim())) add('rules', i, r.name, [{ path: 'name', key: 'ruleNameDup' }])
    byName.set(r.name.trim(), r)
  })
  const seen = new Set<string>()
  strategies.forEach((s, i) => {
    const when = checkWhen(s.when, byName, s.enabled !== false)
    add('strategies', i, s.name, [
      ...checkName(s.name),
      ...(when ? [when] : []),
      ...checkActions(Array.isArray(s.actions) ? s.actions : [], s.cooldown_seconds ?? 0)
    ])
    if (seen.has(s.name.trim())) add('strategies', i, s.name, [{ path: 'name', key: 'nameDup' }])
    seen.add(s.name.trim())
  })
  return out
}

/** Names of the strategies whose `when` the plugin refuses as it stands (a removed rule; a disabled one under an enabled strategy). */
export function staleItems(rules: Rule[], strategies: Strategy[]): string[] {
  const all = new Set(rules.map(r => r.name))
  const live = new Set(rules.filter(r => r.enabled !== false).map(r => r.name))
  return strategies.filter(s => whenRefs(s.when).some(r => !(s.enabled !== false ? live : all).has(r))).map(s => s.name)
}

// ------------------------------------------------------------------ page-level checks (agreed interface)

/**
 * An enabled degrade item exists, but no enabled climb item: a degraded
 * weight never recovers on its own. The plugin's warning (rules.noClimb)
 * reads the strategies only, so the rules are not consulted either.
 */
export function hasDegradeWithoutClimb(_rules: Rule[], strategies: Strategy[]): boolean {
  const on = strategies.filter(s => s.enabled !== false).map(s => directionOf(s.actions))
  return on.includes('degrade') && !on.includes('climb')
}

export function countItems(strategies: Strategy[]): number {
  return strategies.length
}
