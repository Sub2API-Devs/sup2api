import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured, ref, type Component } from 'vue'
import { lazyPage } from './lazyPage'

const Page: Component = { name: 'Page', render: () => h('p', { 'data-testid': 'page' }, 'page') }
// What import() resolves to: Vue unwraps `default` only from a module namespace.
const mod = { [Symbol.toStringTag]: 'Module', default: Page }

// Mirrors PluginPageView: errors are caught by onErrorCaptured and a key bump remounts the page.
function host(page: Component) {
  const errors: unknown[] = []
  const attempt = ref(0)
  const w = mount(
    defineComponent({
      setup() {
        onErrorCaptured(err => {
          errors.push(err)
          return false
        })
        return () => h('div', { key: attempt.value }, [h(page)])
      }
    })
  )
  return { w, errors, remount: () => attempt.value++ }
}

describe('lazyPage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the loading state until the page arrives', async () => {
    let resolve: (m: { default: Component }) => void = () => {}
    const { w } = host(lazyPage(() => new Promise(r => (resolve = r))))
    await vi.advanceTimersByTimeAsync(200)
    expect(w.find('.py-16').exists()).toBe(true)
    resolve(mod)
    await vi.advanceTimersByTimeAsync(0)
    expect(w.find('[data-testid="page"]').exists()).toBe(true)
    expect(w.find('.py-16').exists()).toBe(false)
  })

  it('retries twice with a backoff and renders when a retry succeeds', async () => {
    const loader = vi
      .fn<() => Promise<{ default: Component }>>()
      .mockRejectedValueOnce(new Error('chunk 1'))
      .mockRejectedValueOnce(new Error('chunk 2'))
      .mockResolvedValue(mod)
    const { w, errors } = host(lazyPage(loader))
    await vi.advanceTimersByTimeAsync(0)
    expect(loader).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(499)
    expect(loader).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(loader).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1000)
    expect(loader).toHaveBeenCalledTimes(3)
    expect(w.find('[data-testid="page"]').exists()).toBe(true)
    expect(errors).toEqual([])
  })

  it('surfaces the last error after the retries, and a remount starts a fresh round', async () => {
    const loader = vi.fn<() => Promise<{ default: Component }>>().mockRejectedValue(new Error('offline'))
    const { w, errors, remount } = host(lazyPage(loader))
    await vi.advanceTimersByTimeAsync(2000)
    expect(loader).toHaveBeenCalledTimes(3)
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('offline')

    loader.mockReset()
    loader.mockRejectedValueOnce(new Error('still offline')).mockResolvedValue(mod)
    remount()
    await vi.advanceTimersByTimeAsync(0)
    expect(loader).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(500)
    expect(loader).toHaveBeenCalledTimes(2)
    expect(w.find('[data-testid="page"]').exists()).toBe(true)
    expect(errors).toHaveLength(1)
  })
})
