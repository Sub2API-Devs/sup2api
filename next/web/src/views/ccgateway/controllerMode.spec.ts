import { describe, expect, it } from 'vitest'
import { basePathOf, controllerFormProblem, controllerInstallBody, defaultInstallHost, endpointScheme, formatControllerEndpoint, installEmailApplies, installStage, isDomainHost, normalizeBasePath, parseControllerEndpoint, schemeOf, validControllerCa, validControllerHost, type ControllerInstallInput, type ParsedEndpoint } from './controllerMode'

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIQ\n-----END CERTIFICATE-----\n'
const FINGERPRINT = 'SHA256:' + 'A'.repeat(43)
const form = (over: Partial<Parameters<typeof controllerFormProblem>[0]> = {}) => ({ endpoint: { scheme: 'https', host: 'ccg.example.com', port: 443, base_path: '' } as ParsedEndpoint | null, admin_key: '', has_admin_key: true, controller_ca: '', ...over })
const ssh = (over: Partial<ControllerInstallInput['ssh']> = {}): ControllerInstallInput['ssh'] => ({ host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'password', password: 'pw', private_key: '', passphrase: '', host_key_fingerprint: FINGERPRINT, ...over })
const input = (over: Partial<ControllerInstallInput> = {}): ControllerInstallInput => ({ method: 'ssh', ssh: ssh(), savedSshHost: '', scheme: 'https', host: '', port: '', email: '', ...over })
const body = (over: Partial<ControllerInstallInput> = {}) => {
  const r = controllerInstallBody(input(over))
  if (!('body' in r)) throw new Error(`unexpected problem ${r.problem}`)
  return r.body
}
const problem = (over: Partial<ControllerInstallInput> = {}) => {
  const r = controllerInstallBody(input(over))
  return 'problem' in r ? r.problem : null
}

