<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import type { UsageTokenFacts } from './usage'

defineProps<{ tokens: UsageTokenFacts }>()
const { t } = useI18n()
const fields = { input_tokens: 'p', output_tokens: 'c', cache_read_tokens: 'cr', cache_creation_tokens: 'cc', cache_creation_1h_tokens: 'cc1h' } as const
</script>

<template>
  <dl class="kv">
    <template
      v-for="(label, field) in fields"
      :key="field"
    >
      <dt>{{ label === 'cc' ? t('usage.tokens.cacheDefaultBucket') : label === 'cc1h' ? t('usage.tokens.cache1hBucket') : t(`prices.vars.${label}`) }}</dt>
      <dd>{{ tokens[field] == null ? '—' : formatNumber(tokens[field]!) }}</dd>
    </template>
  </dl>
</template>
