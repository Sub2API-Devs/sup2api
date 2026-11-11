import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { markUnsaved, useTabbedSave } from './useTabbedSave'

const mocks = vi.hoisted(() => ({ notifyError: vi.fn() }))
vi.mock('@/utils/errors', () => ({ notifyError: mocks.notifyError }))

type Tab = 'basic' | 'rates' | 'prices'

beforeEach(() => mocks.notifyError.mockReset())

describe('useTabbedSave', () => {
  it('runs the steps in order and leaves the tab alone when all are saved', async () => {
    const shown = ref<Tab>('prices')
    const calls: string[] = []
    const step = (tab: Tab) => ({ tab, save: async () => (calls.push(tab), true) })
    const { run, saving } = useTabbedSave(shown)
    const done = run([step('basic'), step('rates'), step('prices')])
    expect(saving.value).toBe(true)
    expect(await done).toBe(true)
    expect(calls).toEqual(['basic', 'rates', 'prices'])
    expect([shown.value, saving.value]).toEqual(['prices', false])
  })

  it('stops at the step that is not saved and opens its tab', async () => {
    const shown = ref<Tab>('basic')
    const later = vi.fn(() => true)
    const { run } = useTabbedSave(shown)
    expect(await run([{ tab: 'basic', save: () => true }, { tab: 'rates', save: async () => false }, { tab: 'prices', save: later }])).toBe(false)
    expect(shown.value).toBe('rates')
    expect(later).not.toHaveBeenCalled()
    expect(mocks.notifyError).not.toHaveBeenCalled()
  })

  it('shows the error of a step that rejects and stays on its tab', async () => {
    const shown = ref<Tab>('basic')
    const down = new Error('down')
    const { run, saving } = useTabbedSave(shown)
    expect(await run([{ tab: 'prices', save: () => Promise.reject(down) }])).toBe(false)
    expect(mocks.notifyError).toHaveBeenCalledWith(down)
    expect([shown.value, saving.value]).toEqual(['prices', false])
  })

  it('asks a step for its tab only once it failed', async () => {
    const shown = ref<Tab>('prices')
    let wrong: Tab = 'basic'
    const save = () => {
      wrong = 'rates'
      return false
    }
    await useTabbedSave(shown).run([{ tab: () => wrong, save }])
    expect(shown.value).toBe('rates')
  })
})

describe('markUnsaved', () => {
  it('puts a dot on the tabs with unsaved changes and keeps the others as they are', () => {
    const tabs = [{ key: 'basic', label: 'Basics' }, { key: 'rates', label: 'Rates', badge: 3 }]
    expect(markUnsaved(tabs, (key) => key === 'basic')).toEqual([{ key: 'basic', label: 'Basics', badge: '•' }, tabs[1]])
  })
})
