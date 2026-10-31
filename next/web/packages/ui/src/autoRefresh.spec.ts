import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useAutoRefresh } from './autoRefresh'
import SAutoRefresh from './SAutoRefresh.vue'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useAutoRefresh', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    setHidden(false)
  })

  it('loads on every interval without overlapping, and stops with its scope', async () => {
    let release: () => void = () => {}
    const load = vi.fn(() => new Promise<void>((r) => (release = r)))
    const scope = effectScope()
    scope.run(() => useAutoRefresh(load, 1000))
    await vi.advanceTimersByTimeAsync(1000)
    expect(load).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000) // still running: no second load
    expect(load).toHaveBeenCalledTimes(1)
    release()
    await vi.advanceTimersByTimeAsync(1000)
    expect(load).toHaveBeenCalledTimes(2)
    release()
    scope.stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('skips hidden pages and catches up when visible; interval 0 and enabled false pause it', async () => {
    const load = vi.fn()
    const ms = ref(1000)
    const on = ref(true)
    const scope = effectScope()
    scope.run(() => useAutoRefresh(load, ms, { enabled: on }))
    setHidden(true)
    await vi.advanceTimersByTimeAsync(3000)
    expect(load).not.toHaveBeenCalled()
    setHidden(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(load).toHaveBeenCalledTimes(1)
    on.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)
    expect(load).toHaveBeenCalledTimes(1)
    on.value = true
    ms.value = 0
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)
    expect(load).toHaveBeenCalledTimes(1)
    ms.value = 500
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    expect(load).toHaveBeenCalledTimes(2)
    scope.stop()
  })
})

describe('SAutoRefresh', () => {
  it('offers off and the intervals, keeping an unlisted current value', () => {
    const w = mount(SAutoRefresh, { props: { modelValue: 15 } })
    const labels = w.findAll('option').map((o) => o.text())
    expect(labels).toEqual(['Off', 'Every 10s', 'Every 15s', 'Every 30s', 'Every 60s'])
  })
})
