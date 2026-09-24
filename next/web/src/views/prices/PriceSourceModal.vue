<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, api } from '@sub2api/host'
import { SButton, SField, SModal, SSwitch, STagInput, toast } from '@sub2api/ui'
import type { PriceSource, PriceSourceKind } from '@/api/types'
import { fieldErrors, notifyError } from '@/utils/errors'
import { DEFAULT_PROVIDERS, DEFAULT_URLS, SOURCE_KINDS, isHttpUrl } from './priceSources'

const props = defineProps<{ open: boolean; source: PriceSource | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved', s: PriceSource | null): void }>()
const { t } = useI18n()

const editing = computed(() => props.source)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  kind: 'litellm' as PriceSourceKind,
  url: DEFAULT_URLS.litellm,
  apiKey: '',
  /** Edit only: clear the stored key. */
  clearKey: false,
  providers: [...DEFAULT_PROVIDERS.litellm] as string[],
  applyMultiplier: true,
  enabled: true
})

const hasStoredKey = computed(() => !!editing.value?.has_api_key)
const usesProviders = computed(() => form.kind === 'litellm' || form.kind === 'models_dev')

function reset() {
  errors.value = {}
  const s = props.source
  if (s) {
    Object.assign(form, {
      name: s.name,
      kind: s.kind,
      url: s.url,
      apiKey: '',
      clearKey: false,
      providers: Array.isArray(s.options?.providers) ? [...s.options.providers] : s.kind === 'sup2api' ? [] : [...DEFAULT_PROVIDERS[s.kind]],
      applyMultiplier: s.options?.apply_multiplier !== false,
      enabled: s.enabled
    })
  } else {
    Object.assign(form, {
      name: '',
      kind: 'litellm',
      url: DEFAULT_URLS.litellm,
      apiKey: '',
      clearKey: false,
      providers: [...DEFAULT_PROVIDERS.litellm],
      applyMultiplier: true,
      enabled: true
    })
  }
}

watch(
  () => props.open,
  (v) => v && reset(),
  { immediate: true }
)

/** Picking a type fills in its default URL and vendor list (unless edited by hand). */
function pickKind(k: PriceSourceKind) {
  if (editing.value || form.kind === k) return
  const prev = form.kind
  form.kind = k
  if (!form.url.trim() || form.url === DEFAULT_URLS[prev]) form.url = DEFAULT_URLS[k]
  if (k !== 'sup2api') {
    const prevDefault = prev === 'sup2api' ? [] : DEFAULT_PROVIDERS[prev]
    if (!form.providers.length || form.providers.join(',') === prevDefault.join(',')) form.providers = [...DEFAULT_PROVIDERS[k]]
  }
  if (!form.name.trim() || SOURCE_KINDS.some((x) => form.name === t(`prices.sources.kind.${x}`))) form.name = k === 'sup2api' ? '' : t(`prices.sources.kind.${k}`)
  errors.value = {}
}

function options(): Record<string, unknown> {
  return usesProviders.value ? { providers: form.providers.map((s) => s.trim()).filter(Boolean) } : { apply_multiplier: form.applyMultiplier }
}

