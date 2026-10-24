<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SDescItem, SDescriptions } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import type { FailureDecision, FailurePolicyForm } from './failurePolicy'

const props = defineProps<{ decision: FailureDecision; policy?: FailurePolicyForm }>()
const { t } = useI18n()
const tr = useOptionalT()
const label = (group: string, value?: string) => (value ? tr(`failurePolicy.${group}.${value}`, undefined, value) : '—')
function ruleName(id?: string) {
  if (!id) return t('failurePolicy.noMatch')
  return [...(props.policy?.retry_rules || []), ...(props.policy?.account_rules || [])].find(r => r.id === id)?.name || id
}
</script>

<template>
  <SDescriptions dense>
    <SDescItem
      v-if="decision.attempt"
      :label="t('failurePolicy.attempt')"
    >
      {{ decision.attempt }}
    </SDescItem>
    <SDescItem
      v-if="decision.account_id"
      :label="t('common.account')"
    >
      #{{ decision.account_id }}
    </SDescItem>
    <SDescItem
      v-if="decision.status"
      :label="t('failurePolicy.status')"
    >
      {{ decision.status }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.retry_rules')">
      {{ ruleName(decision.retry_rule) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.action')">
      {{ policy && policy.schema_version >= 2 && decision.action === 'retry' ? t('failurePolicy.sharedRetry') : label('actions', decision.action) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.account_rules')">
      {{ ruleName(decision.account_rule) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.accountAction')">
      {{ label('actions', decision.account_action) }}
    </SDescItem>
    <SDescItem
      v-if="decision.egress && (!policy || policy.schema_version < 3)"
      :label="t('failurePolicy.egress')"
    >
      {{ label('egresses', decision.egress) }}
    </SDescItem>
    <SDescItem
      v-if="decision.reason"
      :label="t('failurePolicy.reason')"
    >
      {{ label('reasons', decision.reason) }}
    </SDescItem>
    <SDescItem
      v-if="decision.account_result"
      :label="t('failurePolicy.accountResult')"
    >
      {{ label('results', decision.account_result) }}
    </SDescItem>
  </SDescriptions>
</template>
