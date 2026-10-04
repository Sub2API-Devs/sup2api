// State of the Claude Code (CCGateway) account authorization flow shown in the
// account editor: ① save the account → ② start its container → ③ open the
// Claude authorization link → ④ paste the code back → done. Pure helpers, so
// the step logic is unit-tested apart from the component.

export type CcgStep = 'save' | 'container' | 'login' | 'code' | 'done'
export type CcgStepState = 'done' | 'current' | 'error' | 'todo'
export type CcgContainer = 'unknown' | 'preparing' | 'ready' | 'blocked' | 'error'

/** Why the core keeps an account's container stopped (status "blocked"). */
export type CcgBlockReason = 'no_proxy' | 'proxy_disabled' | 'account_disabled'
export function blockReason(reason: string | null | undefined): CcgBlockReason | 'unknown' {
  return reason === 'no_proxy' || reason === 'proxy_disabled' || reason === 'account_disabled' ? reason : 'unknown'
}

export const CCG_STEPS: readonly CcgStep[] = ['save', 'container', 'login', 'code', 'done']

export interface CcgFlow {
  /** The account exists (has an id). */
  saved: boolean
  container: CcgContainer
  /** Claude login state of the container; null while unknown. */
  loggedIn: boolean | null
  /** An authorization session (link) is open. */
  hasSession: boolean
  /** The user opened the authorization link of the current session. */
  opened: boolean
  /** The step whose last action failed, if any. */
  errorStep?: CcgStep | null
}

/** Container status of GET /system/ccgateway/accounts/:id/status → phase. */
export function containerPhase(status: string | null | undefined): CcgContainer {
  if (!status) return 'unknown'
  if (status === 'ready') return 'ready'
  // The core stopped the container (no proxy, proxy or account disabled): it never gets ready by itself.
  if (status === 'blocked') return 'blocked'
  if (['error', 'failed', 'unhealthy', 'stopped'].includes(status)) return 'error'
  // creating / pending (revision not applied yet) / anything else: still converging
  return 'preparing'
}

/** The step the user is on. */
export function currentStep(f: CcgFlow): CcgStep {
  if (!f.saved) return 'save'
  if (f.container !== 'ready') return 'container'
  if (f.loggedIn && !f.hasSession) return 'done'
  if (f.hasSession && f.opened) return 'code'
  return 'login'
}

/** State of every step: earlier ones done, the current one current (or error), later ones todo. */
export function stepStates(f: CcgFlow): Record<CcgStep, CcgStepState> {
  const cur = currentStep(f)
  const at = CCG_STEPS.indexOf(cur)
  const out = {} as Record<CcgStep, CcgStepState>
  CCG_STEPS.forEach((s, i) => {
    if (s === 'done' && cur === 'done') out[s] = 'done'
    else if (i < at) out[s] = 'done'
    else if (i > at) out[s] = 'todo'
    else out[s] = f.errorStep === s || (s === 'container' && (f.container === 'error' || f.container === 'blocked')) ? 'error' : 'current'
  })
  return out
}

/** Why per-account containers cannot work, from GET /system/ccgateway/remote-config; [] when configured. */
export type CcgSetupProblem = 'runtimes' | 'docker' | 'adminKey'
export function setupProblems(cfg: { account_runtimes?: boolean; mode?: string; has_admin_key?: boolean } | null | undefined): CcgSetupProblem[] {
  if (!cfg) return []
  const out: CcgSetupProblem[] = []
  if (!cfg.account_runtimes) out.push('runtimes')
  if (cfg.mode !== 'ssh' && cfg.mode !== 'local') out.push('docker')
  if (!cfg.has_admin_key) out.push('adminKey')
  return out
}

/** Seconds left before `expiresAt` (0 when past or unparsable). */
export function secondsLeft(expiresAt: string | null | undefined, now = Date.now()): number {
  const t = Date.parse(expiresAt || '')
  return Number.isFinite(t) ? Math.max(0, Math.floor((t - now) / 1000)) : 0
}

/** Claude shows the code as "code#state"; a paste without '#' is most likely incomplete. */
export function looksLikeAuthCode(raw: string): boolean {
  const v = raw.trim()
  const i = v.indexOf('#')
  return i > 0 && i < v.length - 1 && !/\s/.test(v)
}
