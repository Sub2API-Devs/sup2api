import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { provideViewport, resetViewport, useViewport, type Viewport } from './viewport'
import SDrawer from './SDrawer.vue'

afterEach(() => {
  vi.unstubAllGlobals()
  resetViewport()
  document.body.innerHTML = ''
})

function stubMedia(match: (query: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: match(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  }))
}

function probe(setup: () => Viewport) {
  let seen: Viewport | undefined
  mount(defineComponent({ setup: () => ((seen = setup()), () => null) }))
  return seen!
}

describe('useViewport', () => {
  it('is compact below md and touch on a coarse pointer', () => {
    stubMedia(q => q === '(pointer: coarse)')
    const v = probe(useViewport)
    expect(v.compact.value).toBe(true)
    expect(v.touch.value).toBe(true)
  })

  it('is wide and fine-pointed on a desktop', () => {
    stubMedia(q => q === '(min-width: 768px)')
    const v = probe(useViewport)
    expect(v.compact.value).toBe(false)
    expect(v.touch.value).toBe(false)
  })

  it('lets a subtree pin either value', async () => {
    stubMedia(() => false)
    const compact = ref(false)
    let inner: Viewport | undefined
    const Child = defineComponent({ setup: () => ((inner = useViewport()), () => null) })
    mount(defineComponent({ setup: () => (provideViewport({ compact }), () => h(Child)) }))
    expect(inner!.compact.value).toBe(false)
    expect(inner!.touch.value).toBe(false)
    compact.value = true
    await nextTick()
    expect(inner!.compact.value).toBe(true)
  })
})

describe('SDrawer side bottom', () => {
  it('renders a full-width bottom sheet with a grab handle', async () => {
    mount(SDrawer, { props: { open: true, side: 'bottom', title: '筛选' }, slots: { default: () => '内容' }, attachTo: document.body })
    await nextTick()
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(panel.className).toContain('s-drawer-bottom')
    expect(panel.style.maxWidth).toBe('')
    expect(panel.querySelector('[aria-hidden="true"].rounded-full')).not.toBeNull()
  })
})
