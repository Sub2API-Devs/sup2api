import { describe, expect, it } from 'vitest'
import type { CcgRuntimeImages } from '@/api/types'
import { componentImages, runtimeState, shortDigest } from './runtimeInstall'

const hex = 'abcdef0123456789'.repeat(4)
const r = (over: Partial<CcgRuntimeImages> = {}): CcgRuntimeImages => ({
  expected: { controller: `ghcr.io/x/controller@sha256:${hex}`, app: `ghcr.io/x/app@sha256:${hex}`, egress: `ghcr.io/x/egress@sha256:${hex}` },
  installed: { controller_image: `ghcr.io/x/controller@sha256:${'1'.repeat(64)}`, app_image: `ghcr.io/x/app@sha256:${hex}`, egress_image: '', version: '0.1.0' },
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
  })

  it('pairs the expected and installed image of each component', () => {
    expect(componentImages(r(), 'controller')).toEqual({ expected: `ghcr.io/x/controller@sha256:${hex}`, installed: `ghcr.io/x/controller@sha256:${'1'.repeat(64)}` })
    expect(componentImages(r(), 'egress').installed).toBe('')
    expect(componentImages(r({ installed: null }), 'app').installed).toBe('')
  })
})
