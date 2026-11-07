import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { SModal } from '@sub2api/ui'
import { closeLayersOnBack } from './layerBack'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

const Page = defineComponent({ render: () => null })

async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: ['/a', '/b', '/c'].map(path => ({ path, component: Page })) })
  closeLayersOnBack(router)
  await router.push('/a')
  await router.push('/b')
  const open = ref(false)
  mount(() => h(SModal, { open: open.value, title: 'T', 'onUpdate:open': (v: boolean) => (open.value = v) }), { attachTo: document.body })
  return { router, open }
}

async function back(router: ReturnType<typeof createRouter>) {
  router.back()
  await flushPromises()
}

describe('closeLayersOnBack', () => {
  it('closes an open layer on Back and keeps the URL', async () => {
    const { router, open } = await setup()
    open.value = true
    await flushPromises()
    await back(router)
    expect(open.value).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/b')
    await back(router)
    expect(router.currentRoute.value.fullPath).toBe('/a')
  })

  it('navigates on Back with no layer open', async () => {
    const { router } = await setup()
    await back(router)
    expect(router.currentRoute.value.fullPath).toBe('/a')
  })

  it('lets a layer close and then push a new route', async () => {
    const { router, open } = await setup()
    open.value = true
    await flushPromises()
    open.value = false
    await router.push('/c?x=1')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/c?x=1')
  })
})
