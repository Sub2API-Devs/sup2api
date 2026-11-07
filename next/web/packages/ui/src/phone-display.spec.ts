import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type Component } from 'vue'
import { provideViewport } from './viewport'
import { toastState } from './feedback'
import SGrid from './SGrid.vue'
import SStatCard from './SStatCard.vue'
import SSteps from './SSteps.vue'
import STabs from './STabs.vue'
import SSegmented from './SSegmented.vue'
import SInput from './SInput.vue'
import SCopyButton from './SCopyButton.vue'
import SSettingRow from './SSettingRow.vue'
import SSwitch from './SSwitch.vue'
import SCheckbox from './SCheckbox.vue'
import SKeyValue from './SKeyValue.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  toastState.items.splice(0)
})

// Mounts `component` under a pinned viewport.
function pinned(
  pin: { compact?: boolean; touch?: boolean },
  component: Component,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => unknown>
) {
  return mount(defineComponent({ setup: () => (provideViewport(pin), () => h(component as any, props, slots)) }))
}

describe('SGrid variant stats', () => {
  it('keeps two tight columns below md and starts `cols` at md', () => {
    const cls = mount(SGrid, { props: { variant: 'stats', cols: 3, xlCols: 4 } }).classes()
    expect(cls).toEqual(expect.arrayContaining(['grid-cols-2', 'max-md:gap-2', 'gap-4', 'md:grid-cols-3', 'xl:grid-cols-4']))
    expect(cls.some(c => c.startsWith('sm:'))).toBe(false)
  })

  it('lets an explicit mdCols win and leaves the default grid single-column on phones', () => {
    expect(mount(SGrid, { props: { variant: 'stats', cols: 1, mdCols: 4 } }).classes()).toEqual(
      expect.arrayContaining(['grid-cols-2', 'md:grid-cols-4'])
    )
    expect(mount(SGrid, { props: { cols: 3 } }).classes()).toEqual(expect.arrayContaining(['grid-cols-1', 'sm:grid-cols-3']))
  })
})

describe('SStatCard on phones', () => {
  it('shows the first helper line only and keeps both in its title', () => {
    const w = mount(SStatCard, { props: { label: 'Cost', value: 1, icon: 'chart', sub: 'today', sub2: 'vs yesterday' } })
    const [first, second] = w.findAll('p.truncate')
    expect(first!.attributes('title')).toBe('today\nvs yesterday')
    expect(second!.classes()).toContain('max-md:hidden')
    expect(w.get('.stat-icon').classes()).toEqual(expect.arrayContaining(['max-md:float-left', 'max-md:!h-8']))
    expect(w.get('.stat-value').classes()).toContain('max-md:!text-xl')
  })

  it('keeps a lone second line visible', () => {
    const w = mount(SStatCard, { props: { label: 'Cost', value: 1, sub2: 'only' } })
    expect(w.get('p.truncate').classes()).not.toContain('max-md:hidden')
  })
})

describe('SSteps direction', () => {
  const steps = [
    { key: 'a', title: 'A' },
    { key: 'b', title: 'B' }
  ]
  it('is vertical on compact screens and horizontal otherwise by default', () => {
    expect(pinned({ compact: true }, SSteps, { steps }).get('ol').classes()).toContain('space-y-0')
    expect(pinned({ compact: false }, SSteps, { steps }).get('ol').classes()).toContain('flex')
  })

  it('keeps an explicit direction', () => {
    expect(pinned({ compact: true }, SSteps, { steps, direction: 'horizontal' }).get('ol').classes()).toContain('flex')
    expect(pinned({ compact: false }, SSteps, { steps, direction: 'vertical' }).get('ol').classes()).toContain('space-y-0')
  })
})

describe('STabs scrolling bar', () => {
  const tabs = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' }
  ]

  it('fades the edges that hide tabs', async () => {
    const w = mount(STabs, { props: { tabs, modelValue: 'a' }, attachTo: document.body })
    const scroller = w.get('[role="tablist"]').element.parentElement!
    Object.defineProperties(scroller, { scrollWidth: { value: 500 }, clientWidth: { value: 200 } })
    scroller.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(scroller.className).toContain('[mask-image:linear-gradient(to_left,transparent,#000_2rem)]')
    scroller.scrollLeft = 100
    scroller.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(scroller.className).toContain('#000_calc(100%-2rem)')
    scroller.scrollLeft = 300
    scroller.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(scroller.className).toContain('[mask-image:linear-gradient(to_right,transparent,#000_2rem)]')
  })

  it('centres the selected tab when it changes', async () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const w = mount(STabs, { props: { tabs, modelValue: 'a' } })
    const scroller = w.get('[role="tablist"]').element.parentElement!
    Object.defineProperty(scroller, 'clientWidth', { value: 200 })
    Object.defineProperties(w.get('[data-key="c"]').element, { offsetLeft: { value: 400 }, offsetWidth: { value: 80 } })
    await w.setProps({ modelValue: 'c' })
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 340, behavior: 'smooth' })
  })

  it('makes tabs 44px high on touch screens', () => {
    expect(
      mount(STabs, { props: { tabs, modelValue: 'a' } })
        .get('[role="tab"]')
        .classes()
    ).toContain('touch:min-h-11')
  })
})

