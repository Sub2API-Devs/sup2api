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

/** The list's enable switch is on only for an enabled account: an automatic disable or scheduling turned off reads as off. */
export const accountEnabled = (a: Pick<Account, 'status' | 'schedulable'>) => accountStatusKey(a) === 'active'

/**
 * PATCH body of the enable switch and the bulk enable / disable. Enabling is
 * the manual enable of the core: status active clears an automatic disable,
 * its reason and release time (a usage limit lets the account through for that
 * period, CONTRACTS §73.4) and turns scheduling back on; a cooldown stays.
 * Disabling is the manual disable, with scheduling off.
 */
export const enabledPatch = (on: boolean) => ({ status: on ? 'active' : 'disabled', schedulable: on }) as const

/**
 * Enabled is green; auto-disabled with a release time yellow (it comes back by
 * itself); red what needs a person: auto-disabled without a release time,
 * disabled, or an active account taken out of scheduling by hand, which files
 * under auto-disabled (CONTRACTS §73.4).
 */
export function accountStatusTone(a: Pick<Account, 'status' | 'schedulable' | 'orphaned' | 'auto_disabled_until'>) {
  if (a.orphaned) return 'gray'
  const key = accountStatusKey(a)
  if (key === 'active') return 'success'
  return key === 'auto_disabled' && a.status !== 'active' && a.auto_disabled_until ? 'warning' : 'danger'
}
