// Test helper: a component rendering `render()` under provideViewport(pin),
// to mount a component in its phone / touch form.
import { defineComponent, type VNodeChild } from 'vue'
import { provideViewport } from '../viewport'

export function pinViewport(pin: { compact?: boolean; touch?: boolean }, render: () => VNodeChild) {
  return defineComponent({
    setup() {
      provideViewport(pin)
      return render
    }
  })
}
