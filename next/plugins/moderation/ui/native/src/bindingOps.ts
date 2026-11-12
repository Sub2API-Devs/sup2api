import type { Binding, BindingKind, FallbackReason, Flow } from './types'

// Bindings of flows to groups and accounts (CONTRACTS §72.17), mirroring
// snapshot.flowForAccount: the most specific binding that applies decides. A
// binding to a disabled, unpublished or deleted flow (`inactive`) does not
// apply; a binding to flow 0 ("not moderated") always does. groupCoverage
// sums that up per group for the flows list and the status line.

/** Most specific first: the order the plugin looks them up. */
export const BINDING_KINDS: readonly BindingKind[] = ['group_account', 'account', 'group']

export function bindingKind(groupId: number, accountId: number): BindingKind {
  if (!accountId) return 'group'
  return groupId ? 'group_account' : 'account'
}

/** Key of a binding: one binding per (group, account). */
export const bindingKey = (b: Pick<Binding, 'group_id' | 'account_id'>) => `${b.group_id}:${b.account_id}`

/**
 * How a request of `groupId` sent to `accountId` is looked up: the account
 * within the group, the account in any group, the group, the default group
 * 0. `hit` is the first binding that applies (undefined = not moderated);
 * `skipped` the inactive bindings passed over before it, most specific
 * first. accountId 0 = before an account is chosen (group bindings only).
 */
export function resolveSteps(bindings: readonly Binding[], groupId: number, accountId: number): { hit: Binding | undefined; skipped: Binding[] } {
  const by = new Map(bindings.map((b) => [bindingKey(b), b]))
  const keys = new Set(accountId ? [`${groupId}:${accountId}`, `0:${accountId}`] : [])
  keys.add(`${groupId}:0`).add('0:0')
  const skipped: Binding[] = []
  for (const k of keys) {
    const b = by.get(k)
    if (b && !b.inactive) return { hit: b, skipped }
    if (b) skipped.push(b)
  }
  return { hit: undefined, skipped }
}

/** The binding a request goes by (resolveSteps().hit); undefined when none applies (not moderated). */
export const resolveBinding = (bindings: readonly Binding[], groupId: number, accountId: number): Binding | undefined => resolveSteps(bindings, groupId, accountId).hit

/** A binding that does not apply (GET /bindings fallback_reason): why, and the flow its requests go by now. */
export interface StaleBinding {
  reason: FallbackReason
  /** 0 = not moderated; null = an account bound in any group, whose requests go by the binding of their own group */
  effective: number | null
}

/** Why a binding does not apply and what applies instead; null when it applies. */
export function staleBinding(b: Pick<Binding, 'group_id' | 'account_id' | 'fallback_reason' | 'effective_flow_id'>): StaleBinding | null {
  if (!b.fallback_reason) return null
  return { reason: b.fallback_reason, effective: bindingKind(b.group_id, b.account_id) === 'account' ? null : (b.effective_flow_id ?? 0) }
}

/** Bindings ordered as the plugin looks them up: kind, then account, then group. */
export function sortBindings(list: readonly Binding[]): Binding[] {
  const rank = (b: Binding) => BINDING_KINDS.indexOf(bindingKind(b.group_id, b.account_id))
  return [...list].sort((a, b) => rank(a) - rank(b) || a.account_id - b.account_id || a.group_id - b.group_id)
}

/** Group ids bound to "not moderated" (flow 0). */
export const exemptGroups = (list: readonly Binding[]) => list.filter((b) => !b.account_id && !b.flow_id).map((b) => b.group_id)

/** Whether any binding names an account (the flow then depends on the account a request goes to). */
export const hasAccountBindings = (list: readonly Binding[]) => list.some((b) => b.account_id > 0)

/** Whether a group or an account is bound to the flow. */
export const flowBound = (f: Pick<Flow, 'groups' | 'accounts'>) => f.groups.length > 0 || !!f.accounts?.length

/** The flow is disabled or unpublished while something is bound to it: those bindings do not apply. */
export const flowBindingsInactive = (f: Pick<Flow, 'enabled' | 'version' | 'groups' | 'accounts'>) => (!f.enabled || !f.version) && flowBound(f)

// ---- group coverage (flows list, status line)

/** The flow a group is bound to (flows list). */
export interface GroupOwner {
  flowId: number
  flowName: string
}

/** How the core's groups are moderated now; group ids, the default group 0 aside. */
interface GroupCoverage {
  /** groups with a flow of their own */
  own: number[]
  /** groups moderated by a live flow (their own, else the default group's) */
  moderated: number[]
  /** groups without a flow of their own while the default group has no live flow */
  unbound: number[]
  /** bound groups whose flow is disabled or unpublished (incl. the default group 0): the binding does not apply, they go by the default group's flow */
  inactive: number[]
  /** the default group 0 has a live flow: what unbound groups and groups of an inactive flow fall back to */
  defaultLive: boolean
  /** bound groups the core does not know (anymore) */
  stale: number[]
  /** groups bound to "not moderated" (flow 0, §72.17) */
  exempt: number[]
}

/**
 * Group coverage (mirrors snapshot.flowFor): a group bound to an enabled and
 * published flow uses that flow; a group bound to "not moderated" (exempt)
 * is not moderated; other groups, those bound to a disabled or unpublished
 * flow included (the binding does not apply, 0.8.0), use the flow of the
 * default group 0. Account bindings are not counted (the bindings tab).
 */
export function groupCoverage(
  groupIds: readonly number[],
  flows: readonly Pick<Flow, 'groups' | 'enabled' | 'version'>[],
  exempt: readonly number[] = []
): GroupCoverage {
  const owner = new Map<number, Pick<Flow, 'enabled' | 'version'>>()
  for (const f of flows) for (const g of f.groups) owner.set(g, f)
  const skipped = new Set(exempt)
  for (const g of exempt) owner.set(g, { enabled: false, version: 0 })
  const live = (id: number) => {
    const f = owner.get(id)
    return !!f?.enabled && f.version > 0
  }
  const known = new Set(groupIds)
  const defaultLive = live(0)
  return {
    own: groupIds.filter((id) => owner.has(id)),
    moderated: groupIds.filter((id) => !skipped.has(id) && (live(id) || defaultLive)),
    unbound: defaultLive ? [] : groupIds.filter((id) => !owner.has(id)),
    inactive: [...owner.keys()].filter((id) => (id === 0 || known.has(id)) && !live(id) && !skipped.has(id)),
    stale: [...owner.keys()].filter((id) => id !== 0 && !known.has(id)),
    exempt: groupIds.filter((id) => skipped.has(id)),
    defaultLive
  }
}
