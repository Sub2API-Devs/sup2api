import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { toastState } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { useOpenApp } from './openApp'

enableAutoUnmount(afterEach)
const app = { app: 'Magpie', link: (base: string, name: string, key: string) => `magpie://import?base=${base}&name=${name}&key=${key}` }
// The composable needs a component for its i18n.
const opener = () =>
  (
    mount(defineComponent({ setup: () => ({ open: useOpenApp() }), render: () => null }), { global: { plugins: [i18n] } })
      .vm as unknown as { open: ReturnType<typeof useOpenApp> }
  ).open

describe('opening an app on a key import', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    i18n.global.locale.value = 'zh'
    toastState.items = []
    vi.stubGlobal('location', { origin: 'https://gw.example.com', hostname: 'gw.example.com', href: 'https://gw.example.com/me/api-keys' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  it('goes to the import link of the key at this gateway, named after its host', () => {
    opener()(app, 'sk-s2a-full')
    expect(window.location.href).toBe('magpie://import?base=https://gw.example.com&name=gw.example.com&key=sk-s2a-full')
  })
  it('says to install the app when the page still has focus a moment later', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    opener()(app, 'k')
    expect(toastState.items).toEqual([])
    vi.advanceTimersByTime(1500)
    expect(toastState.items.map(x => [x.kind, x.message])).toEqual([['info', '没有打开 Magpie？请先安装 Magpie 后再试。']])
  })
  it('stays quiet once the app took the focus', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    opener()(app, 'k')
    vi.advanceTimersByTime(5000)
    expect(toastState.items).toEqual([])
  })
})
