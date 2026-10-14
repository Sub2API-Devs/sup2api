import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SAlert from './SAlert.vue'
import SCopyButton from './SCopyButton.vue'
import SProgress from './SProgress.vue'
import SChoiceCards from './SChoiceCards.vue'
import STooltip from './STooltip.vue'
import SChip from './SChip.vue'
import SStatusDot from './SStatusDot.vue'
import SSkeleton from './SSkeleton.vue'
import SSteps from './SSteps.vue'
import SDateTime from './SDateTime.vue'
import SDescriptions from './SDescriptions.vue'
import SDescItem from './SDescItem.vue'
import SEmpty from './SEmpty.vue'
import SStatCard from './SStatCard.vue'
import { toastState } from './feedback'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
  toastState.items.splice(0)
})

describe('SAlert', () => {
  it('uses role=alert for danger, status otherwise, and emits dismiss', async () => {
    const d = mount(SAlert, { props: { tone: 'danger', title: 'Broken', dismissible: true }, slots: { default: 'Details', actions: '<button class="act">Fix</button>' } })
    expect(d.attributes('role')).toBe('alert')
    expect(d.text()).toContain('Broken')
    expect(d.find('.act').exists()).toBe(true)
    await d.get('button[aria-label="Dismiss"]').trigger('click')
    expect(d.emitted('dismiss')).toHaveLength(1)
    const i = mount(SAlert, { props: { tone: 'warning' }, slots: { default: 'Careful' } })
    expect(i.attributes('role')).toBe('status')
    expect(i.find('svg').exists()).toBe(true)
    expect(mount(SAlert, { props: { icon: false } }).find('svg').exists()).toBe(false)
  })
})

describe('SCopyButton', () => {
  it('copies with navigator.clipboard, toasts and emits copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = mount(SCopyButton, { props: { text: 'sk-123', iconOnly: true } })
    expect(w.attributes('aria-label')).toBe('Copy')
    await w.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('sk-123')
    expect(w.emitted('copied')).toEqual([['sk-123']])
    expect(toastState.items.map((x) => x.message)).toEqual(['Copied'])
  })

  it('reports failure when nothing can copy', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true })
    const w = mount(SCopyButton, { props: { text: 'x', toast: false } })
    await w.trigger('click')
    await flushPromises()
    expect(w.emitted('error')).toHaveLength(1)
    expect(toastState.items).toHaveLength(0)
  })
})

