<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SInput, SSpinner, SSwitch, STextarea, toast } from '@sub2api/ui'
import type { AutoDisableSettings } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'

// Automatic account disabling (GET/PUT /settings/auto-disable, CONTRACTS §42).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

const DEFAULT_KEYWORDS = [
  'your credit balance is too low',
  'this organization has been disabled.',
  'you exceeded your current quota',
  'permission denied',
  'the security token included in the request is invalid',
  'operation not allowed',
  'your account is not authorized'
]

const loading = ref(false)
const saving = ref(false)
const loaded = ref<AutoDisableSettings | null>(null)
const form = reactive({ enabled: true, status_codes: '401', keywords: DEFAULT_KEYWORDS.join('\n') })
const errors = ref<Record<string, string>>({})

const toKeywords = (text: string) => text.split('\n').map((k) => k.trim()).filter(Boolean)
const body = (): AutoDisableSettings => ({ enabled: form.enabled, status_codes: form.status_codes.trim(), keywords: toKeywords(form.keywords) })
const dirty = computed(() => !!loaded.value && JSON.stringify(body()) !== JSON.stringify(loaded.value))

function assign(r: AutoDisableSettings) {
  form.enabled = r.enabled
  form.status_codes = r.status_codes
  form.keywords = r.keywords.join('\n')
  loaded.value = body()
}

async function load() {
  loading.value = true
  try {
    assign(await api.get<AutoDisableSettings>('/settings/auto-disable'))
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    assign(await api.put<AutoDisableSettings>('/settings/auto-disable', body()))
    errors.value = {}
    toast(t('common.saved'), 'success')
  } catch (e) {
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    saving.value = false
  }
}

function reset() {
  if (loaded.value) assign(loaded.value)
  errors.value = {}
}

/** First keyword error (keywords or keywords[i]). */
const keywordError = computed(() => Object.entries(errors.value).find(([k]) => k.startsWith('keywords'))?.[1])

onMounted(load)
</script>

<template>
  <SCard :title="t('settings.autoDisable.title')" :subtitle="t('settings.autoDisable.subtitle')" data-testid="auto-disable-settings">
    <div v-if="loading && !loaded" class="py-6 text-center"><SSpinner /></div>
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-dark-700 dark:bg-dark-900/30">
        <div class="min-w-0">
          <div class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('settings.autoDisable.enabled') }}</div>
          <div class="text-xs text-gray-500 dark:text-dark-400">{{ t('settings.autoDisable.enabledHint') }}</div>
        </div>
        <SSwitch v-model="form.enabled" :disabled="!canManage" :aria-label="t('settings.autoDisable.enabled')" />
      </div>
      <SField :label="t('settings.autoDisable.statusCodes')" :hint="t('settings.autoDisable.statusCodesHint')" :error="errors.status_codes">
        <SInput v-model="form.status_codes" name="status_codes" placeholder="401,403" :disabled="!canManage" />
      </SField>
      <SField :label="t('settings.autoDisable.keywords')" :hint="t('settings.autoDisable.keywordsHint')" :error="keywordError">
        <STextarea v-model="form.keywords" name="keywords" :rows="7" class="font-mono text-xs" :disabled="!canManage" />
      </SField>
      <div v-if="canManage" class="flex flex-wrap justify-end gap-2">
        <SButton size="sm" @click="form.keywords = DEFAULT_KEYWORDS.join('\n')">{{ t('settings.autoDisable.restoreKeywords') }}</SButton>
        <SButton v-if="dirty" size="sm" @click="reset">{{ t('common.reset') }}</SButton>
        <SButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t('common.save') }}</SButton>
      </div>
    </div>
  </SCard>
</template>