describe('controller connection input', () => {
  it('accepts domain names and IP literals only', () => {
    for (const h of ['ccg.example.com', '203.0.113.7', '2001:db8::1', 'localhost', ' ccg.example.com ']) expect(validControllerHost(h), h).toBe(true)
    for (const h of ['', 'https://ccg.example.com', 'ccg.example.com:443', 'ccg.example.com/x', '[2001:db8::1]', 'a_b.example.com', '*.example.com', 'a..b', 'user@host', 'a b']) expect(validControllerHost(h), h).toBe(false)
  })

  it('tells domain names apart from IP literals and single labels', () => {
    for (const h of ['ccg.example.com', 'a.b']) expect(isDomainHost(h), h).toBe(true)
    for (const h of ['203.0.113.7', '2001:db8::1', 'localhost', '', 'https://x.y']) expect(isDomainHost(h), h).toBe(false)
  })

  it('reads the saved scheme, https by default', () => {
    expect(schemeOf({ scheme: 'http' })).toBe('http')
    for (const c of [{ scheme: 'https' }, { scheme: '' }, {}, null, { scheme: 'ftp' }]) expect(schemeOf(c)).toBe('https')
  })

  it('parses the controller endpoint URL', () => {
    const cases: Array<[string, Omit<ParsedEndpoint, 'base_path'> & { base_path?: string }]> = [
      ['https://15.204.107.38:18443', { scheme: 'https', host: '15.204.107.38', port: 18443 }],
      ['https://ccmax.example.com', { scheme: 'https', host: 'ccmax.example.com', port: 443 }],
      ['http://ccmax.example.com', { scheme: 'http', host: 'ccmax.example.com', port: 80 }],
      ['http://10.0.0.5:18080/', { scheme: 'http', host: '10.0.0.5', port: 18080 }],
      ['  HTTPS://ccmax.example.com:8443  ', { scheme: 'https', host: 'ccmax.example.com', port: 8443 }],
      ['https://[2001:db8::1]:18443', { scheme: 'https', host: '2001:db8::1', port: 18443 }],
      ['https://[2001:db8::1]', { scheme: 'https', host: '2001:db8::1', port: 443 }],
      ['http://localhost:18080', { scheme: 'http', host: 'localhost', port: 18080 }],
      // Path prefix of a controller behind a reverse proxy.
      ['https://15.204.107.38:18443/controller', { scheme: 'https', host: '15.204.107.38', port: 18443, base_path: '/controller' }],
      ['https://ccmax.example.com/ccg/controller/', { scheme: 'https', host: 'ccmax.example.com', port: 443, base_path: '/ccg/controller' }],
      ['http://[2001:db8::1]/a.b_c~d-e', { scheme: 'http', host: '2001:db8::1', port: 80, base_path: '/a.b_c~d-e' }],
      ['https://h.example.com/1/2/3/4/5/6/7/8', { scheme: 'https', host: 'h.example.com', port: 443, base_path: '/1/2/3/4/5/6/7/8' }]
    ]
    for (const [raw, want] of cases) expect(parseControllerEndpoint(raw), raw).toEqual({ base_path: '', ...want })
    for (const raw of [
      '', 'ccmax.example.com', '15.204.107.38:18443', 'ftp://ccmax.example.com', 'ws://ccmax.example.com', '//ccmax.example.com',
      'https://', 'https://:443', 'https://ccmax.example.com//', 'https://ccmax.example.com/a//b', 'https://ccmax.example.com//a',
      'https://ccmax.example.com/a/../b', 'https://ccmax.example.com/..', 'https://ccmax.example.com/./a', 'https://ccmax.example.com/a%20b',
      'https://ccmax.example.com/a b', 'https://ccmax.example.com/a:b', 'https://ccmax.example.com/1/2/3/4/5/6/7/8/9',
      'https://ccmax.example.com?x=1', 'https://ccmax.example.com/a?x=1', 'https://ccmax.example.com#frag', 'https://ccmax.example.com/a#frag',
      'https://user@ccmax.example.com', 'https://user:pw@ccmax.example.com',
      'https://ccmax.example.com:0', 'https://ccmax.example.com:65536', 'https://ccmax.example.com:abc', 'https://ccmax.example.com:',
      'https://2001:db8::1', 'https://2001:db8::1:443', 'https://[ccmax.example.com]', 'https://[]', 'https://a_b.example.com', 'https://*.example.com',
      'https://cc max.example.com', 'https://a..b'
    ]) expect(parseControllerEndpoint(raw), raw).toBeNull()
  })

  it('normalizes the saved path prefix', () => {
    expect(normalizeBasePath('')).toBe('')
    expect(normalizeBasePath('/')).toBe('')
    expect(normalizeBasePath('controller')).toBe('/controller')
    expect(normalizeBasePath('/a/b/')).toBe('/a/b')
    expect(normalizeBasePath('/a/../b')).toBeNull()
    expect(basePathOf({ base_path: 'controller/' })).toBe('/controller')
    for (const c of [{}, null, { base_path: 1 }, { base_path: '/a%2f' }]) expect(basePathOf(c)).toBe('')
  })

  it('shows the endpoint without the default port of its scheme', () => {
    expect(formatControllerEndpoint('https', 'ccmax.example.com', 443)).toBe('https://ccmax.example.com')
    expect(formatControllerEndpoint('https', '15.204.107.38', 18443)).toBe('https://15.204.107.38:18443')
    expect(formatControllerEndpoint('http', 'ccmax.example.com', 80)).toBe('http://ccmax.example.com')
    expect(formatControllerEndpoint('http', 'ccmax.example.com', 443)).toBe('http://ccmax.example.com:443')
    expect(formatControllerEndpoint('https', '2001:db8::1', 443)).toBe('https://[2001:db8::1]')
    expect(formatControllerEndpoint('http', '2001:db8::1', 18080)).toBe('http://[2001:db8::1]:18080')
    expect(formatControllerEndpoint('https', '15.204.107.38', 18443, '/controller')).toBe('https://15.204.107.38:18443/controller')
    expect(formatControllerEndpoint('https', 'ccmax.example.com', 443, '/a/b')).toBe('https://ccmax.example.com/a/b')
    // Round trip.
    for (const raw of ['https://ccmax.example.com', 'http://[2001:db8::1]:18080', 'https://15.204.107.38:18443', 'https://15.204.107.38:18443/controller', 'http://ccmax.example.com/a/b']) {
      const p = parseControllerEndpoint(raw)!
      expect(formatControllerEndpoint(p.scheme, p.host, p.port, p.base_path)).toBe(raw)
    }
  })

  it('tells the scheme being typed', () => {
    expect(endpointScheme('http://')).toBe('http')
    expect(endpointScheme(' HTTP://x')).toBe('http')
    for (const raw of ['', 'https://x', 'x', 'httpx://']) expect(endpointScheme(raw), raw).toBe('https')
  })

  it('checks the connection form like §53.2 / §53.9', () => {
    expect(controllerFormProblem(form())).toBeNull()
    expect(controllerFormProblem(form({ endpoint: null }))).toBe('target')
    expect(controllerFormProblem(form({ has_admin_key: false }))).toBe('adminKey')
    expect(controllerFormProblem(form({ has_admin_key: false, admin_key: 'k' }))).toBeNull()
    expect(controllerFormProblem(form({ controller_ca: 'not a pem' }))).toBe('ca')
    expect(controllerFormProblem(form({ controller_ca: PEM }))).toBeNull()
    // HTTP has no certificate: whatever is left in the hidden field is not sent nor checked.
    const http = { scheme: 'http' as const, host: 'ccg.example.com', port: 80, base_path: '' }
    expect(controllerFormProblem(form({ endpoint: http, controller_ca: 'not a pem' }))).toBeNull()
    expect(controllerFormProblem(form({ endpoint: http, has_admin_key: false }))).toBe('adminKey')
  })

  it('takes one or more CERTIFICATE blocks up to 64 KiB', () => {
    expect(validControllerCa('')).toBe(true)
    expect(validControllerCa(PEM + PEM)).toBe(true)
    expect(validControllerCa('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')).toBe(false)
    expect(validControllerCa(PEM + 'x'.repeat(64 * 1024))).toBe(false)
  })

  it('reads the failed stage of gateway_unreachable', () => {
    expect(installStage({ details: { reason: 'gateway_unreachable', stage: 'tls' } })).toBe('tls')
    expect(installStage({ details: { stage: 'other' } })).toBe('')
    expect(installStage(null)).toBe('')
  })
})

