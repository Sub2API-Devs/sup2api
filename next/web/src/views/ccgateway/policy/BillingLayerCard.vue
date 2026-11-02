<script setup lang="ts">
// Billing-header layer of the request policy (CONTRACTS §53): every level gives
// a request without a billing header the main thread's full one; one with it
// has its two fields converted; an official client on a custom base URL may
// be converted to the first-party shape (first_party_shape, 2026-11-03).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SSegmented, SSelect, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import type { SelectOption } from '@sub2api/ui'
import { billingEntrypoints, billingFields, defaultBillingEntrypoint, type BillingEntrypoint, type BillingField } from '../requestPolicy'
import { usePolicyLayers } from '../usePolicyLayerContext'

const { t } = useI18n()
const layers = usePolicyLayers()
const entrypointOptions = billingEntrypoints.map(value => ({ value, label: value }))
const entrypoint = computed(() => layers.view.build_billing_entrypoint ?? defaultBillingEntrypoint)
const setEntrypoint = (value: unknown) => layers.edit(draft => { draft.build_billing_entrypoint = value as BillingEntrypoint })
const sourceOptions = computed<SelectOption[]>(() => (['client', 'worker'] as const).map(value => ({ value, label: t('ccgateway.layers.billingSources.' + value) })))
const billingSource = (field: BillingField) => layers.view.build_billing_sources?.[field] ?? 'client'
const setBillingSource = (field: BillingField, value: unknown) => layers.edit(draft => { draft.build_billing_sources = { ...draft.build_billing_sources, [field]: value as 'client' | 'worker' } })
// Absent is on (the default, CONTRACTS §53.23).
const firstPartyShape = computed(() => layers.view.first_party_shape ?? true)
const setFirstPartyShape = (on: boolean) => layers.edit(draft => { draft.first_party_shape = on })
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
        v-if="layers.toggles"
        :model-value="layers.modeOf('billing')"
        :options="layers.modeOptions"
        size="sm"
        :disabled="layers.disabled"
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
    <SSettingRow
      :label="t('ccgateway.levels.firstPartyShape')"
      :description="t('ccgateway.levels.firstPartyShapeHint')"
      size="sm"
      data-testid="billing-first-party-shape"
    >
      <SSwitch
        :model-value="firstPartyShape"
        :disabled="!layers.editable('billing')"
        data-testid="first-party-shape"
        @update:model-value="setFirstPartyShape"
      />
    </SSettingRow>
  </SSettingsGroup>
</template>
