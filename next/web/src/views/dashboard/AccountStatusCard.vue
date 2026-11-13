<script setup lang="ts">
// Accounts by status on a dashboard: available / total, with the
// automatically and manually disabled ones; red when none of several is
// available, amber when some were disabled automatically.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SStatCard } from '@sub2api/ui'
import type { AccountCounts } from '@/api/types'
import { ACCOUNT_ACTIONS } from '@/composables/useScope'
import { useAuthStore } from '@/stores/auth'
import { formatNumber } from '@/utils/format'

const props = defineProps<{ counts: AccountCounts | null | undefined; loading?: boolean }>()
const { t } = useI18n()
const auth = useAuthStore()
const tone = computed<'primary' | 'warning' | 'danger'>(() => {
  const a = props.counts
  if (!a) return 'primary'
  return a.available === 0 && a.total ? 'danger' : a.auto_disabled ? 'warning' : 'primary'
})
</script>

<template>
  <SStatCard
    :label="t('stats.admin.accounts')"
    :value="counts ? `${formatNumber(counts.available)}/${formatNumber(counts.total)}` : '—'"
    :sub="counts ? t('stats.admin.accountsSub', { auto: formatNumber(counts.auto_disabled), disabled: formatNumber(counts.disabled) }) : undefined"
    icon="account"
    :tone="tone"
    :to="auth.hasAction(ACCOUNT_ACTIONS.read) ? '/accounts' : undefined"
    :loading="loading"
    data-testid="card-accounts"
  />
</template>
