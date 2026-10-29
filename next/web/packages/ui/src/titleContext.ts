import { computed, inject, provide, type InjectionKey, type ComputedRef, type Ref } from 'vue'

const TITLE_CONTEXT: InjectionKey<ComputedRef<string>> = Symbol('s-title-context')
const DESCRIPTION_SINK: InjectionKey<Ref<string> | null> = Symbol('s-description-sink')
const normalize = (title: string | undefined) => (title || '').trim().replace(/\s+/g, ' ')

/**
 * Scope belongs to a visible navigation title, never to arbitrary DOM text.
 * `description` is where that title shows a page description (the app top
 * bar); a nested scope without one keeps page descriptions in the page.
 */
export function provideTitleContext(title: () => string | undefined, description: Ref<string> | null = null) {
  provide(TITLE_CONTEXT, computed(() => normalize(title())))
  provide(DESCRIPTION_SINK, description)
}

/** Dialogs start an independent surface even though Teleport retains injection. */
export function resetTitleContext() {
  provideTitleContext(() => '')
}

export function useTitleVisibility(title: () => string | undefined, always: () => boolean = () => false) {
  const parent = inject(TITLE_CONTEXT, null)
  return computed(() => always() || !parent?.value || normalize(title()) !== parent.value)
}

/** The description slot of the enclosing title, if it has one. */
export function useDescriptionSink() {
  return inject(DESCRIPTION_SINK, null)
}
