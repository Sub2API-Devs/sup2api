<script setup lang="ts">
// "Usage limit" card of the scheduling section (CONTRACTS §73): raw-ratio
// accounting, the limit and its period. Saved on its own endpoint after the
// account (useAccountSave afterSave), for every account type.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SInput, SSegmented, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import type { AccountUsage, AccountUsageLimit, UsageLimitPeriod } from '@/api/types'
import { formatDateTime, formatMoney } from '@/utils/format'

const model = defineModel<AccountUsageLimit>({ required: true })
const props = defineProps<{ usage?: AccountUsage | null; disabled?: boolean; errors?: Record<string, string> }>()
const { t } = useI18n()

const periods: UsageLimitPeriod[] = ['hour', 'day', 'week', 'month', 'none']
const periodOptions = computed(() => periods.map((p) => ({ value: p, label: t(`accounts.usageLimit.periods.${p}`) })))
const set = <K extends keyof AccountUsageLimit>(key: K, value: AccountUsageLimit[K]) => (model.value = { ...model.value, [key]: value })

/** datetime-local value (local wall time, whole hours) of the stored anchor. */
const anchorInput = computed(() => {
  if (!model.value.anchor) return ''
  const d = new Date(model.value.anchor)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
})
function setAnchor(v: unknown) {
  if (!v || typeof v !== 'string') return set('anchor', null)
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return
  d.setMinutes(0, 0, 0)
  set('anchor', d.toISOString())
}

const current = computed(() => props.usage?.limit ?? null)
</script>

<template>
  <SSettingsGroup :title="t('accounts.usageLimit.title')" :description="t('accounts.usageLimit.description')" data-testid="account-usage-limit">
    <SSettingRow :label="t('accounts.usageLimit.rawCost')" :description="t('accounts.usageLimit.rawCostHint')">
      <SSwitch :model-value="model.raw_cost_accounting" :disabled="disabled" data-testid="usage-limit-raw" @update:model-value="set('raw_cost_accounting', $event)" />
    </SSettingRow>
    <SSettingRow :label="t('accounts.usageLimit.enabled')" :description="t('accounts.usageLimit.enabledHint')">
      <SSwitch :model-value="model.enabled" :disabled="disabled" data-testid="usage-limit-enabled" @update:model-value="set('enabled', $event)" />
    </SSettingRow>
    <template v-if="model.enabled">
      <SSettingRow
        :label="t('accounts.usageLimit.amount')"
        :description="t('accounts.usageLimit.amountHint', { basis: t(model.raw_cost_accounting ? 'accounts.usageLimit.basisRaw' : 'accounts.usageLimit.basisCost') })"
        :error="errors?.amount"
      >
        <SInput :model-value="model.amount" type="number" min="0" step="0.01" inputmode="decimal" :suffix="t('accounts.usageLimit.unit')" :disabled="disabled" class="w-full sm:w-48" data-testid="usage-limit-amount" @update:model-value="set('amount', String($event ?? ''))" />
      </SSettingRow>
      <SSettingRow :label="t('accounts.usageLimit.period')" :description="t('accounts.usageLimit.periodHint')" :error="errors?.period">
        <SSegmented :model-value="model.period" :options="periodOptions" size="sm" :disabled="disabled" :aria-label="t('accounts.usageLimit.period')" data-testid="usage-limit-period" @update:model-value="set('period', $event as UsageLimitPeriod)" />
      </SSettingRow>
      <template v-if="model.period !== 'none'">
        <SSettingRow :label="t('accounts.usageLimit.periodCount')" :description="t('accounts.usageLimit.periodCountHint')" :error="errors?.period_count">
          <SInput :model-value="model.period_count" type="number" min="1" max="1000" :suffix="t('accounts.usageLimit.periodCountUnit')" :disabled="disabled" class="w-full sm:w-48" data-testid="usage-limit-count" @update:model-value="set('period_count', Number($event) || 0)" />
        </SSettingRow>
        <SSettingRow :label="t('accounts.usageLimit.anchor')" :description="t('accounts.usageLimit.anchorHint')" :error="errors?.anchor">
          <SInput :model-value="anchorInput" type="datetime-local" step="3600" :disabled="disabled" class="w-full sm:w-56" clearable data-testid="usage-limit-anchor" @update:model-value="setAnchor" />
        </SSettingRow>
      </template>
      <div v-if="current" class="flex flex-wrap justify-between gap-2 px-4 py-3 text-xs tabular-nums" data-testid="usage-limit-current">
        <span class="text-fg-muted">
          {{ current.window_start && current.window_end
            ? t('accounts.usageLimit.current', { start: formatDateTime(current.window_start), end: formatDateTime(current.window_end) })
            : t('accounts.usageLimit.currentTotal') }}
        </span>
        <span class="font-semibold">{{ formatMoney(current.used, 2) }} / {{ formatMoney(current.amount, 2) }}</span>
      </div>
    </template>
  </SSettingsGroup>
</template>
