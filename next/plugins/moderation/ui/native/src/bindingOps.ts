import type { Binding, BindingKind } from './types'

// Bindings of flows to groups and accounts (CONTRACTS §72.17), mirroring
// snapshot.flowForAccount: the most specific binding that applies decides. A
// binding to a disabled, unpublished or deleted flow (`inactive`) does not
// apply; a binding to flow 0 ("not moderated") always does.

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

/**
 * What the requests of an inactive binding go by now: the next binding that
 * applies (undefined = not moderated). For an account bound in any group the
 * answer depends on the group of each request; this gives the default
 * group's.
 */
export const fallbackOf = (bindings: readonly Binding[], b: Pick<Binding, 'group_id' | 'account_id'>): Binding | undefined =>
  resolveBinding(
    bindings.filter((x) => bindingKey(x) !== bindingKey(b)),
    b.group_id,
    b.account_id
  )

/** Bindings ordered as the plugin looks them up: kind, then account, then group. */
export function sortBindings(list: readonly Binding[]): Binding[] {
  const rank = (b: Binding) => BINDING_KINDS.indexOf(bindingKind(b.group_id, b.account_id))
  return [...list].sort((a, b) => rank(a) - rank(b) || a.account_id - b.account_id || a.group_id - b.group_id)
}

/** Group ids bound to "not moderated" (flow 0). */
export const exemptGroups = (list: readonly Binding[]) => list.filter((b) => !b.account_id && !b.flow_id).map((b) => b.group_id)

/** Whether any binding names an account (the flow then depends on the account a request goes to). */
export const hasAccountBindings = (list: readonly Binding[]) => list.some((b) => b.account_id > 0)
