// Connection to the CCGateway controller (CONTRACTS §53, §53.9): input rules of
// the "controller connection" form (one endpoint URL plus its access key) and of
// the "install the controller" form, pure so they are unit-tested apart from the
// component. The core validates again; these only stop input the core is bound
// to refuse.
//
// There is one way to connect (the controller endpoint over HTTPS, or HTTP on a
// trusted network) and two ways to install it (local Docker, remote SSH). SSH
// credentials only travel in the install request and are never saved.

/** Largest controller_ca the core accepts (§53.2). */
export const CONTROLLER_CA_MAX_BYTES = 64 * 1024
export const DEFAULT_CONTROLLER_PORT = 443
export const DEFAULT_SSH_PORT = 22
/** Where the core looks for a free port when the install port is left blank (§53.9). */
export const AUTO_PORT_START = { https: 18443, http: 18080 } as const
/** Install connection address when the core and the controller share the machine (§53.9). */
export const LOCAL_INSTALL_HOST = '127.0.0.1'

export type ControllerScheme = 'https' | 'http'
/** Saved scheme: '' and anything unknown mean https (§53.9). */
export function schemeOf(cfg: { scheme?: unknown } | null | undefined): ControllerScheme {
  return cfg?.scheme === 'http' ? 'http' : 'https'
}

/** ACME account email (§53.3). */
const EMAIL_RE = /^[^@\s]{1,64}@[A-Za-z0-9.-]{1,190}$/
/** DNS name or IPv4 literal: letters, digits, dots and dashes (no underscores, wildcards, scheme, port or path). */
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/
/** IPv6 literal without brackets. */
const IPV6_RE = /^[0-9A-Fa-f:.]+$/
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/
/** OpenSSH SHA-256 host key fingerprint (what the core's SSH client compares). */
const SSH_FINGERPRINT_RE = /^SHA256:[A-Za-z0-9+/]{43}$/

/** Domain name or IP literal, as the controller address (§53.2, §53.3). */
export function validControllerHost(host: string): boolean {
  const h = host.trim()
  if (!h || h.length > 253) return false
  if (h.includes(':')) return IPV6_RE.test(h) && (h.match(/:/g) || []).length >= 2
  return NAME_RE.test(h) && !h.includes('..')
}

