import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import GroupAccountsEditor from './GroupAccountsEditor.vue'

vi.mock('@sub2api/host', async (orig) => ({ ...(await orig<object>()), api: { get: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/composables/lookups', () => ({ fetchAllPages: vi.fn().mockResolvedValue([]) }))
enableAutoUnmount(afterEach)

describe('group accounts editor', () => {
  // The editor sits inside the group form (SFormModal submits on Enter): the
  // search box must filter, never save the group with half-picked accounts.
  it('does not let Enter in the search box submit the surrounding form', async () => {
    setActivePinia(createPinia())
    const w = mount(GroupAccountsEditor, { props: { groupId: 3 }, global: { plugins: [i18n] } })
    await flushPromises()
    const box = w.get('[data-testid="group-accounts-search"]')
    const input = box.element.tagName === 'INPUT' ? box : box.get('input')
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.element.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})
