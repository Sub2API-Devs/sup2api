<script setup lang="ts">
// Concurrency, RPM, TPM and sessions of an account and of each of its model
// lists (CONTRACTS §68, §71): "used/cap", or only the usage without a cap.
// Shown in the list cell's hover card and in the account detail.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Account } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { figureTone, limitRows, type LimitFigure } from './accountLimits'

const props = defineProps<{ account: Account }>()
const { t } = useI18n()
const rows = computed(() => limitRows(props.account))
const text = (f: LimitFigure) => (f.limit > 0 ? `${formatCompact(f.used)}/${formatCompact(f.limit)}` : formatCompact(f.used))
const tone = (f: LimitFigure) => (figureTone(f) === 'danger' ? 'font-semibold text-danger-600' : figureTone(f) === 'warning' ? 'text-warning-600' : '')
const scopeLabel = (models: string[]) => (models.length > 2 ? `${models.slice(0, 2).join(', ')} +${models.length - 2}` : models.join(', '))
</script>

<template>
  <div class="whitespace-normal" data-testid="account-limits-detail">
    <table class="w-full text-xs tabular-nums">
      <thead class="text-fg-muted">
        <tr>
          <th class="pb-1 pr-3 text-left font-normal">{{ t('accounts.limitsUi.scope') }}</th>
          <th class="pb-1 pr-3 text-right font-normal">{{ t('accounts.concurrency') }}</th>
          <th class="pb-1 pr-3 text-right font-normal">RPM</th>
          <th class="pb-1 pr-3 text-right font-normal">TPM</th>
          <th class="pb-1 text-right font-normal">{{ t('accounts.limitsUi.sessions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i" class="border-t border-line" :data-testid="row.models.length ? 'account-limits-list' : 'account-limits-total'">
          <td class="max-w-56 truncate py-1 pr-3" :title="row.models.join(', ')">{{ row.models.length ? scopeLabel(row.models) : t('accounts.limitsUi.allModels') }}</td>
          <td v-for="f in row.figures" :key="f.key" class="whitespace-nowrap py-1 pr-3 text-right last:pr-0" :class="tone(f)">{{ text(f) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-2 text-xxs leading-4 text-fg-muted">{{ t('accounts.limitsUi.windowHint') }}</p>
  </div>
</template>
