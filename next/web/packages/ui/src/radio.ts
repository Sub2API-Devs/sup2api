import type { ComputedRef, InjectionKey } from 'vue'

/** Name shared by the SRadio children of an SRadioGroup. */
export const RADIO_NAME_KEY: InjectionKey<ComputedRef<string>> = Symbol('s-radio-name')
