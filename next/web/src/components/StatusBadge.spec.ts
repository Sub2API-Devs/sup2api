import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import StatusBadge from './StatusBadge.vue'
import TimeText from './TimeText.vue'

describe('StatusBadge', () => {
  const render = (props: Record<string, unknown>) => mount(StatusBadge, { props: props as never, global: { plugins: [i18n] } })
  it('labels a known status and picks its tone', () => {
    i18n.global.locale.value = 'en'
    const w = render({ status: 'active' })
    expect(w.text()).toBe('Active')
    expect(w.classes()).toContain('badge-success')
  })
  it('falls back to the raw value and honours label and tone overrides', () => {
    i18n.global.locale.value = 'en'
    expect(render({ status: 'weird' }).text()).toBe('weird')
    const w = render({ status: 'expired', labels: { expired: 'apikeys.expired' }, tone: 'warning' })
    expect(w.text()).not.toBe('expired')
    expect(w.classes()).toContain('badge-warning')
  })
})

describe('TimeText', () => {
  const render = (props: Record<string, unknown>) => mount(TimeText, { props: props as never, global: { plugins: [i18n] } })
  it('shows the empty text for a missing value', () => {
    expect(render({ value: null, empty: 'never' }).text()).toBe('never')
  })
  it('relative mode shows the full time as tooltip', () => {
    i18n.global.locale.value = 'en'
    const w = render({ value: new Date(Date.now() - 5 * 60_000).toISOString(), mode: 'relative' })
    expect(w.text()).toBe('5m ago')
    expect(w.attributes('title')).toBeTruthy()
    expect(w.attributes('datetime')).toBeTruthy()
  })
  it('datetime mode has no tooltip', () => {
    expect(render({ value: '2026-10-05T15:00:00Z' }).attributes('title')).toBeUndefined()
  })
})
