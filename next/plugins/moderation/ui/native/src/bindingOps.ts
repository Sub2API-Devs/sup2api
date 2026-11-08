import type { Binding, BindingKind } from './types'

// Bindings of flows to groups and accounts (CONTRACTS §72.17), mirroring
// snapshot.flowForAccount: the most specific binding decides.

/** Most specific first: the order the plugin looks them up. */
export const BINDING_KINDS: readonly BindingKind[] = ['group_account', 'account', 'group']

export function bindingKind(groupId: number, accountId: number): BindingKind {
  if (!accountId) return 'group'
  return groupId ? 'group_account' : 'account'
}

/** Key of a binding: one binding per (group, account). */
export const bindingKey = (b: Pick<Binding, 'group_id' | 'account_id'>) => `${b.group_id}:${b.account_id}`

/**
 * The binding a request of `groupId` sent to `accountId` goes by: the account
 * within the group, the account in any group, the group, the default group
 * 0; undefined when none applies (not moderated). accountId 0 = before an
 * account is chosen (group bindings only).
 */
export function resolveBinding(bindings: readonly Binding[], groupId: number, accountId: number): Binding | undefined {
  const by = new Map(bindings.map((b) => [bindingKey(b), b]))
  const keys = accountId ? [`${groupId}:${accountId}`, `0:${accountId}`] : []
  keys.push(`${groupId}:0`, '0:0')
  for (const k of keys) {
    const b = by.get(k)
    if (b) return b
  }
  return undefined
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
