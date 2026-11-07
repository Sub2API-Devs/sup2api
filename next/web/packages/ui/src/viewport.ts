// The form the UI takes on the current device:
// - `compact`: a narrow screen (below Tailwind `md`, 768px) — the phone
//   layout: table rows as cards, dialogs as bottom sheets, filters folded;
// - `touch`: a coarse pointer — bigger hit targets (the CSS side is the
//   `touch:` Tailwind variant and the control height variables).
// One shared matchMedia listener per query serves every component.
// provideViewport() pins either value for a subtree (tests, previews).
import {
  computed,
  inject,
  provide,
  readonly,
  ref,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'

export const WIDE_QUERY = '(min-width: 768px)'
export const TOUCH_QUERY = '(pointer: coarse)'

export interface Viewport {
  compact: Readonly<Ref<boolean>>
  touch: Readonly<Ref<boolean>>
}

function mediaRef(query: string, fallback: boolean): Ref<boolean> {
  const state = ref(fallback)
  const list = typeof window === 'undefined' ? undefined : window.matchMedia?.(query)
  if (!list) return state
  state.value = list.matches
  list.addEventListener?.('change', e => (state.value = e.matches))
  return state
}

let shared: Viewport | undefined

function sharedViewport(): Viewport {
  if (!shared) {
    const wide = mediaRef(WIDE_QUERY, true)
    shared = { compact: computed(() => !wide.value), touch: readonly(mediaRef(TOUCH_QUERY, false)) }
  }
  return shared
}

/** Forgets the shared listeners so the next use reads matchMedia again (tests that stub it). */
export function resetViewport(): void {
  shared = undefined
}

export const VIEWPORT: InjectionKey<Viewport> = Symbol('s-viewport')

export function useViewport(): Viewport {
  return inject(VIEWPORT, null) ?? sharedViewport()
}

/** Pins `compact` / `touch` for the calling component's subtree; an omitted value follows the device. */
export function provideViewport(pin: { compact?: MaybeRefOrGetter<boolean>; touch?: MaybeRefOrGetter<boolean> }): Viewport {
  const base = useViewport()
  const pick = (v: MaybeRefOrGetter<boolean> | undefined, fallback: Readonly<Ref<boolean>>): ComputedRef<boolean> =>
    computed(() => (v === undefined ? fallback.value : toValue(v)))
  const viewport = { compact: pick(pin.compact, base.compact), touch: pick(pin.touch, base.touch) }
  provide(VIEWPORT, viewport)
  return viewport
}
