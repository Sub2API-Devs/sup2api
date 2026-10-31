// The console shows an account in one of three statuses: enabled, disabled
// (by an operator) or auto-disabled. A legacy "error" status and an active
// account taken out of scheduling both read as auto-disabled; a cooldown or an
// orphaned plugin is a note on the status, not a status of its own.
import type { Account } from '@/api/types'

export type AccountStatusKey = 'active' | 'disabled' | 'auto_disabled'

/** Filter order of the accounts list. */
export const accountStatusKeys: AccountStatusKey[] = ['active', 'auto_disabled', 'disabled']

export function accountStatusKey(a: Pick<Account, 'status' | 'schedulable'>): AccountStatusKey {
  if (a.status === 'disabled') return 'disabled'
  return a.status === 'active' && a.schedulable ? 'active' : 'auto_disabled'
}

/**
 * Enabled is green, auto-disabled yellow (it comes back by itself or after a
 * fix), what an operator did red: disabled, or an active account taken out of
 * scheduling by hand, which files under auto-disabled (CONTRACTS §73.4).
 */
export function accountStatusTone(a: Pick<Account, 'status' | 'schedulable' | 'orphaned'>) {
  if (a.orphaned) return 'gray'
  const key = accountStatusKey(a)
  if (key === 'active') return 'success'
  return key === 'auto_disabled' && a.status !== 'active' ? 'warning' : 'danger'
}
