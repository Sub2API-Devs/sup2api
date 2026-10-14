<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SField, SHint, SInput, SSettingRow, SSettingsGroup, SSpinner } from '@sub2api/ui'
import { GATEWAY_SETTINGS_RANGES, type GatewaySettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'

// Gateway settings (GET/PUT /settings/gateway, CONTRACTS §8, §14.4).
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))

type Key = keyof GatewaySettings
type Form = Record<Key, number | string | null>
const DEFAULTS: GatewaySettings = {
  max_attempts: 3,
  platform_call_timeout_ms: 2000,
  default_hook_timeout_ms: 300,
  platform_hotpath_timeout_ms: 300
}
const fields: Array<{ key: Key; unit?: string }> = [
  { key: 'max_attempts' },
  { key: 'platform_call_timeout_ms', unit: 'ms' },
  { key: 'default_hook_timeout_ms', unit: 'ms' },
  { key: 'platform_hotpath_timeout_ms', unit: 'ms' }
]

const { form, loading, saving, dirty, errors, isLoaded, load, save, reset } = useSettingsForm<Form, GatewaySettings>({
  path: '/settings/gateway',
  defaults: { ...DEFAULTS },
  responseKey: 'max_attempts',
  fromServer: (r) => Object.fromEntries(fields.map((f) => [f.key, Number(r?.[f.key] ?? DEFAULTS[f.key])])) as Form,
  // Client-side check for whole numbers only; ranges are enforced by the server (field errors).
  toBody: (f, errs) => {
    const body = {} as GatewaySettings
    for (const { key } of fields) {
      const raw = String(f[key] ?? '').trim()
      const n = Number(raw)
      if (raw === '' || !Number.isInteger(n)) errs[key] = t('settings.gateway.notInteger')
      else body[key] = n
    }
    return body
  }
})

function rangeHint(k: Key): string {
  const [min, max] = GATEWAY_SETTINGS_RANGES[k]
  return t('settings.gateway.range', { min, max })
}

onMounted(load)
</script>

<template>
  <SSettingsGroup :title="t('settings.gateway.title')" :description="t('settings.gateway.subtitle')" data-testid="gateway-settings">
    <template #actions><SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManage" @save="save" @reset="reset" /></template>
    <div v-if="loading && !isLoaded" class="py-6 text-center"><SSpinner /></div>
    <template v-else>
      <SSettingRow
        v-for="f in fields"
        :key="f.key"
        :label="t(`settings.gateway.fields.${f.key}`)"
        :description="`${t(`settings.gateway.hints.${f.key}`)} ${rangeHint(f.key)}`"
        :for="`gateway-${f.key}`"
      >
        <SField :error="errors[f.key]" class="w-full sm:w-48">
          <div class="flex items-center gap-2">
            <SInput
              :id="`gateway-${f.key}`"
              v-model="form[f.key]"
              type="number"
              step="1"
              :min="GATEWAY_SETTINGS_RANGES[f.key][0]"
              :max="GATEWAY_SETTINGS_RANGES[f.key][1]"
              :name="f.key"
              :error="!!errors[f.key]"
              :disabled="!canManage"
            />
            <SHint v-if="f.unit" inline>{{ f.unit }}</SHint>
          </div>
        </SField>
      </SSettingRow>
    </template>
  </SSettingsGroup>
</template>
