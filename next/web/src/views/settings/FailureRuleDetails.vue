<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SDescriptions, SDescItem } from '@sub2api/ui'
import type { FailureRule } from './failurePolicy'
defineProps<{ rule: FailureRule; account: boolean }>()
const { t } = useI18n()
const list = (values: unknown[] | undefined) => (values?.length ? values.join(', ') : t('common.all'))
</script>

<template>
  <SDescriptions
    dense
    data-testid="failure-rule-details"
  >
    <SDescItem :label="t('failurePolicy.source')">
      {{ t(`failurePolicy.sources.${rule.match.source}`) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.codes')">
      {{ rule.match.status_codes || t('failurePolicy.noCodes') }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.keywords')">
      {{ list(rule.match.keywords) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.matchMode')">
      {{ t(`failurePolicy.modes.${rule.match.mode}`) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.groups')">
      {{ list(rule.match.groups) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.models')">
      {{ list(rule.match.models) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.protocols')">
      {{ list(rule.match.protocols) }}
    </SDescItem>
    <SDescItem :label="t('failurePolicy.action')">
      {{ t(`failurePolicy.actions.${rule.action}`) }}
    </SDescItem>
    <SDescItem
      v-if="!account && rule.action !== 'return'"
      :label="t('failurePolicy.egress')"
    >
      {{
        t(`failurePolicy.egresses.${rule.egress}`)
      }}
    </SDescItem>
    <SDescItem
      v-if="rule.action === 'retry'"
      :label="t('failurePolicy.sameRetries')"
    >
      {{ rule.same_account_retries }}
    </SDescItem>
    <SDescItem
      v-if="rule.action === 'retry'"
      :label="t('failurePolicy.exhausted')"
    >
      {{
        t(`failurePolicy.actions.${rule.exhausted_action}`)
      }}
    </SDescItem>
    <SDescItem
      v-if="rule.action === 'cooldown'"
      :label="t('failurePolicy.cooldown')"
    >
      {{ rule.cooldown_seconds }}
    </SDescItem>
  </SDescriptions>
</template>
