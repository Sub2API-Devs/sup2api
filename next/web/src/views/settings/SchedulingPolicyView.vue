<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { STabs } from '@sub2api/ui'
import FailurePolicySettings from './FailurePolicySettings.vue'
import LoadBalanceSettingsCard from './LoadBalanceSettingsCard.vue'

// The scheduling policy page: failure policy and load balancing as two tabs,
// the selected one kept in ?sub= (failure by default, so older links still work).
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const tabs = computed(() => (['failure', 'balance'] as const).map(key => ({ key, label: t(`settings.scheduling.tabs.${key}`) })))
const sub = computed({
  get: () => (route.query.sub === 'balance' ? 'balance' : 'failure'),
  // The default tab keeps the URL as it was before the tabs existed.
  set: (value: string) => void router.replace({ query: { ...route.query, sub: value === 'failure' ? undefined : value } })
})
</script>

<template>
  <STabs v-model="sub" :tabs="tabs" :aria-label="t('failurePolicy.title')" data-testid="scheduling-tabs">
    <FailurePolicySettings v-if="sub === 'failure'" />
    <LoadBalanceSettingsCard v-else />
  </STabs>
</template>
