<script setup lang="ts">
// "Usage limit" card of the scheduling section (CONTRACTS §73): raw-ratio
// accounting, the limit and its period, for every account type. The editor
// loads and saves it with useUsageLimitEdit; until the limit has loaded
// (`status` ready) the card is read-only.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SHint, SInput, SSegmented, SSettingRow, SSettingsGroup, SSwitch } from '@sub2api/ui'
import type { AccountUsage, AccountUsageLimit, UsageLimitPeriod } from '@/api/types'
import { fromLocalInput, toLocalInput } from '@/api/admin'
import { formatDateTime, formatMoney } from '@/utils/format'
import { PERIOD_COUNT_MAX } from './accountUsage'
import type { UsageLimitStatus } from './useUsageLimitEdit'

const model = defineModel<AccountUsageLimit>({ required: true })
const props = withDefaults(defineProps<{ usage?: AccountUsage | null; status?: UsageLimitStatus; loadError?: string; disabled?: boolean; errors?: Record<string, string> }>(), {
  usage: null,
  status: 'ready',
  loadError: '',
  errors: () => ({})
})
const emit = defineEmits<{ (e: 'retry'): void }>()
const { t } = useI18n()

const periods: UsageLimitPeriod[] = ['hour', 'day', 'week', 'month', 'none']
const periodOptions = computed(() => periods.map((p) => ({ value: p, label: t(`accounts.usageLimit.periods.${p}`) })))
const locked = computed(() => props.disabled || props.status !== 'ready')
const set = <K extends keyof AccountUsageLimit>(key: K, value: AccountUsageLimit[K]) => (model.value = { ...model.value, [key]: value })

/** Periods start on whole hours: the datetime-local value keeps the hour only. */
const toHour = (v: string) => (v ? `${v.slice(0, 13)}:00` : '')
const anchorInput = computed(() => toHour(toLocalInput(model.value.anchor)))
const setAnchor = (v: unknown) => set('anchor', fromLocalInput(typeof v === 'string' ? toHour(v) : ''))

const current = computed(() => props.usage?.limit ?? null)
</script>

<template>
  <SSettingsGroup :title="t('accounts.usageLimit.title')" :description="t('accounts.usageLimit.description')" data-testid="account-usage-limit">
    <div v-if="status === 'failed'" class="px-4 py-3">
      <SAlert tone="danger" dense data-testid="usage-limit-load-failed">
        {{ t('accounts.usageLimit.loadFailed', { error: loadError }) }}
        <template #actions><SButton size="sm" data-testid="usage-limit-retry" @click="emit('retry')">{{ t('accounts.usageLimit.retry') }}</SButton></template>
      </SAlert>
    </div>
    <SHint v-else-if="status !== 'ready'" size="xs" class="px-4 py-3" data-testid="usage-limit-loading">{{ t('common.loading') }}</SHint>
    <SSettingRow :label="t('accounts.usageLimit.rawCost')" :description="t('accounts.usageLimit.rawCostHint')">
      <SSwitch :model-value="model.raw_cost_accounting" :disabled="locked" data-testid="usage-limit-raw" @update:model-value="set('raw_cost_accounting', $event)" />
    </SSettingRow>
    <SSettingRow :label="t('accounts.usageLimit.enabled')" :description="t('accounts.usageLimit.enabledHint')">
      <SSwitch :model-value="model.enabled" :disabled="locked" data-testid="usage-limit-enabled" @update:model-value="set('enabled', $event)" />
    </SSettingRow>
    <template v-if="model.enabled">
      <SSettingRow
        :label="t('accounts.usageLimit.amount')"
        :description="t('accounts.usageLimit.amountHint', { basis: t(model.raw_cost_accounting ? 'accounts.usageLimit.basisRaw' : 'accounts.usageLimit.basisCost') })"
        :error="errors.amount"
      >
        <SInput :model-value="model.amount" type="number" min="0" step="0.01" inputmode="decimal" :suffix="t('accounts.usageLimit.unit')" :disabled="locked" class="w-full sm:w-48" data-testid="usage-limit-amount" @update:model-value="set('amount', String($event ?? ''))" />
      </SSettingRow>
      <SSettingRow :label="t('accounts.usageLimit.period')" :description="t('accounts.usageLimit.periodHint')" :error="errors.period">
        <SSegmented :model-value="model.period" :options="periodOptions" size="sm" :disabled="locked" :aria-label="t('accounts.usageLimit.period')" data-testid="usage-limit-period" @update:model-value="set('period', $event as UsageLimitPeriod)" />
      </SSettingRow>
      <template v-if="model.period !== 'none'">
        <SSettingRow :label="t('accounts.usageLimit.periodCount')" :description="t('accounts.usageLimit.periodCountHint')" :error="errors.period_count">
          <SInput :model-value="model.period_count" type="number" min="1" :max="PERIOD_COUNT_MAX[model.period]" :suffix="t('accounts.usageLimit.periodCountUnit')" :disabled="locked" class="w-full sm:w-48" data-testid="usage-limit-count" @update:model-value="set('period_count', Number($event) || 0)" />
        </SSettingRow>
        <SSettingRow :label="t('accounts.usageLimit.anchor')" :description="t('accounts.usageLimit.anchorHint')" :error="errors.anchor">
          <SInput :model-value="anchorInput" type="datetime-local" step="3600" min="2000-01-01T00:00" max="2099-12-31T23:00" :disabled="locked" class="w-full sm:w-56" clearable data-testid="usage-limit-anchor" @update:model-value="setAnchor" />
        </SSettingRow>
        <p class="px-4 py-2 text-xs text-fg-muted" data-testid="usage-limit-timezone">{{ t('accounts.usageLimit.timezone', { zone: model.timezone }) }}</p>
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
