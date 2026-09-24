<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, SField, SPageHeader, SSpinner, STabs, toast } from '@sub2api/ui'
import type { BillingSettings } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { fieldErrors, notifyError } from '@/utils/errors'
import StickySettingsCard from '@/views/sticky/StickySettingsCard.vue'

const { t } = useI18n()
const auth = useAuthStore()

const tabs = computed(() => {
  const out = []
  if (auth.has('settings:read')) out.push({ key: 'billing', label: t('settings.tabs.billing') })
  if (auth.has('sticky:read')) out.push({ key: 'sticky', label: t('settings.tabs.sticky') })
  return out
})
const tab = ref(tabs.value[0]?.key || 'billing')

// ------------------------------------------------------------------ billing

const canManageBilling = computed(() => auth.has('settings:manage'))
const billing = reactive<BillingSettings>({ missing_price_policy: 'reject', min_balance: '0', big_cost_warning_usd: '10' })
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
  if (!DECIMAL.test(min)) errors.value.min_balance = t('settings.billing.decimalInvalid')
  if (!DECIMAL.test(warn) || Number(warn) < 0) errors.value.big_cost_warning_usd = t('settings.billing.decimalInvalid')
  if (Object.keys(errors.value).length) return
  billingSaving.value = true
  try {
    const r = await api.put<BillingSettings>('/settings/billing', { missing_price_policy: billing.missing_price_policy, min_balance: min, big_cost_warning_usd: warn })
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
            <div class="grid gap-2 md:grid-cols-2">
              <label
                v-for="p in ['reject', 'free'] as const"
                :key="p"
                class="flex cursor-pointer gap-2 rounded-xl border p-3 text-sm"
                :class="billing.missing_price_policy === p ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-dark-700'"
              >
                <input v-model="billing.missing_price_policy" type="radio" class="checkbox mt-0.5 !rounded-full" :value="p" :disabled="!canManageBilling" />
                <span>
                  <span class="font-medium">{{ t(`settings.billing.policy.${p}`) }}</span>
                  <span class="muted block text-xs">{{ t(`settings.billing.policyHint.${p}`) }}</span>
                </span>
              </label>
            </div>
          </SField>
          <div class="grid gap-4 md:grid-cols-2">
            <SField :label="t('settings.billing.minBalance')" :hint="t('settings.billing.minBalanceHint')" :error="errors.min_balance">
              <div class="flex items-center gap-2">
                <input v-model="billing.min_balance" class="input font-mono" inputmode="decimal" :disabled="!canManageBilling" />
                <span class="muted text-sm">USD</span>
              </div>
            </SField>
            <SField :label="t('settings.billing.bigCost')" :hint="t('settings.billing.bigCostHint')" :error="errors.big_cost_warning_usd">
              <div class="flex items-center gap-2">
                <input v-model="billing.big_cost_warning_usd" class="input font-mono" inputmode="decimal" :disabled="!canManageBilling" />
                <span class="muted text-sm">USD</span>
              </div>
            </SField>
          </div>
          <div v-if="canManageBilling" class="flex justify-end gap-2">
            <SButton v-if="dirty" size="sm" @click="billingLoaded && Object.assign(billing, billingLoaded)">{{ t('common.reset') }}</SButton>
            <SButton size="sm" variant="primary" :loading="billingSaving" :disabled="!dirty" @click="saveBilling">{{ t('common.save') }}</SButton>
          </div>
        </div>
      </SCard>
    </template>

    <StickySettingsCard v-else-if="tab === 'sticky' && auth.has('sticky:read')" />
  </div>
</template>
