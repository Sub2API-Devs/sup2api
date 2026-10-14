import type { ComputedRef, InjectionKey } from 'vue'

export interface DescContext {
  labelWidth: ComputedRef<string>
  dense: ComputedRef<boolean>
  stacked: ComputedRef<boolean>
}
export const DESC_KEY: InjectionKey<DescContext> = Symbol('s-descriptions')
