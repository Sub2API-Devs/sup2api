import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { SModal } from '@sub2api/ui'
import { mountPinned } from '@sub2api/ui/testing'
import { closeLayersOnBack } from './layerBack'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

const Page = defineComponent({ render: () => null })

async function setup(pin: { compact?: boolean; touch?: boolean } = { compact: true }, persistent = false) {
  const router = createRouter({ history: createMemoryHistory(), routes: ['/a', '/b', '/c'].map(path => ({ path, component: Page })) })
  closeLayersOnBack(router)
  await router.push('/a')
  await router.push('/b')
  const open = ref(false)
  mountPinned(() => h(SModal, { open: open.value, title: 'T', persistent, 'onUpdate:open': (v: boolean) => (open.value = v) }), {}, pin)
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

  it('closes a layer opened on a touch screen', async () => {
    const { router, open } = await setup({ touch: true })
    open.value = true
    await flushPromises()
    await back(router)
    expect(open.value).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/b')
  })

  it('navigates on Back with a layer open on a wide screen with a mouse', async () => {
    const { router, open } = await setup({ compact: false })
    open.value = true
    await flushPromises()
    await back(router)
    expect(router.currentRoute.value.fullPath).toBe('/a')
  })

  it('navigates on Back past a persistent layer', async () => {
    const { router, open } = await setup({ compact: true }, true)
    open.value = true
    await flushPromises()
    await back(router)
    expect(open.value).toBe(true)
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
