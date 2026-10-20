// Density an SSettingsGroup hands down to its SSettingRow children, so a
// compact group is one prop rather than `dense` on every row.
import { inject, provide, type InjectionKey } from 'vue'

const SETTINGS_DENSE: InjectionKey<() => boolean> = Symbol('s-settings-dense')

export function provideSettingsDensity(dense: () => boolean) {
  provide(SETTINGS_DENSE, dense)
}

/** The enclosing group's density; false outside a group. */
export function useSettingsDensity(): () => boolean {
  return inject(SETTINGS_DENSE, () => false)
}
