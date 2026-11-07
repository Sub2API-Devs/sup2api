import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { provideViewport } from './viewport'
import SSteps from './SSteps.vue'

enableAutoUnmount(afterEach)

const steps = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' }
]
// A vertical list draws a connector line under each step but the last.
const isVertical = (compact: boolean, direction?: 'horizontal' | 'vertical') =>
  mount(defineComponent({ setup: () => (provideViewport({ compact }), () => h(SSteps, { steps, direction })) }))
    .findAll('li')[0]!
    .find('span[aria-hidden="true"].absolute')
    .exists()

describe('SSteps direction', () => {
  it('auto (default) is vertical on compact screens and horizontal otherwise', () => {
    expect(isVertical(true)).toBe(true)
    expect(isVertical(false)).toBe(false)
  })

  it('keeps an explicit direction', () => {
    expect(isVertical(true, 'horizontal')).toBe(false)
    expect(isVertical(false, 'vertical')).toBe(true)
  })
})