async function submit() {
  errors.value = {}
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = t('common.required')
  if (!form.url.trim()) e.url = t('common.required')
  else if (!isHttpUrl(form.url)) e.url = t('prices.sources.urlInvalid')
  if (form.kind === 'sup2api') {
    const willHaveKey = !!form.apiKey.trim() || (hasStoredKey.value && !form.clearKey)
    if (!willHaveKey) e.api_key = t('prices.sources.apiKeyRequired')
  }
  if (Object.keys(e).length) {
    errors.value = e
    return
  }
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    url: form.url.trim(),
    options: options(),
    enabled: form.enabled
  }
  if (editing.value) {
    // Omitted = keep the stored key, "" = clear it, other = new key.
    if (form.apiKey.trim()) body.api_key = form.apiKey.trim()
    else if (hasStoredKey.value && form.clearKey) body.api_key = ''
  } else {
    body.kind = form.kind
    if (form.kind === 'sup2api') body.api_key = form.apiKey.trim()
  }
  saving.value = true
  try {
    const r = editing.value
      ? await api.patch<PriceSource>(`/price-sources/${editing.value.id}`, body)
      : await api.post<PriceSource>('/price-sources', body)
    toast(t(editing.value ? 'common.updated' : 'common.created'), 'success')
    emit('update:open', false)
    emit('saved', r || null)
  } catch (err) {
    const fe = fieldErrors(err)
    if (fe['options.providers'] && !fe.providers) fe.providers = fe['options.providers']
    if (err instanceof ApiError && err.code === 'conflict') fe.name = err.message
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal
    :open="open"
    :title="editing ? t('prices.sources.editTitle', { name: editing.name }) : t('prices.sources.create')"
    width="lg"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" data-testid="price-source-form" @submit.prevent="submit">
      <SField :label="t('prices.sources.kindCol')" required>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            v-for="k in SOURCE_KINDS"
            :key="k"
            type="button"
            class="rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed"
            :class="
              form.kind === k
                ? 'border-primary-500 bg-primary-50/60 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-gray-200 hover:border-gray-300 dark:border-dark-600'
            "
            :disabled="!!editing && form.kind !== k"
            :data-kind="k"
            @click="pickKind(k)"
          >
            <span class="font-medium">{{ t(`prices.sources.kind.${k}`) }}</span>
          </button>
        </div>
        <p class="input-hint" data-testid="price-source-kind-hint">{{ t(`prices.sources.kindHint.${form.kind}`) }}</p>
      </SField>

      <SField :label="t('common.name')" required :error="errors.name">
        <input v-model="form.name" class="input" name="name" />
      </SField>

      <SField :label="t('prices.sources.url')" required :error="errors.url" :hint="t(`prices.sources.urlHint.${form.kind}`)">
        <input v-model="form.url" class="input font-mono text-xs" name="url" :placeholder="form.kind === 'sup2api' ? 'https://up.example.com' : DEFAULT_URLS[form.kind]" />
      </SField>

      <SField
        v-if="form.kind === 'sup2api'"
        :label="t('prices.sources.apiKey')"
        :required="!hasStoredKey"
        :error="errors.api_key"
        :hint="editing && hasStoredKey ? t('prices.sources.apiKeyKeep') : t('prices.sources.apiKeyHint')"
      >
        <input
          v-model="form.apiKey"
          type="password"
          name="api_key"
          class="input font-mono"
          autocomplete="new-password"
          :disabled="form.clearKey"
          :placeholder="editing && hasStoredKey ? t('prices.sources.apiKeyStored') : 'sk-s2a-...'"
        />
        <label v-if="editing && hasStoredKey" class="mt-1.5 flex items-center gap-1.5 text-xs">
          <input v-model="form.clearKey" type="checkbox" class="checkbox" data-testid="price-source-clear-key" />
          {{ t('prices.sources.apiKeyClear') }}
        </label>
      </SField>

      <SField
        v-if="usesProviders"
        :label="t('prices.sources.providers')"
        :error="errors.providers || errors.options"
        :hint="t(`prices.sources.providersHint.${form.kind}`)"
      >
        <STagInput v-model="form.providers" :placeholder="t('prices.sources.providersPlaceholder')" />
      </SField>

      <SField v-else :label="t('prices.sources.applyMultiplier')" :hint="t('prices.sources.applyMultiplierHint')" :error="errors.options">
        <div class="pt-1">
          <SSwitch
            v-model="form.applyMultiplier"
            :label="form.applyMultiplier ? t('prices.sources.multiplierOn') : t('prices.sources.multiplierOff')"
            data-testid="price-source-multiplier"
          />
        </div>
      </SField>

      <SField :label="t('common.status')">
        <div class="pt-1"><SSwitch v-model="form.enabled" :label="form.enabled ? t('common.enabled') : t('common.disabled')" /></div>
      </SField>
    </form>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving" data-testid="price-source-submit" @click="submit">
        {{ editing ? t('common.save') : t('common.create') }}
      </SButton>
    </template>
  </SModal>
</template>
