import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SStatusBadge from './SStatusBadge.vue'
import SBadge from './SBadge.vue'
import { statusTone } from './status'

describe('SStatusBadge', () => {
  const render = (props: Record<string, unknown>) => mount(SStatusBadge, { props: props as never })
  it('labels a known status and picks its tone', () => {
    const w = render({ status: 'active' })
    expect(w.text()).toBe('Active')
    expect(w.classes()).toContain('badge-success')
    expect(render({ status: 'Expired' }).classes()).toContain('badge-warning')
  })
  it('falls back to the raw value and honours label, labels, tone and tones', () => {
    expect(render({ status: 'weird' }).text()).toBe('weird')
    expect(render({ status: 'weird' }).classes()).toContain('badge-gray')
    expect(render({ status: '' }).text()).toBe('—')
    expect(render({ status: 'paused', labels: { paused: 'On hold' } }).text()).toBe('On hold')
    expect(render({ status: 'active', label: 'Live' }).text()).toBe('Live')
    expect(render({ status: 'paused', tones: { paused: 'info' } }).classes()).toContain('badge-info')
    expect(render({ status: 'active', tone: 'danger' }).classes()).toContain('badge-danger')
  })
})

describe('statusTone / neutral tone', () => {
  it('maps generic statuses and accepts overrides', () => {
    expect(statusTone('RUNNING')).toBe('success')
    expect(statusTone('failed')).toBe('danger')
    expect(statusTone(null)).toBe('gray')
    expect(statusTone('paused', { paused: 'warning' })).toBe('warning')
  })
  it('SBadge accepts the StatusTone name neutral', () => {
    expect(mount(SBadge, { props: { tone: 'neutral' } }).classes()).toContain('badge-gray')
  })
})