describe('controller install request (§53.9)', () => {
  it('installs over SSH with the credentials of the request and an automatic port', () => {
    expect(body()).toEqual({
      method: 'ssh', scheme: 'https', host: '203.0.113.7', port: 0,
      ssh: { host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'password', password: 'pw', host_key_fingerprint: FINGERPRINT }
    })
  })

  it('sends only the secrets of the chosen SSH authentication', () => {
    const key = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----'
    expect(body({ ssh: ssh({ auth_mode: 'private_key', password: 'stale', private_key: key }) }).ssh).toEqual({ host: '203.0.113.7', port: 22, user: 'root', auth_mode: 'private_key', private_key: key, host_key_fingerprint: FINGERPRINT })
    expect(body({ ssh: ssh({ auth_mode: 'private_key', private_key: key, passphrase: 'secret' }) }).ssh).toMatchObject({ private_key: key, passphrase: 'secret' })
    expect(body({ ssh: ssh({ password: 'pw', private_key: key, passphrase: 'x' }) }).ssh).not.toHaveProperty('private_key')
  })

  it('installs locally on 127.0.0.1 by default, with a chosen port and protocol', () => {
    expect(body({ method: 'local', scheme: 'http', port: 18080 })).toEqual({ method: 'local', scheme: 'http', host: '127.0.0.1', port: 18080 })
    expect(body({ method: 'local', host: ' 10.0.0.5 ', port: '8443' })).toEqual({ method: 'local', scheme: 'https', host: '10.0.0.5', port: 8443 })
    expect(body({ method: 'local', port: 0 }).port).toBe(0)
    expect(body({ method: 'local' })).not.toHaveProperty('ssh')
  })

  it('uses the saved SSH connection without naming a method (legacy flow)', () => {
    expect(body({ method: 'saved', ssh: ssh({ host: '', user: '', password: '' }), savedSshHost: '198.51.100.4' })).toEqual({ scheme: 'https', host: '198.51.100.4', port: 0 })
  })

  it('takes a connection address other than the SSH host', () => {
    expect(body({ host: 'ccg.example.com' }).host).toBe('ccg.example.com')
    expect(defaultInstallHost({ method: 'ssh', ssh: ssh({ host: ' h.example.com ' }), savedSshHost: '' })).toBe('h.example.com')
    expect(defaultInstallHost({ method: 'local', ssh: ssh(), savedSshHost: '' })).toBe('127.0.0.1')
  })

  it('sends the ACME email for HTTPS on a domain name only', () => {
    expect(body({ host: 'ccg.example.com', email: ' ops@example.com ' }).email).toBe('ops@example.com')
    expect(body({ email: 'ops@example.com' })).not.toHaveProperty('email')
    expect(body({ host: 'ccg.example.com', scheme: 'http', email: 'ops@example.com' })).not.toHaveProperty('email')
    expect(problem({ host: 'ccg.example.com', email: 'not-an-email' })).toBe('email')
    expect(installEmailApplies('https', 'ccg.example.com')).toBe(true)
    expect(installEmailApplies('https', '203.0.113.7')).toBe(false)
    expect(installEmailApplies('http', 'ccg.example.com')).toBe(false)
  })

  it('refuses invalid input', () => {
    expect(problem({ ssh: ssh({ host: '' }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ user: '' }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ user: 'a b' }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ port: 70000 }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ host_key_fingerprint: '' }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ host_key_fingerprint: 'SHA256:short' }) })).toBe('ssh')
    expect(problem({ ssh: ssh({ password: '' }) })).toBe('sshCredentials')
    expect(problem({ ssh: ssh({ auth_mode: 'private_key', private_key: '  ' }) })).toBe('sshCredentials')
    expect(problem({ host: 'https://x' })).toBe('host')
    expect(problem({ method: 'saved', savedSshHost: '' })).toBe('host')
    expect(problem({ port: 70000 })).toBe('port')
    expect(problem({ port: '1.5' })).toBe('port')
    expect(problem({ port: -1 })).toBe('port')
  })
})
