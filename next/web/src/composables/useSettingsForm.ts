import { computed, reactive, ref, type Ref } from 'vue'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import { i18n } from '@/i18n'
import { errorMessage, notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'

/**
 * Load / edit / save one settings object (GET + PUT on the same path).
 *
 * - `defaults`: the form before anything was loaded.
 * - `fromServer(r)`: maps a server object (or the PUT body when the PUT
 *   answers nothing) to the form. Defaults to a shallow merge over `defaults`.
 * - `toBody(form, errors)`: validates and builds the PUT body; messages put in
 *   `errors` (field → text) stop the save. Defaults to the form itself. `dirty`
 *   compares this body with the loaded one, so formatting-only edits (spaces,
 *   "3" vs 3) do not count.
 * - `inlineLoadError`: put a load failure in `loadError` instead of a toast.
 *
 * `save()` resolves true once saved; follow-up work goes after it.
 */
export interface SettingsFormOptions<T extends object, B> {
  path: string
  defaults: T
  fromServer?: (r: Partial<B>) => T
  toBody?: (form: T, errors: Record<string, string>) => B
  inlineLoadError?: boolean
}

export interface SettingsForm<T extends object, B> {
  form: T
  loading: Ref<boolean>
  saving: Ref<boolean>
  dirty: Ref<boolean>
  errors: Ref<Record<string, string>>
  loadError: Ref<string>
  isLoaded: Ref<boolean>
  load: () => Promise<void>
  save: () => Promise<boolean>
  reset: () => void
  /** Replaces the form with a server object and marks it clean. */
  apply: (r: Partial<B> | null | undefined) => void
}

export function useSettingsForm<T extends object, B = T>(opts: SettingsFormOptions<T, B>): SettingsForm<T, B> {
  // Settings forms are flat objects of primitives, so the reactive proxy has the same shape as T.
  const form = reactive({ ...opts.defaults }) as T
  const loaded = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const errors = ref<Record<string, string>>({})
  const fromServer = opts.fromServer ?? ((r: Partial<B>) => ({ ...opts.defaults, ...r }) as T)
  const toBody = opts.toBody ?? ((f: T) => f as unknown as B)
  const snapshot = () => JSON.stringify(toBody(form, {}))
  const isLoaded = computed(() => loaded.value !== null)
  const dirty = computed(() => isLoaded.value && snapshot() !== loaded.value)
  let saved: T | null = null

  function apply(r: Partial<B> | null | undefined) {
    const next = fromServer(r ?? {})
    Object.assign(form, next)
    saved = { ...next }
    loaded.value = snapshot()
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      apply(await api.get<Partial<B>>(opts.path))
    } catch (e) {
      if (opts.inlineLoadError) loadError.value = errorMessage(e)
      else notifyError(e)
    } finally {
      loading.value = false
    }
  }

  async function save(): Promise<boolean> {
    const errs: Record<string, string> = {}
    const body = toBody(form, errs)
    errors.value = errs
    if (Object.keys(errs).length) return false
    saving.value = true
    try {
      const r = await api.put<Partial<B> | null>(opts.path, body)
      // Some endpoints answer an empty object: keep what was sent.
      apply(r && typeof r === 'object' && Object.keys(r).length ? r : body)
      toast(i18n.global.t('common.saved'), 'success')
      return true
    } catch (e) {
      applyFormError(e, errors)
      return false
    } finally {
      saving.value = false
    }
  }

  function reset() {
    if (saved) Object.assign(form, saved)
    errors.value = {}
  }

  return { form, loading, saving, dirty, errors, loadError, isLoaded, load, save, reset, apply }
}
