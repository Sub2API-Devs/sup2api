import { describe, expect, it } from 'vitest'
import { controllerFormProblem, controllerInstallBody, installStage, validControllerCa, validControllerHost } from './controllerMode'

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIQ\n-----END CERTIFICATE-----\n'
const form = (over: Partial<Parameters<typeof controllerFormProblem>[0]> = {}) => ({ host: 'ccg.example.com', port: 443, account_runtimes: true, admin_key: '', has_admin_key: true, controller_ca: '', ...over })

describe('control panel input', () => {
  it('accepts domain names and IP literals only', () => {
    for (const h of ['ccg.example.com', '203.0.113.7', '2001:db8::1', 'localhost', ' ccg.example.com ']) expect(validControllerHost(h), h).toBe(true)
    for (const h of ['', 'https://ccg.example.com', 'ccg.example.com:443', 'ccg.example.com/x', '[2001:db8::1]', 'a_b.example.com', '*.example.com', 'a..b', 'user@host', 'a b']) expect(validControllerHost(h), h).toBe(false)
  })

  it('checks the controller form like §53.2', () => {
    expect(controllerFormProblem(form())).toBeNull()
    expect(controllerFormProblem(form({ host: '' }))).toBe('target')
    expect(controllerFormProblem(form({ port: 0 }))).toBe('target')
    expect(controllerFormProblem(form({ port: 65536 }))).toBe('target')
    expect(controllerFormProblem(form({ port: Number.NaN }))).toBe('target')
    expect(controllerFormProblem(form({ account_runtimes: false }))).toBe('runtimes')
    expect(controllerFormProblem(form({ has_admin_key: false }))).toBe('adminKey')
    expect(controllerFormProblem(form({ has_admin_key: false, admin_key: 'k' }))).toBeNull()
    expect(controllerFormProblem(form({ controller_ca: 'not a pem' }))).toBe('ca')
    expect(controllerFormProblem(form({ controller_ca: PEM }))).toBeNull()
  })

  it('takes one or more CERTIFICATE blocks up to 64 KiB', () => {
    expect(validControllerCa('')).toBe(true)
    expect(validControllerCa(PEM + PEM)).toBe(true)
    expect(validControllerCa('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')).toBe(false)
    expect(validControllerCa(PEM + 'x'.repeat(64 * 1024))).toBe(false)
  })

  it('builds the install request', () => {
    expect(controllerInstallBody({ host: ' 203.0.113.7 ', port: 443, email: '' })).toEqual({ host: '203.0.113.7', port: 443 })
    expect(controllerInstallBody({ host: 'ccg.example.com', port: '', email: ' ops@example.com ' })).toEqual({ host: 'ccg.example.com', port: 443, email: 'ops@example.com' })
    expect(controllerInstallBody({ host: 'ccg.example.com', port: 8443, email: '' })).toEqual({ host: 'ccg.example.com', port: 8443 })
    expect(controllerInstallBody({ host: 'ccg.example.com', port: 70000, email: '' })).toBeNull()
    expect(controllerInstallBody({ host: 'ccg.example.com', port: 443, email: 'not-an-email' })).toBeNull()
    expect(controllerInstallBody({ host: 'ccg.example.com', port: 443, email: 'a b@example.com' })).toBeNull()
    expect(controllerInstallBody({ host: 'https://x', port: 443, email: '' })).toBeNull()
  })

  it('reads the failed stage of gateway_unreachable', () => {
    expect(installStage({ details: { reason: 'gateway_unreachable', stage: 'tls' } })).toBe('tls')
    expect(installStage({ details: { stage: 'other' } })).toBe('')
    expect(installStage(null)).toBe('')
  })
})
