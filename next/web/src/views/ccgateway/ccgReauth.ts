// Re-authorization of a saved Claude Code (CCGateway managed) account
// (docs/CCGATEWAY-REAUTH.md). The account keeps serving with its current
// runtime while a re-authorization draft (POST accounts/:id/reauthorize) goes
// through the usual steps; once the draft is signed in, the console commits it
// (POST accounts/:id/reauthorize/:key/commit) and the account switches to the
// new login with a clean slate. Closing the editor deletes the draft.
//
// Pure helpers, so the decisions are unit-tested apart from the component.
import { containerPhase, isDraftKey, type CcgContainer } from './ccgAuthFlow'

/** What the step flow reports about the draft it drives. */
export interface CcgFlowState {
  key: string | null
  authorized: boolean
}

export interface CcgReauthState {
  /** The open re-authorization draft, null while there is none. */
  key: string | null
  /** Last state reported by the step flow. */
  flow: CcgFlowState
  /** POST .../commit is running. */
  committing: boolean
  /** The draft whose commit failed: not committed again by itself until a new login or a retry. */
  failedKey: string | null
}

/**
 * Eligibility for the manual switch button, not an automatic action.
 * A failed commit requires an explicit retry or a fresh login.
 */
export function shouldCommit(s: CcgReauthState): boolean {
  return !!s.key && s.flow.key === s.key && s.flow.authorized && !s.committing && s.failedKey !== s.key
}

/**
 * After a refused commit (details.reason): the draft is gone → start a new
 * re-authorization; the draft is not signed in → re-check its login (the steps
 * show where it stands); anything else → keep the draft and offer a retry.
 */
export type CcgCommitRecovery = 'restart' | 'recheck' | 'retry'
export function commitRecovery(reason: string): CcgCommitRecovery {
  if (reason === 'draft_not_found') return 'restart'
  if (reason === 'draft_not_authorized') return 'recheck'
  return 'retry'
}

/** The current runtime's state, as the credentials card shows it. */
export type CcgLogin = 'authorized' | 'notAuthorized' | 'unknown'
export function accountSummary(status: string | null | undefined, loggedIn: boolean | null | undefined): { container: CcgContainer; login: CcgLogin } {
  const container = containerPhase(status)
  const login: CcgLogin = container !== 'ready' || loggedIn == null ? 'unknown' : loggedIn ? 'authorized' : 'notAuthorized'
  return { container, login }
}

// ---------------------------------------------------------------- pending re-authorization (survives a page reload)

type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const reauthStoreKey = (accountId: number) => `sub2api.ccgReauth.${accountId}`

/** The re-authorization draft this tab left open for the account, if any. */
export function readPendingReauth(store: KeyStore | null | undefined, accountId: number): string | null {
  try {
    const v = store?.getItem(reauthStoreKey(accountId))
    return isDraftKey(v) ? v : null
  } catch {
    return null
  }
}

/** Remembers (key) or forgets (null) the open re-authorization draft of the account. */
export function rememberReauth(store: KeyStore | null | undefined, accountId: number, key: string | null): void {
  try {
    if (key && isDraftKey(key)) store?.setItem(reauthStoreKey(accountId), key)
    else store?.removeItem(reauthStoreKey(accountId))
  } catch {
    // storage unavailable: nothing to resume after a reload
  }
}
