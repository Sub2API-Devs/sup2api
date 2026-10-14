<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SField, SHint, SInput, SPageHeader, SSegmented, SSettingRow, SSettingsGroup, SSpinner, STabs, type SelectOption } from '@sub2api/ui'
import type { BillingSettings } from '@/api/types'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import { useSettingsForm } from '@/composables/useSettingsForm'
import { useAuthStore } from '@/stores/auth'
import StickyView from '@/views/sticky/StickyView.vue'
import GatewaySettingsCard from './GatewaySettingsCard.vue'
import AutoDisableSettingsCard from './AutoDisableSettingsCard.vue'
import OffloadSettingsCard from './OffloadSettingsCard.vue'
import UpdateSourceCard from './UpdateSourceCard.vue'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()

const tabs = computed(() => {
  const out = []
  if (auth.has('settings:read')) out.push({ key: 'billing', label: t('settings.tabs.billing') })
  if (auth.has('settings:read')) out.push({ key: 'gateway', label: t('settings.tabs.gateway') })
  if (auth.has('sticky:read')) out.push({ key: 'sticky', label: t('settings.tabs.sticky') })
  if (auth.has('settings:read')) out.push({ key: 'offload', label: t('settings.tabs.offload') })
  if (auth.has('settings:read')) out.push({ key: 'updates', label: t('coreUpdates.sourceTitle') })
  return out
})
const tab = ref(tabs.value[0]?.key || 'billing')
watch(() => route.query.tab, value => { if (typeof value === 'string' && tabs.value.some(t => t.key === value)) tab.value = value }, { immediate: true })

// ------------------------------------------------------------------ billing

const canManageBilling = computed(() => auth.has('settings:manage'))
const DECIMAL = /^-?\d+(\.\d{1,8})?$/
const policyOptions = computed<SelectOption[]>(() => (['reject', 'free'] as const).map((p) => ({ value: p, label: t(`settings.billing.policy.${p}`) })))

const { form, errors, dirty, saving, loading, isLoaded, load, save, reset } = useSettingsForm<BillingSettings>({
  path: '/settings/billing',
  defaults: { pre_consume_tokens: 500, missing_price_policy: 'reject', min_balance: '0', big_cost_warning_usd: '10' },
  responseKey: 'missing_price_policy',
  fromServer: (r) => ({
    pre_consume_tokens: r?.pre_consume_tokens ?? 500,
    missing_price_policy: r?.missing_price_policy === 'free' ? 'free' : 'reject',
    min_balance: String(r?.min_balance ?? '0'),
    big_cost_warning_usd: String(r?.big_cost_warning_usd ?? '10')
  }),
  toBody: (f, errs) => {
    const min = String(f.min_balance).trim()
    const warn = String(f.big_cost_warning_usd).trim()
    if (!Number.isInteger(f.pre_consume_tokens) || f.pre_consume_tokens < 0 || f.pre_consume_tokens > 100000000) errs.pre_consume_tokens = t('settings.billing.preConsumeInvalid')
    if (!DECIMAL.test(min)) errs.min_balance = t('settings.billing.decimalInvalid')
    if (!DECIMAL.test(warn) || Number(warn) < 0) errs.big_cost_warning_usd = t('settings.billing.decimalInvalid')
    return { pre_consume_tokens: f.pre_consume_tokens, missing_price_policy: f.missing_price_policy, min_balance: min, big_cost_warning_usd: warn }
  }
})

onMounted(() => {
  if (auth.has('settings:read')) void load()
})
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="t('settings.title')" :description="t('settings.description')" />
    <STabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" />

    <SSettingsGroup v-if="tab === 'billing' && auth.has('settings:read')" :title="t('settings.billing.title')" data-testid="billing-settings">
      <template #actions>
        <SettingsSaveBar :dirty="dirty" :saving="saving" :can-manage="canManageBilling" @save="save" @reset="reset" />
      </template>
      <div v-if="loading && !isLoaded" class="py-6 text-center"><SSpinner /></div>
      <template v-else>
        <SSettingRow :label="t('settings.billing.missingPolicy')" :description="t(`settings.billing.policyHint.${form.missing_price_policy}`)">
          <SSegmented
            :model-value="form.missing_price_policy"
            :options="policyOptions"
            size="sm"
            :disabled="!canManageBilling"
            :aria-label="t('settings.billing.missingPolicy')"
            data-testid="missing-price-policy"
            @update:model-value="form.missing_price_policy = $event as BillingSettings['missing_price_policy']"
          />
        </SSettingRow>
        <SSettingRow :label="t('settings.billing.preConsumeTokens')" :description="t('settings.billing.preConsumeHint')" for="billing-pre-consume">
          <SField :error="errors.pre_consume_tokens" class="w-full sm:w-48">
            <SInput id="billing-pre-consume" v-model.number="form.pre_consume_tokens" type="number" min="0" max="100000000" step="1" :error="!!errors.pre_consume_tokens" :disabled="!canManageBilling" />
          </SField>
        </SSettingRow>
        <SSettingRow :label="t('settings.billing.minBalance')" :description="t('settings.billing.minBalanceHint')" for="billing-min-balance">
          <SField :error="errors.min_balance" class="w-full sm:w-48">
            <div class="flex items-center gap-2">
              <SInput id="billing-min-balance" v-model="form.min_balance" mono inputmode="decimal" :error="!!errors.min_balance" :disabled="!canManageBilling" />
              <SHint inline>{{ t('common.usd') }}</SHint>
            </div>
          </SField>
        </SSettingRow>
        <SSettingRow :label="t('settings.billing.bigCost')" :description="t('settings.billing.bigCostHint')" for="billing-big-cost">
          <SField :error="errors.big_cost_warning_usd" class="w-full sm:w-48">
            <div class="flex items-center gap-2">
              <SInput id="billing-big-cost" v-model="form.big_cost_warning_usd" mono inputmode="decimal" :error="!!errors.big_cost_warning_usd" :disabled="!canManageBilling" />
              <SHint inline>{{ t('common.usd') }}</SHint>
            </div>
          </SField>
        </SSettingRow>
      </template>
    </SSettingsGroup>

    <template v-else-if="tab === 'gateway' && auth.has('settings:read')">
      <GatewaySettingsCard />
      <AutoDisableSettingsCard />
    </template>
    <StickyView v-else-if="tab === 'sticky' && auth.has('sticky:read')" />
    <OffloadSettingsCard v-else-if="tab === 'offload' && auth.has('settings:read')" />
    <UpdateSourceCard v-else-if="tab === 'updates' && auth.has('settings:read')" />
  </div>
</template>
