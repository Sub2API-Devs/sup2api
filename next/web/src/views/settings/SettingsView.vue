<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SGrid, SHint, SInput, SPageHeader, SRadio, SSpinner, STabs, toast } from '@sub2api/ui'
import type { BillingSettings } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
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
const billing = reactive<BillingSettings>({ pre_consume_tokens: 500, missing_price_policy: 'reject', min_balance: '0', big_cost_warning_usd: '10' })
const billingLoaded = ref<BillingSettings | null>(null)
const billingLoading = ref(false)
const billingSaving = ref(false)
const errors = ref<Record<string, string>>({})
const dirty = computed(() => !!billingLoaded.value && JSON.stringify(billingLoaded.value) !== JSON.stringify({ ...billing }))

async function loadBilling() {
  if (!auth.has('settings:read')) return
  billingLoading.value = true
  try {
    const r = await api.get<BillingSettings>('/settings/billing')
    Object.assign(billing, {
      pre_consume_tokens: r?.pre_consume_tokens ?? 500,
      missing_price_policy: r?.missing_price_policy === 'free' ? 'free' : 'reject',
      min_balance: String(r?.min_balance ?? '0'),
      big_cost_warning_usd: String(r?.big_cost_warning_usd ?? '10')
    })
    billingLoaded.value = { ...billing }
  } catch (e) {
    notifyError(e)
  } finally {
    billingLoading.value = false
  }
}

const DECIMAL = /^-?\d+(\.\d{1,8})?$/

async function saveBilling() {
  errors.value = {}
  const min = billing.min_balance.trim()
  const warn = billing.big_cost_warning_usd.trim()
  if (!Number.isInteger(billing.pre_consume_tokens) || billing.pre_consume_tokens < 0 || billing.pre_consume_tokens > 100000000) errors.value.pre_consume_tokens = t('settings.billing.preConsumeInvalid')
  if (!DECIMAL.test(min)) errors.value.min_balance = t('settings.billing.decimalInvalid')
  if (!DECIMAL.test(warn) || Number(warn) < 0) errors.value.big_cost_warning_usd = t('settings.billing.decimalInvalid')
  if (Object.keys(errors.value).length) return
  billingSaving.value = true
  try {
    const r = await api.put<BillingSettings>('/settings/billing', { pre_consume_tokens: billing.pre_consume_tokens, missing_price_policy: billing.missing_price_policy, min_balance: min, big_cost_warning_usd: warn })
    if (r && typeof r === 'object' && 'missing_price_policy' in r) {
      Object.assign(billing, { ...r, min_balance: String(r.min_balance), big_cost_warning_usd: String(r.big_cost_warning_usd) })
    } else Object.assign(billing, { min_balance: min, big_cost_warning_usd: warn })
    billingLoaded.value = { ...billing }
    toast(t('common.saved'), 'success')
  } catch (e) {
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    billingSaving.value = false
  }
}

onMounted(loadBilling)
</script>

<template>
  <div class="space-y-5">
    <SPageHeader :title="t('settings.title')" :description="t('settings.description')" />
    <STabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" />

    <template v-if="tab === 'billing' && auth.has('settings:read')">
      <SCard :title="t('settings.billing.title')">
        <div v-if="billingLoading && !billingLoaded" class="py-8 text-center"><SSpinner /></div>
        <div v-else class="space-y-6">
          <SField :label="t('settings.billing.missingPolicy')">
            <SGrid :cols="1" :md-cols="2" :gap="2">
              <SRadio
                v-for="p in ['reject', 'free'] as const"
                :key="p"
                :model-value="billing.missing_price_policy"
                :value="p"
                :disabled="!canManageBilling"
                class="!items-start rounded-xl border p-3"
                :class="billing.missing_price_policy === p ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-dark-700'"
                @update:model-value="billing.missing_price_policy = p"
              >
                <span class="font-medium">{{ t(`settings.billing.policy.${p}`) }}</span>
                <SHint inline size="xs" class="block">{{ t(`settings.billing.policyHint.${p}`) }}</SHint>
              </SRadio>
            </SGrid>
          </SField>
          <SGrid :cols="1" :md-cols="2">
            <SField :label="t('settings.billing.preConsumeTokens')" :hint="t('settings.billing.preConsumeHint')" :error="errors.pre_consume_tokens">
              <SInput v-model.number="billing.pre_consume_tokens" type="number" min="0" max="100000000" step="1" :disabled="!canManageBilling" />
            </SField>
            <SField :label="t('settings.billing.minBalance')" :hint="t('settings.billing.minBalanceHint')" :error="errors.min_balance">
              <div class="flex items-center gap-2">
                <SInput v-model="billing.min_balance" mono inputmode="decimal" :disabled="!canManageBilling" />
                <SHint inline>USD</SHint>
              </div>
            </SField>
            <SField :label="t('settings.billing.bigCost')" :hint="t('settings.billing.bigCostHint')" :error="errors.big_cost_warning_usd">
              <div class="flex items-center gap-2">
                <SInput v-model="billing.big_cost_warning_usd" mono inputmode="decimal" :disabled="!canManageBilling" />
                <SHint inline>USD</SHint>
              </div>
            </SField>
          </SGrid>
          <div v-if="canManageBilling" class="flex justify-end gap-2">
            <SButton v-if="dirty" size="sm" @click="billingLoaded && Object.assign(billing, billingLoaded)">{{ t('common.reset') }}</SButton>
            <SButton size="sm" variant="primary" :loading="billingSaving" :disabled="!dirty" @click="saveBilling">{{ t('common.save') }}</SButton>
          </div>
        </div>
      </SCard>
    </template>

    <template v-else-if="tab === 'gateway' && auth.has('settings:read')">
      <GatewaySettingsCard />
      <AutoDisableSettingsCard />
    </template>
    <StickyView v-else-if="tab === 'sticky' && auth.has('sticky:read')" />
    <OffloadSettingsCard v-else-if="tab === 'offload' && auth.has('settings:read')" />
    <UpdateSourceCard v-else-if="tab === 'updates' && auth.has('settings:read')" />
  </div>
</template>
