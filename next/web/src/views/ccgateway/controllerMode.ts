// Control-panel mode of the CCGateway connection (CONTRACTS §53): input rules
// of the settings form and of the install card, pure so they are unit-tested
// apart from the component. The core validates again; these only stop input
// the core is bound to refuse.

/** Largest controller_ca the core accepts (§53.2). */
export const CONTROLLER_CA_MAX_BYTES = 64 * 1024
export const DEFAULT_CONTROLLER_PORT = 443
/** ACME account email (§53.3). */
const EMAIL_RE = /^[^@\s]{1,64}@[A-Za-z0-9.-]{1,190}$/
/** DNS name or IPv4 literal: letters, digits, dots and dashes (no underscores, wildcards, scheme, port or path). */
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/
/** IPv6 literal without brackets. */
const IPV6_RE = /^[0-9A-Fa-f:.]+$/

/** Domain name or IP literal, as the control panel address (§53.2, §53.3). */
export function validControllerHost(host: string): boolean {
  const h = host.trim()
  if (!h || h.length > 253) return false
  if (h.includes(':')) return IPV6_RE.test(h) && (h.match(/:/g) || []).length >= 2
  return NAME_RE.test(h) && !h.includes('..')
}

export function validPort(port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535
}

/** Optional PEM of root certificates: '' (keep / system roots) or at least one CERTIFICATE block, ≤ 64 KiB. */
export function validControllerCa(pem: string): boolean {
  const v = pem.trim()
  if (!v) return true
  if (new TextEncoder().encode(v).length > CONTROLLER_CA_MAX_BYTES) return false
  return /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.test(v)
}

export type ControllerFormProblem = 'target' | 'runtimes' | 'adminKey' | 'ca'
/** First problem of the controller form, or null (§53.2). */
export function controllerFormProblem(input: { host: string; port: unknown; account_runtimes: boolean; admin_key: string; has_admin_key: boolean; controller_ca: string }): ControllerFormProblem | null {
  if (!validControllerHost(input.host) || !validPort(input.port)) return 'target'
  if (!input.account_runtimes) return 'runtimes'
  if (!input.admin_key && !input.has_admin_key) return 'adminKey'
  if (!validControllerCa(input.controller_ca)) return 'ca'
  return null
}

export interface ControllerInstallBody { host: string; port: number; email?: string }
/** Body of POST /system/ccgateway/controller/install, or null when the input is invalid. */
export function controllerInstallBody(input: { host: string; port: number | string; email: string }): ControllerInstallBody | null {
  const host = input.host.trim()
  const port = typeof input.port === 'string' && input.port.trim() === '' ? DEFAULT_CONTROLLER_PORT : Number(input.port)
  const email = input.email.trim()
  if (!validControllerHost(host) || !validPort(port)) return null
  if (email && !EMAIL_RE.test(email)) return null
  return email ? { host, port, email } : { host, port }
}

/** Stage of a gateway_unreachable failure (details.stage), or ''. */
export function installStage(e: unknown): 'connect' | 'tls' | 'http' | '' {
  const s = (e as { details?: { stage?: unknown } } | null)?.details?.stage
  return s === 'connect' || s === 'tls' || s === 'http' ? s : ''
}
