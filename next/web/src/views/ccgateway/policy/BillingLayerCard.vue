<script setup lang="ts">
// Billing-header layer of the request policy (CONTRACTS §53): every level gives
// a request without a billing header the main thread's full one; one with it
// has its two fields converted.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SSegmented, SSelect, SSettingRow, SSettingsGroup } from '@sub2api/ui'
import type { SelectOption } from '@sub2api/ui'
import { billingEntrypoints, billingFields, defaultBillingEntrypoint, type BillingEntrypoint, type BillingField } from '../requestPolicy'
import { usePolicyLayers } from '../usePolicyLayerContext'

const { t } = useI18n()
const layers = usePolicyLayers()
const entrypointOptions = billingEntrypoints.map(value => ({ value, label: value }))
const entrypoint = computed(() => layers.view.value.build_billing_entrypoint ?? defaultBillingEntrypoint)
const setEntrypoint = (value: unknown) => layers.edit(draft => { draft.build_billing_entrypoint = value as BillingEntrypoint })
const sourceOptions = computed<SelectOption[]>(() => (['client', 'worker'] as const).map(value => ({ value, label: t('ccgateway.layers.billingSources.' + value) })))
const billingSource = (field: BillingField) => layers.view.value.build_billing_sources?.[field] ?? 'client'
const setBillingSource = (field: BillingField, value: unknown) => layers.edit(draft => { draft.build_billing_sources = { ...draft.build_billing_sources, [field]: value as 'client' | 'worker' } })
</script>

<template>
  <SSettingsGroup
    :title="t('ccgateway.layers.billing')"
    :description="layers.layerOrigin('billing')"
    dense
    data-testid="billing-sources"
  >
    <template #actions>
      <SChip size="xs">
        {{ t('ccgateway.levels.from.billing') }}
      </SChip>
      <SSegmented
        v-if="layers.toggles.value"
        :model-value="layers.modeOf('billing')"
        :options="layers.modeOptions.value"
        size="sm"
        :disabled="layers.disabled.value"
        :aria-label="layers.modeLabel('billing')"
        data-testid="layer-mode-billing"
        @update:model-value="layers.setMode('billing', $event)"
      />
    </template>
    <SSettingRow
      :label="t('ccgateway.levels.billingMissing')"
      :description="t('ccgateway.levels.billingMissingHint')"
      size="sm"
      data-testid="billing-entrypoint"
    >
      <span class="text-xs text-fg-muted">{{ t('ccgateway.layers.entrypoint') }}</span>
      <SSelect
        :model-value="entrypoint"
        :options="entrypointOptions"
        :disabled="!layers.editable('billing')"
        class="w-40"
        data-testid="billing-entrypoint-select"
        @update:model-value="setEntrypoint"
      />
    </SSettingRow>
    <SSettingRow
      :label="t('ccgateway.levels.billingPresent')"
      :description="t('ccgateway.levels.billingPresentHint')"
      size="sm"
      data-testid="billing-present"
    >
      <template
        v-for="field in billingFields"
        :key="field"
      >
        <span class="text-xs text-fg-muted">{{ t(field === 'cc_version' ? 'ccgateway.levels.version' : 'ccgateway.layers.entrypoint') }}</span>
        <SSegmented
          :model-value="billingSource(field)"
          :options="sourceOptions"
          size="sm"
          :disabled="!layers.editable('billing')"
          :aria-label="t('ccgateway.layers.' + field)"
          :data-testid="'billing-' + field"
          @update:model-value="setBillingSource(field, $event)"
        />
      </template>
    </SSettingRow>
  </SSettingsGroup>
</template>
