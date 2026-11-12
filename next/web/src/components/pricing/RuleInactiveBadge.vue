<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'

// The mark of a price rule the server skips (ListedPriceRule.inactive): a
// custom price in another mode than the global price has now. Wherever a
// rule is shown as configured, the model price table and the price quote,
// it says so the same way.
const { t } = useI18n()
</script>

<template>
  <SBadge tone="warning" size="xs" :title="t('pricing.rule.inactiveHint')">{{ t('pricing.rule.inactive') }}</SBadge>
</template>
