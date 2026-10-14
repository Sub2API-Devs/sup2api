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
 * - `fromServer(r)`: maps a server response (or the request body when the PUT
 *   returns nothing usable) to the form shape. Defaults to a shallow merge.
 * - `toBody(form, errors)`: validates and builds the PUT body. Put messages in
 *   `errors` (field → text) to stop the save. Defaults to the form itself.
 * - `snapshot(form)`: what `dirty` compares; defaults to the form.
 * - `responseKey`: only treat a PUT response as the saved object when it has
 *   this key (some endpoints answer `{}`).
 * - `inlineLoadError`: put load failures in `loadError` instead of a toast.
 */
export interface SettingsFormOptions<T extends object, B> {
  path: string
  defaults: T
  fromServer?: (r: any) => T
  toBody?: (form: T, errors: Record<string, string>) => B
  snapshot?: (form: T) => unknown
  responseKey?: string
  inlineLoadError?: boolean
  /** Called after each successful load or save with the raw response. */
  onApply?: (r: any) => void
  onSaved?: (r: any) => void
  savedMessage?: string
}

export function useSettingsForm<T extends object, B = T>(opts: SettingsFormOptions<T, B>) {
  // Settings forms are flat objects of primitives, so the reactive proxy has the same shape as T.
  const form = reactive({ ...opts.defaults }) as T
  const loaded = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const errors = ref<Record<string, string>>({})
  const fromServer = opts.fromServer ?? ((r: any) => ({ ...opts.defaults, ...(r || {}) }) as T)
  const snap = () => JSON.stringify(opts.snapshot ? opts.snapshot(form) : form)
  const dirty = computed(() => loaded.value !== null && snap() !== loaded.value)
  let savedForm: T | null = null

  /** Replaces the form with a server object and marks it clean. */
  function apply(r: any) {
    const next = fromServer(r)
    Object.assign(form, next)
    savedForm = { ...next }
    loaded.value = snap()
    opts.onApply?.(r)
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      apply(await api.get(opts.path))
    } catch (e) {
      if (opts.inlineLoadError) loadError.value = errorMessage(e)
      else notifyError(e)
    } finally {
      loading.value = false
    }
  }

  async function save(): Promise<boolean> {
    const errs: Record<string, string> = {}
    const body = opts.toBody ? opts.toBody(form, errs) : (form as unknown as B)
    errors.value = errs
    if (Object.keys(errs).length) return false
    saving.value = true
    try {
      const r = await api.put(opts.path, body)
      const usable = r && typeof r === 'object' && (!opts.responseKey || opts.responseKey in (r as object))
      apply(usable ? r : body)
      toast(opts.savedMessage ?? i18n.global.t('common.saved'), 'success')
      opts.onSaved?.(r)
      return true
    } catch (e) {
      applyFormError(e, errors)
      return false
    } finally {
      saving.value = false
    }
  }

  function reset() {
    if (savedForm) Object.assign(form, savedForm)
    errors.value = {}
  }

  const isLoaded = computed(() => loaded.value !== null)
  return { form, loading, saving, dirty, errors, loadError, isLoaded, load, save, reset, apply } as {
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
    apply: (r: any) => void
  }
}
