<script setup lang="ts">
// The account's concurrency, RPM, TPM, TPD and sessions by client model
// (CONTRACTS §68.7), as new-api's channel RPM / TPM / TPD / SPM popover:
// mounted with the limits cell's hover card, it reloads every POLL_MS while
// open, one request at a time, and stops when the card closes.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint, SSpinner } from '@sub2api/ui'
import type { AccountRateFigures, AccountRateModels } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { fetchRateModels } from './accountLimits'

const props = defineProps<{ accountId: number }>()
const { t } = useI18n()
const POLL_MS = 2000

const data = ref<AccountRateModels | null>(null)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let stopped = false

async function load() {
  try {
    data.value = await fetchRateModels(props.accountId)
    failed.value = false
  } catch {
    failed.value = true
  }
  if (!stopped) timer = setTimeout(load, POLL_MS)
}
onMounted(load)
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(timer)
})

const COLUMNS = ['in_use', 'rpm', 'tpm', 'tpd', 'sessions'] as const
const cell = (r: AccountRateFigures, key: (typeof COLUMNS)[number]) => formatCompact(r[key])
</script>

<template>
  <div class="whitespace-normal" data-testid="account-model-rates">
    <table v-if="data" class="w-full text-xs tabular-nums">
      <thead class="text-fg-muted">
        <tr>
          <th class="pb-1 pr-3 text-left font-normal">{{ t('accounts.limitsUi.model') }}</th>
          <th v-for="c in COLUMNS" :key="c" class="pb-1 pr-3 text-right font-normal last:pr-0">{{ t(`accounts.limitsUi.cols.${c}`) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-t border-line font-semibold" data-testid="account-model-rates-total">
          <td class="py-1 pr-3">{{ t('accounts.limitsUi.allModels') }}</td>
          <td v-for="c in COLUMNS" :key="c" class="py-1 pr-3 text-right last:pr-0">{{ cell(data.total, c) }}</td>
        </tr>
        <tr v-for="r in data.models" :key="r.model" class="border-t border-line" data-testid="account-model-rates-row">
          <td class="max-w-56 truncate py-1 pr-3 font-mono" :title="r.model">{{ r.model }}</td>
          <td v-for="c in COLUMNS" :key="c" class="py-1 pr-3 text-right last:pr-0" :class="r[c] ? '' : 'text-fg-subtle'">
            {{ cell(r, c) }}
          </td>
        </tr>
      </tbody>
    </table>
    <SSpinner v-else-if="!failed" />
    <SHint v-if="data && !data.models.length" size="xs">{{ t('accounts.limitsUi.noModels') }}</SHint>
    <SHint v-if="failed" size="xs" tone="warning">{{ t('accounts.limitsUi.modelsFailed') }}</SHint>
  </div>
</template>
