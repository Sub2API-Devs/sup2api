import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

// Refresh signal of the overview: the page bumps it (header refresh, auto
// refresh every minute) and every card with its own query reloads.

const TICK: InjectionKey<Ref<number>> = Symbol('moderation-overview-tick')

export function provideOverviewTick(): () => void {
  const tick = ref(0)
  provide(TICK, tick)
  return () => tick.value++
}

export function onOverviewTick(fn: () => unknown) {
  const tick = inject(TICK, null)
  if (tick) watch(tick, () => fn())
}
