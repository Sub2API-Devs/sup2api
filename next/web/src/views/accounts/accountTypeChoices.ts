import type { AccountType } from '@/api/types'
export function sameCreationGroup(a: AccountType | null | undefined, b: AccountType | null | undefined): boolean {
  return !!a?.creation_group && a.plugin_key === b?.plugin_key && a.creation_group === b?.creation_group
}
/** Group explicitly declared authentication variants within the same plugin. */
export function creationChoices(types: AccountType[]): AccountType[] {
  return types.filter((at, i) => !types.slice(0, i).some(other => sameCreationGroup(at, other)))
}
