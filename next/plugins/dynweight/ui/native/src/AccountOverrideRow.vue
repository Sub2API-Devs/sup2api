<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SInput, SSelect } from '@sub2api/ui'
import { enumOptions, useDwHost, type AccountOverride } from './host'

// One account override: each field left to inherit follows the account's
// layer. The exempt status codes can also be overridden to none (an empty
// list), which is not the same as inheriting.
defineProps<{ label: string }>()
const o = defineModel<AccountOverride>({ required: true })
const emit = defineEmits<{ (e: 'remove'): void }>()
const t = useDwHost().t

const inherit = computed(() => ({ value: '', label: t('accounts.inherit') }))
const enabledOptions = computed(() => [inherit.value, ...enumOptions('accounts', ['on', 'off'])])
const floorOptions = computed(() => [inherit.value, ...enumOptions('floor', ['base_percent', 'fixed'])])
const exemptOptions = computed(() => [inherit.value, ...enumOptions('accounts', ['custom'])])

const enabled = computed(() => (o.value.enabled === undefined ? '' : o.value.enabled ? 'on' : 'off'))
function setEnabled(v: string) {
  o.value.enabled = v === '' ? undefined : v === 'on'
}
function setFloorMode(v: string) {
  o.value.min_weight_mode = v === '' ? undefined : (v as AccountOverride['min_weight_mode'])
  o.value.min_weight = v === '' ? undefined : (o.value.min_weight ?? 0)
}
function setExempt(v: string) {
  o.value.exempt_status_codes = v === '' ? undefined : (o.value.exempt_status_codes ?? '')
}
</script>

<template>
  <div class="dw-row">
    <span class="dw-w-12">{{ label }}</span>
    <SField class="dw-w-8" :label="t('accounts.enabled')">
      <SSelect :model-value="enabled" :options="enabledOptions" @update:model-value="setEnabled($event as string)" />
    </SField>
    <SField class="dw-w-8" :label="t('layer.exempt')">
      <SSelect :model-value="o.exempt_status_codes === undefined ? '' : 'custom'" :options="exemptOptions" @update:model-value="setExempt($event as string)" />
    </SField>
    <SField v-if="o.exempt_status_codes !== undefined" class="dw-grow" :label="t('accounts.exemptCodes')">
      <SInput v-model="o.exempt_status_codes" :placeholder="t('accounts.exemptNone')" />
    </SField>
    <SField class="dw-w-10" :label="t('layer.floorMode')">
      <SSelect :model-value="o.min_weight_mode ?? ''" :options="floorOptions" @update:model-value="setFloorMode($event as string)" />
    </SField>
    <SField class="dw-w-8" :label="t('layer.floor')">
      <SInput v-model="o.min_weight" type="number" min="0" :disabled="!o.min_weight_mode" />
    </SField>
    <SButton class="dw-end" size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" @click="emit('remove')" />
  </div>
</template>
