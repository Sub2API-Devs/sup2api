import type { InjectionKey, Ref } from 'vue'
import type { AccountType } from '@/api/types'

/**
 * What the account editor tells the console widgets of its credential form
 * (SchemaForm passes widgets only their value): the account type being
 * edited and the server's field errors of the form (`credentials.` removed).
 */
export interface AccountFormContext {
  accountType: Readonly<Ref<AccountType | null>>
  errors: Readonly<Ref<Record<string, string>>>
}

export const ACCOUNT_FORM_KEY: InjectionKey<AccountFormContext> = Symbol('account-form')
