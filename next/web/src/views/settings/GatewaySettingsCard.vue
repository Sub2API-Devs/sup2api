<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SSpinner, toast } from '@sub2api/ui'
import { GATEWAY_SETTINGS_RANGES, type GatewaySettings } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'

// Gateway settings (GET/PUT /settings/gateway, CONTRACTS §8, §14.4).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

type Key = keyof GatewaySettings
const DEFAULTS: GatewaySettings = { max_attempts: 3, platform_call_timeout_ms: 2000, default_hook_timeout_ms: 300 }
const fields: Array<{ key: Key; unit?: string }> = [
  { key: 'max_attempts' },
  { key: 'platform_call_timeout_ms', unit: 'ms' },
  { key: 'default_hook_timeout_ms', unit: 'ms' }
]

const loading = ref(false)
const saving = ref(false)
const loaded = ref<GatewaySettings | null>(null)
const form = reactive<Record<Key, number | string>>({ ...DEFAULTS })
const errors = ref<Record<string, string>>({})

const dirty = computed(() => !!loaded.value && fields.some((f) => String(form[f.key]) !== String(loaded.value![f.key])))

function assign(r: Partial<GatewaySettings> | null | undefined) {
  for (const f of fields) form[f.key] = Number(r?.[f.key] ?? DEFAULTS[f.key])
}

async function load() {
  loading.value = true
  try {
    assign(await api.get<GatewaySettings>('/settings/gateway'))
    loaded.value = { ...(form as GatewaySettings) }
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

function rangeHint(k: Key): string {
  const [min, max] = GATEWAY_SETTINGS_RANGES[k]
  return t('settings.gateway.range', { min, max })
}

/** Client-side check for whole numbers only; ranges are enforced by the server (field errors). */
function validate(): GatewaySettings | null {
  const out: Record<string, string> = {}
  const body = {} as GatewaySettings
  for (const f of fields) {
    const raw = String(form[f.key]).trim()
    const n = Number(raw)
    if (raw === '' || !Number.isInteger(n)) out[f.key] = t('settings.gateway.notInteger')
    else body[f.key] = n
  }
  errors.value = out
  return Object.keys(out).length ? null : body
}

async function save() {
  const body = validate()
  if (!body) return
  saving.value = true
  try {
    const r = await api.put<GatewaySettings>('/settings/gateway', body)
    assign(r && typeof r === 'object' && 'max_attempts' in r ? r : body)
    loaded.value = { ...(form as GatewaySettings) }
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

onMounted(load)
</script>

<template>
  <SCard :title="t('settings.gateway.title')" :subtitle="t('settings.gateway.subtitle')" data-testid="gateway-settings">
    <div v-if="loading && !loaded" class="py-6 text-center"><SSpinner /></div>
    <div v-else class="space-y-4">
      <div class="grid gap-4 md:grid-cols-3">
        <SField
          v-for="f in fields"
          :key="f.key"
          :label="t(`settings.gateway.fields.${f.key}`)"
          :hint="`${t(`settings.gateway.hints.${f.key}`)} ${rangeHint(f.key)}`"
          :error="errors[f.key]"
        >
          <div class="flex items-center gap-2">
            <input
              v-model="form[f.key]"
              type="number"
              step="1"
              :min="GATEWAY_SETTINGS_RANGES[f.key][0]"
              :max="GATEWAY_SETTINGS_RANGES[f.key][1]"
              class="input"
              :name="f.key"
              :disabled="!canManage"
            />
            <span v-if="f.unit" class="muted text-sm">{{ f.unit }}</span>
          </div>
        </SField>
      </div>
      <div v-if="canManage" class="flex justify-end gap-2">
        <SButton v-if="dirty" size="sm" @click="reset">{{ t('common.reset') }}</SButton>
        <SButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t('common.save') }}</SButton>
      </div>
    </div>
  </SCard>
</template>