/** A domain name (not an IP literal, not a single label like localhost): Caddy can get it an ACME certificate. */
export function isDomainHost(host: string): boolean {
  const h = host.trim()
  return validControllerHost(h) && !h.includes(':') && !IPV4_RE.test(h) && h.includes('.')
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

/** Port implied by an endpoint URL without one. */
export const DEFAULT_SCHEME_PORT: Record<ControllerScheme, number> = { https: 443, http: 80 }
export interface ParsedEndpoint {
  scheme: ControllerScheme
  host: string
  port: number
  /** Path prefix of a controller behind a reverse proxy: '' or '/seg[/seg…]' (1–8 segments), no trailing slash. */
  base_path: string
}
// scheme://host[:port][/prefix][/]: no user info, query or fragment; IPv6 only in brackets.
const ENDPOINT_RE = /^(https?):\/\/(\[[^\]/?#@]*\]|[^/?#@:[\]]*)(?::(\d{1,5}))?(\/[^?#]*)?$/i
const PATH_SEGMENT_RE = /^[A-Za-z0-9._~-]+$/
const MAX_PATH_SEGMENTS = 8

/** Normalizes a path prefix ('/a/b', 'a/b/', '') to '' or '/a/b'; null when it is not 1–8 plain segments. */
export function normalizeBasePath(raw: string): string | null {
  const path = raw.trim().replace(/^\//, '').replace(/\/$/, '')
  if (!path) return ''
  const segments = path.split('/')
  if (segments.length > MAX_PATH_SEGMENTS || segments.some(s => !PATH_SEGMENT_RE.test(s) || s === '.' || s === '..')) return null
  return '/' + segments.join('/')
}

/** Saved path prefix (base_path of GET remote-config), normalized; '' when absent or not valid. */
export function basePathOf(cfg: { base_path?: unknown } | null | undefined): string {
  return typeof cfg?.base_path === 'string' ? normalizeBasePath(cfg.base_path) ?? '' : ''
}

/**
 * Parses the "controller endpoint" input, e.g. https://15.204.107.38:18443,
 * https://ccmax.example.com or https://15.204.107.38:18443/controller, into
 * what PUT remote-config takes; null when invalid.
 */
export function parseControllerEndpoint(raw: string): ParsedEndpoint | null {
  const m = ENDPOINT_RE.exec(raw.trim())
  if (!m) return null
  const scheme = m[1]!.toLowerCase() as ControllerScheme
  const bracketed = m[2]!.startsWith('[')
  const host = bracketed ? m[2]!.slice(1, -1) : m[2]!
  if (!validControllerHost(host) || host !== host.trim() || bracketed !== host.includes(':')) return null
  const port = m[3] === undefined ? DEFAULT_SCHEME_PORT[scheme] : Number(m[3])
  if (!validPort(port)) return null
  // Only the one trailing slash goes; '//' and empty segments are not a prefix.
  const path = (m[4] || '').replace(/\/$/, '')
  const base_path = path ? normalizeBasePath(path) : ''
  if (base_path === null || (path && base_path !== path)) return null
  return { scheme, host, port, base_path }
}

/** The endpoint as the input shows it: the default port of the scheme left out, IPv6 in brackets, with its path prefix. */
export function formatControllerEndpoint(scheme: ControllerScheme, host: string, port: number, basePath = ''): string {
  const h = host.includes(':') ? `[${host}]` : host
  return (port === DEFAULT_SCHEME_PORT[scheme] ? `${scheme}://${h}` : `${scheme}://${h}:${port}`) + basePath
}

/** Scheme the input is heading for, even before it parses (to show the HTTP warning while typing). */
export function endpointScheme(raw: string): ControllerScheme {
  return /^\s*http:\/\//i.test(raw) ? 'http' : 'https'
}

export type ControllerFormProblem = 'target' | 'adminKey' | 'ca'
/** First problem of the controller connection form, or null (§53.2, §53.9). The certificate only counts over HTTPS. */
export function controllerFormProblem(input: { endpoint: ParsedEndpoint | null; admin_key: string; has_admin_key: boolean; controller_ca: string }): ControllerFormProblem | null {
  if (!input.endpoint) return 'target'
  if (!input.admin_key && !input.has_admin_key) return 'adminKey'
  if (input.endpoint.scheme === 'https' && !validControllerCa(input.controller_ca)) return 'ca'
  return null
}

/**
 * How to install: on the core's machine, over SSH with credentials typed for
 * this request, or (legacy) over the SSH connection still saved in the
 * configuration, which the request does not name (§53.9 compatibility).
 */
export type InstallMethod = 'local' | 'ssh' | 'saved'
export interface InstallSshInput {
  host: string
  port: number | string
  user: string
  auth_mode: 'password' | 'private_key'
  password: string
  private_key: string
  passphrase: string
  host_key_fingerprint: string
}
export interface InstallSshBody {
  host: string
  port: number
  user: string
  auth_mode: 'password' | 'private_key'
  password?: string
  private_key?: string
  passphrase?: string
  host_key_fingerprint: string
}
export interface ControllerInstallBody {
  method?: 'ssh' | 'local'
  ssh?: InstallSshBody
  scheme: ControllerScheme
  host: string
  /** 0: the core picks a free port. */
  port: number
  email?: string
}
export interface ControllerInstallInput {
  method: InstallMethod
  ssh: InstallSshInput
  /** Host of the saved SSH connection (method 'saved'). */
  savedSshHost: string
  scheme: ControllerScheme
  /** Address the core connects to afterwards; blank: the default of the method. */
  host: string
  /** Blank or 0: automatic. */
  port: number | string
  email: string
}
export type ControllerInstallProblem = 'ssh' | 'sshCredentials' | 'host' | 'port' | 'email'

/** Connection address used when the install form leaves it blank (§53.9). */
export function defaultInstallHost(input: Pick<ControllerInstallInput, 'method' | 'ssh' | 'savedSshHost'>): string {
  if (input.method === 'local') return LOCAL_INSTALL_HOST
  if (input.method === 'saved') return input.savedSshHost.trim()
  return input.ssh.host.trim()
}

/** The ACME email applies to HTTPS on a domain name only. */
export function installEmailApplies(scheme: ControllerScheme, host: string): boolean {
  return scheme === 'https' && isDomainHost(host)
}

function sshBody(ssh: InstallSshInput): InstallSshBody | ControllerInstallProblem {
  const host = ssh.host.trim(), user = ssh.user.trim(), fingerprint = ssh.host_key_fingerprint.trim()
  const port = typeof ssh.port === 'string' && ssh.port.trim() === '' ? DEFAULT_SSH_PORT : Number(ssh.port)
  if (!validControllerHost(host) || host.length > 253 || !validPort(port) || !user || user.length > 128 || /\s/.test(user) || !SSH_FINGERPRINT_RE.test(fingerprint)) return 'ssh'
  const base = { host, port, user, auth_mode: ssh.auth_mode, host_key_fingerprint: fingerprint }
  if (ssh.auth_mode === 'password') return ssh.password ? { ...base, password: ssh.password } : 'sshCredentials'
  if (!ssh.private_key.trim()) return 'sshCredentials'
  return ssh.passphrase ? { ...base, private_key: ssh.private_key, passphrase: ssh.passphrase } : { ...base, private_key: ssh.private_key }
}

/** Body of POST /system/ccgateway/controller/install (§53.9), or the first input problem. */
export function controllerInstallBody(input: ControllerInstallInput): { body: ControllerInstallBody } | { problem: ControllerInstallProblem } {
  let ssh: InstallSshBody | undefined
  if (input.method === 'ssh') {
    const s = sshBody(input.ssh)
    if (typeof s === 'string') return { problem: s }
    ssh = s
  }
  const host = input.host.trim() || defaultInstallHost(input)
  if (!validControllerHost(host)) return { problem: 'host' }
  const rawPort = typeof input.port === 'string' ? input.port.trim() : input.port
  const port = rawPort === '' ? 0 : Number(rawPort)
  if (port !== 0 && !validPort(port)) return { problem: 'port' }
  const body: ControllerInstallBody = { scheme: input.scheme, host, port }
  // The legacy flow is chosen by leaving the method out (§53.9 compatibility).
  if (input.method === 'ssh') Object.assign(body, { method: 'ssh', ssh })
  else if (input.method === 'local') body.method = 'local'
  const email = input.email.trim()
  if (email && installEmailApplies(input.scheme, host)) {
    if (!EMAIL_RE.test(email)) return { problem: 'email' }
    body.email = email
  }
  return { body }
}

/** Stage of a gateway_unreachable failure (details.stage), or ''. */
export function installStage(e: unknown): 'connect' | 'tls' | 'http' | '' {
  const s = (e as { details?: { stage?: unknown } } | null)?.details?.stage
  return s === 'connect' || s === 'tls' || s === 'http' ? s : ''
}
