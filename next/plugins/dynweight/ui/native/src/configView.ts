import type { AccountOverride, Config, Layer, Strategy } from './host'
import { whenRefs } from './items'

// What the config page shows about a draft: how a group layer differs from
// the global one, which layer an account's override falls back to, and which
// parts have unsaved edits. Pure functions, so they are tested on their own.

/** The edited config, with groups and accounts always present. */
export interface Draft extends Config {
  groups: Record<string, Layer>
  accounts: Record<string, AccountOverride>
}

type T = (key: string, params?: Record<string, unknown>) => string

/** The global layer alone: what a new group starts as and what groups are compared to. */
export function globalLayer(c: Config): Layer {
  const { groups: _g, accounts: _a, notify: _n, log_events: _l, ...layer } = c
  return layer
}

/** Ids of a map sorted as numbers. */
export const sortedIds = (m: Record<string, unknown>) => Object.keys(m).sort((a, b) => Number(a) - Number(b))

// ---- values as shown

export function floorText(t: T, mode: Layer['min_weight_mode'], value: number | null | undefined): string {
  return t(`cfg.floorValue.${mode}`, { n: value ?? '—' })
}

/** The scalar fields a group can set apart from the global layer, in page order. */
export const layerFields = ['window_seconds', 'min_samples', 'exempt_status_codes', 'min_samples_strict', 'floor', 'clear_sticky_on_zero'] as const
export type LayerField = (typeof layerFields)[number]

export function fieldText(t: T, l: Layer, f: LayerField): string {
  switch (f) {
    case 'window_seconds':
      return t('cfg.value.seconds', { n: l.window_seconds ?? '—' })
    case 'min_samples':
      return String(l.min_samples ?? '—')
    case 'exempt_status_codes':
      return l.exempt_status_codes || t('cfg.value.none')
    case 'floor':
      return floorText(t, l.min_weight_mode, l.min_weight)
    default:
      return t(l[f] ? 'cfg.value.on' : 'cfg.value.off')
  }
}

// ---- a group against the global layer

/** JSON with object keys sorted: drafts are rebuilt by editors, which may order keys otherwise. */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x
  )
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b)

/** The scalar fields where a group differs from the global layer. */
export function fieldDiffs(group: Layer, global: Layer): LayerField[] {
  return layerFields.filter((f) =>
    f === 'floor' ? group.min_weight_mode !== global.min_weight_mode || group.min_weight !== global.min_weight : group[f] !== global[f]
  )
}

/** An item as compared: the strategy and the rules it reads, which may differ by layer under one name. */
function itemKey(s: Strategy, l: Layer): string {
  return canonical([s, whenRefs(s.when).map((name) => l.rules.find((r) => r.name === name) ?? null)])
}

export interface ItemDiff {
  /** Items of the global layer the group does not have (by name). */
  removed: string[]
  added: string[]
  /** Items under the same name that trigger or act differently. */
  changed: string[]
  /** Same items, other order (strategies apply in order). */
  reordered: boolean
}

export function itemDiff(group: Layer, global: Layer): ItemDiff {
  const g = new Map(global.strategies.map((s) => [s.name, itemKey(s, global)]))
  const mine = new Map(group.strategies.map((s) => [s.name, itemKey(s, group)]))
  const kept = (names: string[], other: Map<string, string>) => names.filter((n) => other.has(n))
  return {
    removed: [...g.keys()].filter((n) => !mine.has(n)),
    added: [...mine.keys()].filter((n) => !g.has(n)),
    changed: [...mine].filter(([n, k]) => g.has(n) && g.get(n) !== k).map(([n]) => n),
    reordered: !same(kept([...mine.keys()], g), kept([...g.keys()], mine))
  }
}

export const itemsSame = (d: ItemDiff) => !d.removed.length && !d.added.length && !d.changed.length && !d.reordered

// ---- what an account override falls back to

/**
 * The layers an account's keys read, as [source, layer]: each of its groups
 * that has a layer of its own, and the global layer ('') for the others.
 * Without the groups (not readable, or none) only the global layer. A layer
 * adjusts only under the master switch, so `enabled` is read through it.
 */
export function sourceLayers(c: Draft, groupIds: number[] | undefined): Array<[string, Layer]> {
  const out = new Map<string, Layer>()
  for (const id of groupIds ?? []) out.set(c.groups[id] ? String(id) : '', c.groups[id] ?? c)
  if (!out.size) out.set('', c)
  return [...out].map(([source, l]) => [source, { ...l, enabled: c.enabled && l.enabled }])
}

/** The value an override field falls back to: one value, or null when the account's layers differ. */
export function inheritedValue(sources: Array<[string, Layer]>, value: (l: Layer) => string): string | null {
  const values = new Set(sources.map(([, l]) => value(l)))
  return values.size === 1 ? [...values][0] : null
}

/** The override fields as shown: what an account sets, or what it inherits. */
export const overrideFields = {
  enabled: (t: T, l: Pick<Layer, 'enabled'>) => t(l.enabled ? 'cfg.accounts.on' : 'cfg.accounts.off'),
  exempt: (t: T, l: Pick<Layer, 'exempt_status_codes'>) => l.exempt_status_codes || t('cfg.value.none'),
  floor: (t: T, l: Pick<Layer, 'min_weight_mode' | 'min_weight'>) => floorText(t, l.min_weight_mode, l.min_weight)
}
export type OverrideField = keyof typeof overrideFields

/**
 * "Inherits group vip: 400" for a field an account leaves alone, or "differs
 * by group" with each group's value in `title`.
 */
export function inheritText(t: T, sources: Array<[string, Layer]>, f: OverrideField, groupName: (id: number) => string): { text: string; title: string } {
  const value = (l: Layer) => overrideFields[f](t, l)
  const name = (source: string) => (source ? t('cfg.accounts.group', { group: groupName(Number(source)) }) : t('cfg.accounts.global'))
  const one = inheritedValue(sources, value)
  if (one === null) return { text: t('cfg.accounts.varies'), title: sources.map(([s, l]) => `${name(s).trim()}: ${value(l)}`).join('\n') }
  return { text: t('cfg.accounts.inheritFrom', { source: sources.length === 1 ? name(sources[0][0]) : '', value: one }), title: '' }
}

// ---- unsaved edits

export interface Changes {
  global: boolean
  groups: string[]
  accounts: string[]
  notify: boolean
}

/** The parts of `draft` that differ from `saved`: the global layer, each group and account, notifications and logging. */
export function changes(draft: Draft, saved: Draft): Changes {
  const differing = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    sortedIds({ ...a, ...b }).filter((id) => !same(a[id], b[id]))
  return {
    global: !same(globalLayer(draft), globalLayer(saved)),
    groups: differing(draft.groups, saved.groups),
    accounts: differing(draft.accounts, saved.accounts),
    notify: !same(draft.notify, saved.notify) || draft.log_events !== saved.log_events
  }
}