describe('SProgress', () => {
  it('exposes progressbar semantics and clamps the bar', () => {
    const w = mount(SProgress, { props: { value: 150, max: 100, label: 'Upload', showValue: true } })
    const bar = w.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('150')
    expect(bar.attributes('aria-label')).toBe('Upload')
    expect(w.text()).toContain('100%')
    const ind = mount(SProgress, { props: { indeterminate: true } })
    expect(ind.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
  })
})

describe('SChoiceCards', () => {
  const options = [{ value: 'a', label: 'A', description: 'first' }, { value: 'b', label: 'B', icon: 'key' }, { value: 'c', label: 'C', disabled: true }]
  it('is a radiogroup emitting the value', async () => {
    const w = mount(SChoiceCards, { props: { modelValue: 'a', options } })
    expect(w.attributes('role')).toBe('radiogroup')
    await w.findAll('input')[1].setValue(true)
    expect(w.emitted('update:modelValue')).toEqual([['b']])
    expect(w.findAll('input')[2].attributes('disabled')).toBeDefined()
  })
  it('toggles values in multiple mode', async () => {
    const w = mount(SChoiceCards, { props: { modelValue: ['a'], options, multiple: true } })
    expect(w.attributes('role')).toBe('group')
    await w.findAll('input')[1].setValue(true)
    expect(w.emitted('update:modelValue')).toEqual([[['a', 'b']]])
  })
})

describe('STooltip', () => {
  it('shows on focus immediately, links aria-describedby and hides on Escape', async () => {
    const w = mount(STooltip, { props: { content: 'Explains' }, slots: { default: '<button>?</button>' }, attachTo: document.body })
    await w.get('button').trigger('focusin')
    await flushPromises()
    const tip = document.querySelector('[role="tooltip"]')!
    expect(tip.textContent).toContain('Explains')
    expect(w.attributes('aria-describedby')).toBe(tip.id)
    await w.trigger('keydown', { key: 'Escape' })
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })
  it('waits for the delay on hover', async () => {
    vi.useFakeTimers()
    const w = mount(STooltip, { props: { content: 'Later', delay: 200 }, slots: { default: 'x' }, attachTo: document.body })
    await w.trigger('mouseenter')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    vi.advanceTimersByTime(250)
    await flushPromises()
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull()
    vi.useRealTimers()
  })
})

describe('SChip / SStatusDot', () => {
  it('toggles pressed chips and closes', async () => {
    const w = mount(SChip, { props: { pressed: false, closable: true }, slots: { default: 'Errors' } })
    const btn = w.get('button[aria-pressed]')
    expect(btn.attributes('aria-pressed')).toBe('false')
    await btn.trigger('click')
    expect(w.emitted('update:pressed')).toEqual([[true]])
    await w.get('button[aria-label="Remove"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    expect(mount(SChip, { slots: { default: 'Static' } }).find('button').exists()).toBe(false)
  })
  it('renders a status dot with an optional screen-reader label', () => {
    const w = mount(SStatusDot, { props: { tone: 'success', pulse: true, label: 'Online', srOnly: true } })
    expect(w.find('.animate-ping').exists()).toBe(true)
    expect(w.get('.sr-only').text()).toBe('Online')
  })
})

describe('SSkeleton', () => {
  it('renders lines or a circle', () => {
    expect(mount(SSkeleton, { props: { lines: 3 } }).findAll('.animate-pulse')).toHaveLength(3)
    expect(mount(SSkeleton, { props: { circle: true, height: '2rem' } }).classes()).toContain('rounded-full')
  })
})

describe('SSteps', () => {
  it('derives states from `current` and marks it aria-current', () => {
    const steps = [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }, { key: 'c', title: 'C', state: 'error' as const }]
    const w = mount(SSteps, { props: { steps, current: 'b' }, slots: { 'step-b': '<i class="extra">log</i>' } })
    const li = w.findAll('li')
    expect(li[1].attributes('aria-current')).toBe('step')
    expect(li[0].text()).toContain('Completed')
    expect(li[2].text()).toContain('Failed')
    expect(li[1].find('.extra').exists()).toBe(true)
  })
})

describe('SDateTime', () => {
  it('shows relative times recently, absolute ones otherwise, with the full time as title', () => {
    const recent = mount(SDateTime, { props: { value: new Date(Date.now() - 3 * 60_000).toISOString() } })
    expect(recent.text()).toMatch(/3 minutes ago/)
    expect(recent.attributes('title')).toMatch(/\d{2}:\d{2}:\d{2}/)
    const old = mount(SDateTime, { props: { value: '2020-01-02T03:04:05Z', mode: 'auto' } })
    expect(old.text()).toMatch(/2020/)
    expect(old.get('time').attributes('datetime')).toBe('2020-01-02T03:04:05.000Z')
    expect(mount(SDateTime, { props: { value: 'nope' } }).text()).toBe('—')
  })
})

describe('SDescriptions', () => {
  it('renders items, item slots and SDescItem children', () => {
    const w = mount(SDescriptions, {
      props: { items: [{ key: 'id', label: 'ID', value: 7, mono: true }, { key: 'state', label: 'State', value: 'on' }, { key: 'empty', label: 'Empty' }], columns: 2 },
      slots: { 'item-state': '<b class="st">ON</b>', default: () => h(SDescItem, { label: 'Extra' }, () => 'child') }
    })
    const dts = w.findAll('dt').map((d) => d.text())
    expect(dts).toEqual(['ID', 'State', 'Empty', 'Extra'])
    expect(w.find('.st').exists()).toBe(true)
    expect(w.findAll('dd')[2].text()).toBe('—')
    expect(w.findAll('dd')[3].text()).toBe('child')
  })
})

describe('SEmpty / SStatCard', () => {
  it('SEmpty shows title and actions', () => {
    const w = mount(SEmpty, { props: { title: 'Nothing yet', size: 'lg' }, slots: { actions: '<button class="a">Add</button>' } })
    expect(w.text()).toContain('Nothing yet')
    expect(w.find('.a').exists()).toBe(true)
  })
  it('SStatCard becomes a pressed button when selectable', async () => {
    const w = mount(SStatCard, { props: { label: 'Errors', value: 3, selected: true } })
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.attributes('aria-pressed')).toBe('true')
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
    expect(mount(SStatCard, { props: { label: 'x', value: 1 } }).element.tagName).toBe('DIV')
  })
})
