import { describe, expect, it } from 'vitest'
import type { CcgRuntimeImages } from '@/api/types'
import { BUNDLED_ROLES, BUNDLED_TIMEOUT_MS, bundledAllEnabled, bundledState, componentImages, runtimeState, shortDigest, displayImage } from './runtimeInstall'

const hex = 'abcdef0123456789'.repeat(4)
const r = (over: Partial<CcgRuntimeImages> = {}): CcgRuntimeImages => ({
  expected: { controller: `ghcr.io/x/controller@sha256:${hex}`, app: `ghcr.io/x/app@sha256:${hex}`, egress: `ghcr.io/x/egress@sha256:${hex}` },
  installed: { controller_image: `ghcr.io/x/controller@sha256:${'1'.repeat(64)}`, app_image: `ghcr.io/x/app@sha256:${hex}`, egress_image: `ghcr.io/x/egress@sha256:${hex}`, version: '0.1.0' },
  up_to_date: false,
  ...over
})

describe('CCGateway runtime images', () => {
  it('tells not installed, up to date, outdated and unknown apart', () => {
    expect(runtimeState(null)).toBe('unknown')
    expect(runtimeState(r({ installed: null }))).toBe('notInstalled')
    expect(runtimeState(r({ installed: null, reason: 'ssh_failed' }))).toBe('unknown')
    expect(runtimeState(r())).toBe('outdated')
    expect(runtimeState(r({ up_to_date: true }))).toBe('upToDate')
  })

  it('shortens digests to 12 hex characters', () => {
    expect(shortDigest(`ghcr.io/x/app:0.2.0@sha256:${hex}`)).toBe('abcdef012345')
    expect(shortDigest(`sha256:${hex.toUpperCase()}`)).toBe('abcdef012345')
    expect(shortDigest(hex)).toBe('abcdef012345')
    expect(shortDigest('ghcr.io/x/app:latest')).toBe('')
    expect(shortDigest(undefined)).toBe('')
    expect(displayImage('ccgateway-worker:0.1.63')).toBe('ccgateway-worker:0.1.63')
    expect(runtimeState(r({ installed: { controller_image: '', app_image: '', egress_image: '', version: '' }, up_to_date: true }))).toBe('unknown')
  })

  it('pairs the expected and installed image of each component', () => {
    expect(componentImages(r(), 'controller')).toEqual({ expected: `ghcr.io/x/controller@sha256:${hex}`, installed: `ghcr.io/x/controller@sha256:${'1'.repeat(64)}` })
    expect(componentImages(r({ installed: null }), 'egress').installed).toBe('')
    expect(componentImages(r({ installed: null }), 'app').installed).toBe('')
  })

  it('tells whether each bundled image is the controller image', () => {
    const bundled = { version: '0.1.16', images: { app: 'ccgateway-app:0.1.16', egress: 'ccgateway-egress:0.1.16', controller: 'ccgateway-controller:0.1.16', gateway: 'caddy:2.11.7-alpine' } }
    const on = r({ bundled, installed: { controller_image: 'ccgateway-controller:0.1.16', app_image: 'ccgateway-app:0.1.16', egress_image: 'ccgateway-egress:0.1.15', version: '0.1.16' } })
    expect(bundledState(on, 'app')).toBe('enabled')
    expect(bundledState(on, 'controller')).toBe('enabled')
    expect(bundledState(on, 'egress')).toBe('notEnabled')
    expect(bundledState(on, 'gateway')).toBe('installOnly')
    expect(bundledAllEnabled(on)).toBe(false)
    expect(bundledAllEnabled(r({ bundled, installed: { controller_image: bundled.images.controller, app_image: bundled.images.app, egress_image: bundled.images.egress } }))).toBe(true)
    // Nothing to compare with: no package images, no controller state, or a role the package lacks.
    expect(bundledState(r({ bundled: null }), 'app')).toBe('unknown')
    expect(bundledState(r({ bundled }), 'app')).toBe('notEnabled')
    expect(bundledState(r({ bundled, installed: null }), 'app')).toBe('unknown')
    expect(bundledState(r({ bundled: { version: '0.1.16', images: {} } }), 'app')).toBe('unknown')
    expect(bundledState(r({ bundled, installed: { controller_image: '', app_image: '', egress_image: '' } }), 'app')).toBe('unknown')
    expect(BUNDLED_ROLES).toEqual(['app', 'egress', 'controller', 'gateway'])
    expect(BUNDLED_TIMEOUT_MS).toBeGreaterThan(25 * 60_000)
  })
})
