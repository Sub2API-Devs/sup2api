// State of the Claude Code (CCGateway) authorization flow shown in the account
// editor (docs/CCGATEWAY-DRAFT-RUNTIMES.md, docs/CCGATEWAY-REAUTH.md). One
// state machine, both on a draft runtime:
//
// - draft (new account): ① choose a proxy → ② start the container (creates the
//   draft runtime) → ③ open the Claude link → ④ paste the code → authorized;
//   only then can the account be saved (it adopts the draft).
// - reauth (saved account): the re-authorization draft already exists (POST
//   accounts/:id/reauthorize) → ② container → ③ link → ④ code → authorized;
//   then the console commits it (the account swaps to the new runtime).
//
// Pure helpers, so the step logic is unit-tested apart from the component.

export type CcgMode = 'draft' | 'reauth'
export type CcgStep = 'proxy' | 'container' | 'login' | 'code' | 'done'
export type CcgStepState = 'done' | 'current' | 'error' | 'todo'
export type CcgContainer = 'unknown' | 'preparing' | 'ready' | 'blocked' | 'error'

export const CCG_DRAFT_STEPS: readonly CcgStep[] = ['proxy', 'container', 'login', 'code', 'done']
export const CCG_REAUTH_STEPS: readonly CcgStep[] = ['container', 'login', 'code', 'done']
export const stepsOf = (mode: CcgMode): readonly CcgStep[] => (mode === 'draft' ? CCG_DRAFT_STEPS : CCG_REAUTH_STEPS)

/** Draft runtime keys (`d` + 16 lowercase hex); anything else is never put into a URL. */
export const isDraftKey = (key: unknown): key is string => typeof key === 'string' && /^d[0-9a-f]{16}$/.test(key)

// ---------------------------------------------------------------- codes (translated as ccgateway.status.* / ccgateway.reason.*)

/** Container statuses the core reports (GET .../status); shown as ccgateway.status.<status>. */
export const CCG_STATUSES = ['creating', 'ready', 'blocked', 'pending'] as const
export type CcgStatus = (typeof CCG_STATUSES)[number]
export function knownStatus(status: unknown): CcgStatus | null {
  return (CCG_STATUSES as readonly unknown[]).includes(status) ? (status as CcgStatus) : null
}

/**
 * Every reason code of the contract: the business container's errors (§2), the
 * core's (§4, also the reasons of a blocked status) and the controller's (§3,
 * in case one is passed through). Shown as ccgateway.reason.<code>.
 */
export const CCG_REASONS = [
  // §2 business container
  'invalid_request',
  'session_not_found',
  'invalid_code',
  'auth_rejected',
  'auth_process_failed',
  'invalid_auth_url',
  'status_unavailable',
  'logout_failed',
  // §4 core
  'not_configured',
  'not_synchronized',
  'sync_failed',
  'no_proxy',
  'proxy_disabled',
  'proxy_not_found',
  'account_disabled',
  'draft_not_found',
  'draft_not_authorized',
  // §3 controller
  'unauthorized',
  'not_found',
  'api_key_account',
  'runtime_unavailable',
  'method_not_allowed',
  // business container, passed through from Claude Code's own API errors
  'authentication_error',
  'not_found_error',
  // runtime install / upgrade (GET/POST /system/ccgateway/runtime)
  'image_pull_failed',
  'controller_unhealthy',
  'controller_outdated',
  'ssh_failed',
  'ssh_not_configured',
  'install_in_progress',
  'install_failed',
  // control-panel install (POST /system/ccgateway/controller/install, CONTRACTS §53.3)
  'runtimes_disabled',
  'invalid_host',
  'invalid_email',
  'config_changed',
  'gateway_failed',
  'ca_unavailable',
  'gateway_unreachable',
  // controller install, local Docker or SSH credentials of the request (§53.9)
  'invalid_ssh',
  'port_in_use',
  'no_free_port',
  'docker_not_installed',
  'docker_not_running',
  'acme_ports_unavailable',
  // control-panel mode: image uploads and runtime images (§53.5, §53.6)
  'controller_not_configured',
  'offset_mismatch',
  'too_many_uploads',
  'incomplete',
  'checksum_mismatch',
  'load_failed',
  'invalid_image',
  'upgrade_in_progress'
] as const
export type CcgReason = (typeof CCG_REASONS)[number]
export function knownReason(code: unknown): CcgReason | null {
  return (CCG_REASONS as readonly unknown[]).includes(code) ? (code as CcgReason) : null
}

