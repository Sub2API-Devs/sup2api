import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useNow } from './now'
import SDateTime from './SDateTime.vue'

enableAutoUnmount(afterEach)

describe('useNow', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shares one timer per interval and stops it with the last subscriber', async () => {
    const a = effectScope()
    const b = effectScope()
    const first = a.run(() => useNow(1000))!
    const second = b.run(() => useNow(1000))!
    expect(vi.getTimerCount()).toBe(1)
    const start = first.value
    vi.advanceTimersByTime(1000)
    expect(first.value).toBe(start + 1000)
    expect(second.value).toBe(first.value)
    a.stop()
    expect(vi.getTimerCount()).toBe(1)
    b.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('re-subscribes when the interval changes and runs no timer at 0', async () => {
    const ms = ref(1000)
    const scope = effectScope()
    const now = scope.run(() => useNow(ms))!
    ms.value = 60_000
    await nextTick()
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(1000)
    const held = now.value
    vi.advanceTimersByTime(59_000)
    expect(now.value).toBeGreaterThan(held)
    ms.value = 0
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    scope.stop()
  })
})

describe('SDateTime timers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ticks only relative texts, and follows mode / live changes', async () => {
    const recent = new Date(Date.now() - 5000)
    mount(SDateTime, { props: { value: null } }) // the first mount starts an unrelated test-environment timer
    const base = vi.getTimerCount()
    mount(SDateTime, { props: { value: recent, mode: 'absolute' } })
    mount(SDateTime, { props: { value: '2020-01-02T03:04:05Z' } })
    expect(vi.getTimerCount()).toBe(base)

    const w = mount(SDateTime, { props: { value: recent, mode: 'relative', live: true } })
    mount(SDateTime, { props: { value: recent, mode: 'relative', live: true } })
    expect(vi.getTimerCount()).toBe(base + 1)
    expect(w.text()).toBe('5s ago')
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(w.text()).toBe('7s ago')

    await w.setProps({ live: false })
    expect(vi.getTimerCount()).toBe(base + 2)
    await w.setProps({ mode: 'absolute' })
    expect(vi.getTimerCount()).toBe(base + 1)
  })
})
