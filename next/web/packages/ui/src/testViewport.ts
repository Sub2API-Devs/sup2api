// Spec helper: mounts a component on a phone (compact) screen, attached to
// <body> so teleported sheets can be queried there. Returns the component's
// own wrapper (props, emitted events).
import { mount } from '@vue/test-utils'
import { defineComponent, h, type Component } from 'vue'
import { provideViewport } from './viewport'

export function mountCompact(component: Component, props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}) {
  const host = defineComponent({
    setup() {
      provideViewport({ compact: true })
      return () => h(component, props, slots)
    }
  })
  return mount(host, { attachTo: document.body }).findComponent(component)
}
