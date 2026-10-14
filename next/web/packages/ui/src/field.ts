// Form-item context shared by SField / SSettingRow and the controls inside
// them. The frame provides ids; the first labelable control without its own
// `id` claims the frame's id (so `<label for>` reaches it), group controls
// (radio groups, segmented, key-value) point aria-labelledby at the label.
// Hint / error ids go to aria-describedby and `error` sets aria-invalid.
import { computed, inject, onBeforeUnmount, provide, ref, useAttrs, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export type ControlSize = 'sm' | 'md'

export interface FieldContext {
  /** Id a labelable control may take (the label's `for`). */
  controlId: ComputedRef<string>
  /** Id of the label element (aria-labelledby of group controls); '' without a label. */
  labelId: ComputedRef<string>
  /** Space-separated ids describing the control (hint, error), or undefined. */
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
  size: ComputedRef<ControlSize | undefined>
  /** True once a control took controlId. */
  claimed: Ref<boolean>
  claim(): boolean
  release(): void
}

export const FIELD_KEY: InjectionKey<FieldContext> = Symbol('s-field')

export function provideField(opts: {
  controlId: ComputedRef<string>
  labelId: ComputedRef<string>
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
  size?: ComputedRef<ControlSize | undefined>
}): FieldContext {
  const claimed = ref(false)
  let taken = false
  const ctx: FieldContext = {
    ...opts,
    size: opts.size ?? computed(() => undefined),
    claimed,
    // The flag is plain (a control claims during its setup, inside the
    // frame's render); the ref follows a microtask later so the frame
    // re-renders its label with for=.
    claim() {
      if (taken) return false
      taken = true
      Promise.resolve().then(() => (claimed.value = taken))
      return true
    },
    release() {
      taken = false
      Promise.resolve().then(() => (claimed.value = taken))
    }
  }
  provide(FIELD_KEY, ctx)
  return ctx
}

/**
 * Accessibility attributes of a control inside SField / SSettingRow.
 * `labelable` controls (input, select, textarea, switch) claim the frame id
 * when they have no `id` attr; group controls get aria-labelledby instead.
 */
export function useFieldControl(props: { error?: boolean; size?: string; ariaLabel?: string }, labelable = true) {
  const field = inject(FIELD_KEY, null)
  const attrs = useAttrs()
  // Reset the shared context so nested controls of a nested frame are unaffected.
  provide(FIELD_KEY, null as unknown as FieldContext)
  const owns = labelable && !!field && attrs.id === undefined && field.claim()
  onBeforeUnmount(() => {
    if (owns) field?.release()
  })
  const id = computed(() => (attrs.id as string | undefined) ?? (owns ? field!.controlId.value : undefined))
  const invalid = computed(() => !!props.error || !!field?.invalid.value)
  const size = computed<ControlSize>(() => (props.size === 'sm' || props.size === 'md' ? props.size : (field?.size.value ?? 'md')))
  const a11y = computed(() => {
    const out: Record<string, string | undefined> = {}
    const described = [attrs['aria-describedby'] as string | undefined, field?.describedBy.value].filter(Boolean).join(' ')
    if (described) out['aria-describedby'] = described
    if (invalid.value) out['aria-invalid'] = 'true'
    if (!labelable && field?.labelId.value && !props.ariaLabel && attrs['aria-labelledby'] === undefined && attrs['aria-label'] === undefined) {
      out['aria-labelledby'] = field.labelId.value
    }
    if (props.ariaLabel) out['aria-label'] = props.ariaLabel
    return out
  })
  return { id, invalid, size, a11y, field }
}

/** Splits fallthrough attrs: class/style (and optionally data-* / listeners) for the wrapper, the rest for the control. */
export function splitAttrs(attrs: Record<string, unknown>, wrapperKeys: (k: string) => boolean) {
  const wrap: Record<string, unknown> = {}
  const control: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(attrs)) (k === 'class' || k === 'style' || wrapperKeys(k) ? wrap : control)[k] = v
  return { wrap, control }
}
