import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ProblemIcon from './ProblemIcon.vue'

enableAutoUnmount(afterEach)
const render = (props: { text: string; tone?: 'warning' | 'danger' }) =>
  mount(ProblemIcon, { props, attrs: { 'data-testid': 'problem' }, attachTo: document.body })
const tooltip = () => document.body.querySelector('[role="tooltip"]')

describe('problem icon', () => {
  it('shows no text: the sentence is the accessible name of the icon', () => {
    const icon = render({ text: '暂无账号，无法提供服务。' }).get('[data-testid="problem"]')
    expect(icon.text()).toBe('')
    expect(icon.attributes()).toMatchObject({ role: 'img', 'aria-label': '暂无账号，无法提供服务。' })
    expect(icon.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('shows the sentence as a tooltip on keyboard focus, hidden again on blur', async () => {
    const icon = render({ text: '分组已停用' }).get('[data-testid="problem"]')
    expect(icon.attributes('tabindex')).toBe('0')
    expect(tooltip()).toBeNull()
    ;(icon.element as HTMLElement).focus()
    await nextTick()
    expect(tooltip()?.textContent).toBe('分组已停用')
    ;(icon.element as HTMLElement).blur()
    await nextTick()
    expect(tooltip()).toBeNull()
  })

  it('keeps the tooltip closed for a focus that shows no focus ring (a dialog opened with the mouse)', async () => {
    const icon = render({ text: '分组已停用' }).get('[data-testid="problem"]')
    await icon.trigger('focusin')
    expect(tooltip()).toBeNull()
  })

  it('opens the tooltip on a tap, which focuses the icon without a focus ring (touch screens have no hover)', async () => {
    const icon = render({ text: '分组已停用' }).get('[data-testid="problem"]')
    await icon.trigger('pointerdown')
    await icon.trigger('focusin')
    expect(tooltip()?.textContent).toBe('分组已停用')
    await icon.trigger('focusout')
    expect(tooltip()).toBeNull()
    // The press is spent: a later focus by a dialog stays silent.
    await icon.trigger('focusin')
    expect(tooltip()).toBeNull()
  })

  it('keeps a tap to itself: the card or row around it is not clicked', async () => {
    const around = vi.fn()
    const w = mount({ render: () => h('div', { onClick: around }, [h(ProblemIcon, { text: 'x', 'data-testid': 'problem' })]) })
    await w.get('[data-testid="problem"]').trigger('click')
    expect(around).not.toHaveBeenCalled()
  })

  it('takes the warning colour, or the danger one', () => {
    expect(render({ text: 'x' }).get('[data-testid="problem"]').classes()).toContain('text-warning-600')
    expect(render({ text: 'x', tone: 'danger' }).get('[data-testid="problem"]').classes()).toContain('text-danger-600')
  })
})
