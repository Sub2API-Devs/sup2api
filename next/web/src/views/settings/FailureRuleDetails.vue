<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SDescriptions, SDescItem } from '@sub2api/ui'
import type { FailureRule } from './failurePolicy'
defineProps<{ rule: FailureRule }>()
const { t } = useI18n()
const list = (values: unknown[] | undefined) => (values?.length ? values.join(', ') : t('common.all'))
</script>
<template>
  <SDescriptions
    dense
    data-testid="failure-rule-details"
  >
    <SDescItem :label="t('failurePolicy.groups')">
      {{ list(rule.match.groups) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.models')">
      {{ list(rule.match.models) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.protocols')">
      {{ list(rule.match.protocols) }}
    </SDescItem>
  </SDescriptions>
</template>
