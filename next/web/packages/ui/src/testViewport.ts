// Spec helper: mounts a component in a pinned viewport form, the phone
// (compact) one by default, attached to <body> so teleported sheets and menus
// can be queried there. `pin` is what provideViewport() takes, with fixed
// values; an omitted one is false (wide screen, mouse). Returns the
// component's own wrapper (props, emitted events, setProps).
import { mount, type ComponentMountingOptions, type VueWrapper } from '@vue/test-utils'
import { readonly, ref } from 'vue'
import { VIEWPORT, type Viewport } from './viewport'

export function mountPinned<C>(
  component: C,
  options: ComponentMountingOptions<C> = {},
  pin: { compact?: boolean; touch?: boolean } = { compact: true }
): VueWrapper {
  const viewport: Viewport = { compact: readonly(ref(pin.compact ?? false)), touch: readonly(ref(pin.touch ?? false)) }
  const global = { ...options.global, provide: { ...options.global?.provide, [VIEWPORT]: viewport } }
  return mount(component, { attachTo: document.body, ...options, global } as ComponentMountingOptions<C>)
}
