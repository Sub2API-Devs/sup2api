import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import SToastHost from './SToastHost.vue'
import SDisclosure from './SDisclosure.vue'
import { mountPinned } from './testViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

describe('SToastHost', () => {
  it('stacks top-center below the notch on phones and top-right on wide screens', () => {
    mountPinned(() => h(SToastHost))
    const phone = document.querySelector<HTMLElement>('.z-toast')!
    expect(phone.className).toContain('inset-x-3')
    expect(phone.className).toContain('top-[calc(env(safe-area-inset-top)+12px)]')
    document.body.innerHTML = ''
    mountPinned(() => h(SToastHost), {}, { compact: false })
    expect(document.querySelector<HTMLElement>('.z-toast')!.className).toContain('right-4')
  })
})

describe('SDisclosure', () => {
  it('gives the section header a 44px hit area on touch screens', () => {
    const w = mount(SDisclosure, { props: { variant: 'section', label: 'Advanced' } })
    expect(w.get('button[aria-expanded]').classes()).toContain('touch:min-h-11')
  })
})
