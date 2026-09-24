<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SSpinner, SSwitch, toast } from '@sub2api/ui'
import type { StickySettings } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'

// Global sticky-session settings (GET/PUT /settings/sticky).
withDefaults(defineProps<{ bare?: boolean }>(), { bare: false })
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('sticky:manage'))

const loading = ref(false)
const saving = ref(false)
const loaded = ref<StickySettings | null>(null)
const form = reactive<StickySettings>({ enabled: true, default_ttl_seconds: 3600, keep_on_account_disabled: false })
const errors = ref<Record<string, string>>({})

const dirty = computed(() => !!loaded.value && JSON.stringify(loaded.value) !== JSON.stringify({ ...form }))

async function load() {
  loading.value = true
  try {
    const r = await api.get<StickySettings>('/settings/sticky')
    Object.assign(form, { enabled: !!r?.enabled, default_ttl_seconds: Number(r?.default_ttl_seconds ?? 3600), keep_on_account_disabled: !!r?.keep_on_account_disabled })
    loaded.value = { ...form }
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  errors.value = {}
  const ttl = Number(form.default_ttl_seconds)
  if (!Number.isInteger(ttl) || ttl <= 0) {
    errors.value = { default_ttl_seconds: t('sticky.settings.ttlInvalid') }
    return
  }
  saving.value = true
  try {
    const body = { ...form, default_ttl_seconds: ttl }
    const r = await api.put<StickySettings>('/settings/sticky', body)
    if (r && typeof r === 'object' && 'enabled' in r) Object.assign(form, r)
    loaded.value = { ...form }
    toast(t('common.saved'), 'success')
  } catch (e) {
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <component :is="bare ? 'div' : SCard" v-bind="bare ? {} : { title: t('sticky.settings.title') }">
    <div v-if="loading && !loaded" class="py-6 text-center"><SSpinner /></div>
    <div v-else class="space-y-4">
      <div class="grid gap-4 md:grid-cols-3">
        <SField :label="t('sticky.settings.enabled')" :hint="t('sticky.settings.enabledHint')">
          <div class="pt-2"><SSwitch v-model="form.enabled" :disabled="!canManage" /></div>
        </SField>
        <SField :label="t('sticky.settings.defaultTtl')" :hint="t('sticky.settings.defaultTtlHint')" :error="errors.default_ttl_seconds">
          <div class="flex items-center gap-2">
            <input v-model.number="form.default_ttl_seconds" type="number" min="1" class="input" :disabled="!canManage" />
            <span class="muted text-sm">{{ t('sticky.seconds') }}</span>
          </div>
        </SField>
        <SField :label="t('sticky.settings.keepOnDisabled')" :hint="t('sticky.settings.keepOnDisabledHint')">
          <div class="pt-2"><SSwitch v-model="form.keep_on_account_disabled" :disabled="!canManage" /></div>
        </SField>
      </div>
      <div v-if="canManage" class="flex justify-end gap-2">
        <SButton v-if="dirty" size="sm" @click="loaded && Object.assign(form, loaded)">{{ t('common.reset') }}</SButton>
        <SButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t('common.save') }}</SButton>
      </div>
    </div>
  </component>
</template>
