import { computed, inject, provide, type InjectionKey, type ComputedRef } from 'vue'

const TITLE_CONTEXT: InjectionKey<ComputedRef<string>> = Symbol('s-title-context')
const normalize = (title: string | undefined) => (title || '').trim().replace(/\s+/g, ' ')

/** Scope belongs to a visible navigation title, never to arbitrary DOM text. */
export function provideTitleContext(title: () => string | undefined) {
  provide(TITLE_CONTEXT, computed(() => normalize(title())))
}

/** Dialogs start an independent surface even though Teleport retains injection. */
export function resetTitleContext() {
  provideTitleContext(() => '')
}

export function useTitleVisibility(title: () => string | undefined, always: () => boolean = () => false) {
  const parent = inject(TITLE_CONTEXT, null)
  return computed(() => always() || !parent?.value || normalize(title()) !== parent.value)
}
