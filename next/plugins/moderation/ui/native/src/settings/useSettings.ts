import { computed, inject, provide, reactive, ref, shallowRef, type InjectionKey } from 'vue'
import { errorMessage, fetchAnalysisPrompt, fetchChannels, fetchDefaults, useModHost, type Channel, type Defaults } from '../host'
import { fetchSettings, saveSettings } from '../stats'
import { diff, toDraft, toStored, validate, withDefaults, type FieldError } from './fields'

// State of the settings tab (CONTRACTS §72.14.7): the plugin settings read
// and written through the core (GET / PUT /plugins/moderation/settings; PUT
// needs plugin:manage), plus what the editors need: the built-in analysis
// guidelines, the Jev default sets and the llm channels. Saving writes only
// the changed keys; saveSettings merges them into the current values.

export function canReadSettings(): boolean {
  const h = useModHost()
  return h.permissions.superuser() || h.permissions.any('plugin:read', 'plugin:manage')
}

export function useSettings() {
  const h = useModHost()
  const t = h.t
  const canWrite = h.permissions.superuser() || h.permissions.has('plugin:manage')

  const stored = shallowRef<Record<string, unknown>>(withDefaults({}))
  const draft = reactive<Record<string, any>>(toDraft(stored.value, ''))
  const defaultGuidelines = ref('')
  const jevDefaults = shallowRef<Defaults | null>(null)
  const channels = shallowRef<Channel[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  /** Show field errors once a save was attempted (or a field was touched). */
  const showErrors = ref(false)

  function reset() {
    Object.assign(draft, toDraft(stored.value, defaultGuidelines.value))
    showErrors.value = false
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [values, prompt, defs, chans] = await Promise.all([
        fetchSettings(),
        fetchAnalysisPrompt({ group_id: 0 }).catch(() => null),
        fetchDefaults().catch(() => null),
        fetchChannels().catch(() => [] as Channel[])
      ])
      defaultGuidelines.value = prompt?.default_guidelines || ''
      jevDefaults.value = defs
      channels.value = chans || []
      stored.value = withDefaults(values)
      reset()
      loaded.value = true
    } catch (e) {
      error.value = errorMessage(e, t('settingsPage.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const patch = computed(() => diff(stored.value, toStored(draft, defaultGuidelines.value)))
  const dirtyKeys = computed(() => Object.keys(patch.value))
  const dirty = computed(() => dirtyKeys.value.length > 0)
  const errors = computed<Record<string, FieldError>>(() => validate(draft))
  const valid = computed(() => Object.keys(errors.value).length === 0)

  /** Translated error of a key ('' when valid or errors are hidden). */
  function errorOf(key: string): string {
    const e = errors.value[key]
    return e && (showErrors.value || dirtyKeys.value.includes(key)) ? t(`settingsPage.err.${e.code}`, e.params) : ''
  }

  async function save() {
    showErrors.value = true
    if (!canWrite || !dirty.value) return
    if (!valid.value) {
      h.toast(t('settingsPage.invalid'), 'error')
      return
    }
    saving.value = true
    try {
      const jev = 'jev_default_set' in patch.value
      stored.value = withDefaults(await saveSettings(patch.value))
      reset()
      h.toast(t('saved'), 'success')
      if (jev) jevDefaults.value = await fetchDefaults().catch(() => jevDefaults.value)
    } catch (e) {
      h.toast(errorMessage(e, t('actionFailed')), 'error')
    } finally {
      saving.value = false
    }
  }

  const llmChannels = computed(() => channels.value.filter((c) => c.type === 'llm'))

  return {
    canWrite,
    stored,
    draft,
    defaultGuidelines,
    jevDefaults,
    channels,
    llmChannels,
    loaded,
    loading,
    saving,
    error,
    dirty,
    dirtyKeys,
    errors,
    valid,
    errorOf,
    load,
    reset,
    save
  }
}

export type SettingsForm = ReturnType<typeof useSettings>

const KEY: InjectionKey<SettingsForm> = Symbol('moderation-settings')

export function provideSettings(f: SettingsForm) {
  provide(KEY, f)
}

/** The settings form of the enclosing tab (sections and rows only). */
export function useSettingsForm(): SettingsForm {
  const f = inject(KEY)
  if (!f) throw new Error('settings section used outside SettingsTab')
  return f
}
