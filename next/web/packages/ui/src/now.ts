import { computed, onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

interface Clock {
  now: Ref<number>
  timer: ReturnType<typeof setInterval>
  users: number
}

// One timer per interval, shared by every subscriber and stopped with the last.
const clocks = new Map<number, Clock>()

function subscribe(ms: number): Clock {
  let clock = clocks.get(ms)
  if (!clock) {
    const now = ref(Date.now())
    clock = { now, users: 0, timer: setInterval(() => (now.value = Date.now()), ms) }
    clocks.set(ms, clock)
  }
  clock.users++
  return clock
}

function unsubscribe(ms: number) {
  const clock = clocks.get(ms)
  if (!clock || --clock.users > 0) return
  clearInterval(clock.timer)
  clocks.delete(ms)
}

/**
 * The current time (ms), ticking every `intervalMs` (≤ 0 = stopped at the
 * time it was last set). Subscribers of the same interval share one timer;
 * a changed interval re-subscribes, and the scope's end unsubscribes.
 *   const now = useNow(() => (props.live ? 1000 : 60_000))
 */
export function useNow(intervalMs: MaybeRefOrGetter<number>): Readonly<Ref<number>> {
  const clock = shallowRef<Clock | null>(null)
  const since = ref(Date.now())
  let current = 0
  watch(
    () => Math.max(0, toValue(intervalMs) || 0),
    (ms) => {
      if (current) unsubscribe(current)
      current = ms
      since.value = Date.now()
      clock.value = ms ? subscribe(ms) : null
    },
    { immediate: true }
  )
  onScopeDispose(() => {
    if (current) unsubscribe(current)
    current = 0
  })
  // A shared clock may have last ticked before this subscriber joined.
  return computed(() => Math.max(since.value, clock.value?.now.value ?? 0))
}
