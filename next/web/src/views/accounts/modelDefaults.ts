import type { Account, AccountType } from '@/api/types'

// Plugin default models / mapping of an account type (CONTRACTS §41) and when
// the account editor fills them in.

/** Whether the account type ships any default model or mapping entry. */
export function hasDefaults(at: AccountType | null | undefined): boolean {
  return !!at && ((at.default_models?.length ?? 0) > 0 || Object.keys(at.default_model_mapping || {}).length > 0)
}

/**
 * Editing an existing account: it is prefilled with the plugin defaults only
 * when it has neither a model list nor a mapping (saved as "all models") and
 * the type has defaults. Accounts with any content are left alone; orphaned
 * accounts (no type) never are prefilled.
 */
export function shouldPrefillOnEdit(account: Pick<Account, 'models' | 'model_mapping' | 'orphaned'> | null | undefined, at: AccountType | null | undefined): boolean {
  if (!account || account.orphaned || !hasDefaults(at)) return false
  return !(account.models?.length ?? 0) && !Object.keys(account.model_mapping || {}).length
}