/** Reasons of a blocked container the user fixes in the editor (proxy or account state). */
export type CcgBlockReason = 'no_proxy' | 'proxy_disabled' | 'account_disabled'
export function blockReason(reason: unknown): CcgBlockReason | 'unknown' {
  return reason === 'no_proxy' || reason === 'proxy_disabled' || reason === 'account_disabled' ? reason : 'unknown'
}

/** After these reasons the container no longer holds the login session (§2): a new link is needed. */
export function sessionEnded(reason: string): boolean {
  return reason === 'session_not_found' || reason === 'auth_rejected' || reason === 'auth_process_failed' || reason === 'invalid_auth_url'
}

/** `details.reason` of an API error (the cause code of the ccgateway endpoints), or ''. */
export function reasonOf(e: unknown): string {
  const r = (e as { details?: { reason?: unknown } } | null)?.details?.reason
  return typeof r === 'string' ? r : ''
}

/**
 * What to show for a failure: the translation key of a known reason, else
 * the API's own (English) message for an unknown reason, else nothing (the
 * caller shows its generic text).
 */
export function reasonDisplay(e: unknown): { key: string } | { message: string } | null {
  const code = reasonOf(e)
  if (!code) return null
  const known = knownReason(code)
  if (known) return { key: `ccgateway.reason.${known}` }
  const message = (e as { message?: unknown } | null)?.message
  return { message: typeof message === 'string' && message ? message : code }
}

// ---------------------------------------------------------------- steps

export interface CcgFlow {
  mode: CcgMode
  /** New account: a proxy is chosen in the editor (reauth: always true). */
  proxy: boolean
  /** The draft runtime exists (reauth: always true). */
  created: boolean
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

/** Container status of GET .../status → phase. */
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
  if (f.mode === 'draft' && !f.proxy) return 'proxy'
  if (!f.created || f.container !== 'ready') return 'container'
  if (f.loggedIn && !f.hasSession) return 'done'
  if (f.hasSession && f.opened) return 'code'
  return 'login'
}

/** The draft is ready and signed in to Claude: a new account may be saved with it, a re-authorization committed. */
export function readyToSave(f: CcgFlow): boolean {
  return f.loggedIn === true && currentStep(f) === 'done'
}

/** State of every step: earlier ones done, the current one current (or error), later ones todo. Steps of the other mode are done. */
export function stepStates(f: CcgFlow): Record<CcgStep, CcgStepState> {
  const steps = stepsOf(f.mode)
  const cur = currentStep(f)
  const at = steps.indexOf(cur)
  const out: Record<CcgStep, CcgStepState> = { proxy: 'done', container: 'done', login: 'done', code: 'done', done: 'done' }
  steps.forEach((s, i) => {
    if (s === 'done' && cur === 'done') out[s] = 'done'
    else if (i < at) out[s] = 'done'
    else if (i > at) out[s] = 'todo'
    else out[s] = f.errorStep === s || (s === 'container' && f.created && (f.container === 'error' || f.container === 'blocked')) ? 'error' : 'current'
  })
  return out
}

/**
 * Why per-account containers cannot work, from GET /system/ccgateway/remote-config; [] when configured.
 * Per-account containers are the only mode: the controller connection (CONTRACTS §53.9) and the legacy
 * local Docker / SSH connections saved with them are configured; a configuration saved without them
 * (the removed shared container) is not configured.
 */
export type CcgSetupProblem = 'docker' | 'adminKey'
export function setupProblems(cfg: { account_runtimes?: boolean; mode?: string; has_admin_key?: boolean } | null | undefined): CcgSetupProblem[] {
  if (!cfg) return []
  const out: CcgSetupProblem[] = []
  if (!cfg.account_runtimes || (cfg.mode !== 'ssh' && cfg.mode !== 'local' && cfg.mode !== 'controller')) out.push('docker')
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