describe('SSegmented on phones', () => {
  it('scrolls without a scrollbar and centres the chosen option', async () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const options = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ]
    const w = mount(SSegmented, { props: { modelValue: 'a', options } })
    expect(w.classes()).toEqual(expect.arrayContaining(['max-md:overflow-x-auto', 'max-md:[scrollbar-width:none]']))
    Object.defineProperties(w.findAll('label')[1]!.element, { offsetLeft: { value: 120 }, offsetWidth: { value: 40 } })
    await w.setProps({ modelValue: 'b' })
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 140, behavior: 'smooth' })
  })
})

describe('SInput phone keyboard', () => {
  const attrs = (props: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    mount(SInput, { props: { modelValue: '', ...props }, attrs: extra })
      .get('input')
      .attributes()

  it('turns off autocapitalize, autocorrect and spellcheck for non-prose fields', () => {
    for (const props of [{ mono: true }, { type: 'url' }, { type: 'email' }, { type: 'password', revealable: true }]) {
      expect(attrs(props)).toMatchObject({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' })
    }
    const prose = attrs({})
    expect(prose.autocapitalize).toBeUndefined()
    expect(prose.spellcheck).toBeUndefined()
  })

  it('asks for the decimal pad on number fields unless negatives are allowed', () => {
    expect(attrs({ type: 'number' }).inputmode).toBe('decimal')
    expect(attrs({ type: 'number', min: -5 }).inputmode).toBeUndefined()
    expect(attrs({ type: 'number', inputmode: 'numeric' }).inputmode).toBe('numeric')
  })

  it('lets attributes passed by the page win', () => {
    expect(attrs({ mono: true }, { autocapitalize: 'characters', spellcheck: 'true' })).toMatchObject({
      autocapitalize: 'characters',
      spellcheck: 'true'
    })
  })
})

describe('SCopyButton on touch screens', () => {
  it('shows a short toast', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true })
    const w = pinned({ touch: true }, SCopyButton, { text: 'sk-1', iconOnly: true })
    expect(w.get('button').classes()).toContain('touch:enabled:!opacity-100')
    await w.get('button').trigger('click')
    await flushPromises()
    expect(toastState.items.map(x => x.message)).toEqual(['Copied'])
    vi.advanceTimersByTime(1600)
    expect(toastState.items).toHaveLength(0)
  })
})

describe('SSettingRow on narrow screens', () => {
  const ROW = 'max-sm:has-[>div:last-child>div>label:only-child>:is(.switch,.checkbox)]:grid-cols-[minmax(0,1fr)_auto]'

  it('keeps a lone switch or checkbox on the label row and grows other controls', () => {
    const w = mount(SSettingRow, { props: { label: 'On' }, slots: { default: () => h(SSwitch, { modelValue: true }) } })
    expect(w.classes()).toContain(ROW)
    const control = w.get('label > .switch').element.closest('label')!.parentElement!
    expect(control.matches('div:last-child > div')).toBe(true)
    expect(control.className).toContain('max-sm:[&>*]:grow')
    const box = mount(SSettingRow, { props: { label: 'On' }, slots: { default: () => h(SCheckbox, { modelValue: true, label: 'Yes' }) } })
    expect(box.get('label > .checkbox').element.closest('label')!.matches(':only-child')).toBe(true)
  })

  it('stays stacked when asked', () => {
    expect(mount(SSettingRow, { props: { label: 'On', stacked: true } }).classes()).not.toContain(ROW)
  })
})

describe('touch targets', () => {
  it('makes labelled switches and checkboxes 44px rows', () => {
    expect(mount(SSwitch, { props: { modelValue: true, label: 'On' } }).classes()).toContain('touch:min-h-11')
    expect(mount(SSwitch, { props: { modelValue: true } }).classes()).not.toContain('touch:min-h-11')
    expect(mount(SCheckbox, { props: { modelValue: true, label: 'On' } }).classes()).toContain('touch:min-h-11')
  })
})

describe('SKeyValue on phones', () => {
  it('stacks key over value with the remove button top-right', () => {
    const w = mount(SKeyValue, { props: { modelValue: { a: 'b' }, separator: true } })
    const row = w.get('.max-md\\:rounded-control')
    expect(row.classes()).toContain('max-md:grid-cols-[minmax(0,1fr)_auto]')
    expect(row.get('svg').classes()).toEqual(expect.arrayContaining(['max-md:rotate-90', 'max-md:col-start-1']))
    expect(row.get('button').classes()).toEqual(expect.arrayContaining(['max-md:col-start-2', 'max-md:row-start-1']))
    expect(w.get('[aria-hidden="true"].grid').classes()).toContain('max-md:hidden')
  })
})
