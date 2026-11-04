<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SDisclosure, SField, SHint, SInput, SSelect, SSwitch, STable, STextarea, createItemId, type SelectOption, type TableColumn } from '@sub2api/ui'
import FailureRuleDetails from './FailureRuleDetails.vue'
import { newFailureRule, readableStatusCodes, ruleFormErrors, ruleSummaryKey, type FailureMatch, type FailureRule } from './failurePolicy'

const rules = defineModel<FailureRule[]>({ required: true })
const props = defineProps<{ account: boolean; disabled: boolean; showErrors?: boolean; regexErrors?: Record<string, string> }>()
const { t } = useI18n()
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('failurePolicy.nameAndSource'), width: '200px' },
  { key: 'codes', label: t('failurePolicy.codesShort'), width: '180px' },
  { key: 'keywords', label: t('failurePolicy.keywordsShort'), class: 'min-w-64' },
  { key: 'regex', label: t('failurePolicy.regexLabel'), width: '96px' },
  ...(props.account ? [] : [{ key: 'same', label: t('failurePolicy.sameAccountRetry'), width: '112px' }]),
  ...(props.disabled ? [] : [{ key: 'actions', label: t('common.actions'), width: '130px' }])
])
const errors = computed(() => new Map(rules.value.map(rule => [rule.id, props.showErrors ? ruleFormErrors(rule, t('failurePolicy.invalidRule')) : {}])))

function add(rule?: FailureRule) {
  if (props.disabled || rules.value.length >= 100) return
  const added = rule
    ? { ...JSON.parse(JSON.stringify(rule)), id: createItemId(), name: t('failurePolicy.copyName', { name: rule.name }) }
    : newFailureRule(t('failurePolicy.newRule'), props.account)
  rules.value = [...rules.value, added]
}
function remove(rule: FailureRule) {
  if (!props.disabled) rules.value = rules.value.filter(r => r.id !== rule.id)
}
function reorder(rows: FailureRule[]) {
  if (!props.disabled) rules.value = rows
}
function setKeywords(rule: FailureRule, value: string) {
  if (!props.disabled) rule.match.keywords = value.split(/\r?\n/)
}
function hasScope(rule: FailureRule) {
  return rule.match.groups.length || rule.match.models.length || rule.match.protocols.length
}
function sourceOptions(rule: FailureRule): SelectOption[] {
  // Core errors are only shown for rules that already use them.
  const sources: FailureMatch['source'][] = rule.match.source === 'core' ? ['upstream', 'transport', 'core'] : ['upstream', 'transport']
  return sources.map(value => ({ value, label: t(`failurePolicy.sources.${value}`) }))
}
function setSource(rule: FailureRule, value: unknown) {
  if (props.disabled) return
  rule.match.source = value as FailureMatch['source']
  // Transport failures have no HTTP status.
  if (rule.match.source === 'transport') rule.match.status_codes = ''
}
function summary(rule: FailureRule) {
  return t(`failurePolicy.summary.${ruleSummaryKey(rule)}`, { codes: readableStatusCodes(rule.match.status_codes, t('failurePolicy.codeSeparator')) })
}
</script>
<template>
  <section :data-testid="account ? 'account-rules' : 'retry-rules'">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-fg">
          {{ t(account ? 'failurePolicy.disableConditions' : 'failurePolicy.retryConditions') }}
        </p>
        <SHint>{{ t(account ? 'failurePolicy.disableConditionsHint' : 'failurePolicy.retryConditionsHint') }} {{ t('failurePolicy.orderHint') }}</SHint>
      </div>
      <SButton
        v-if="!disabled"
        icon="plus"
        size="sm"
        :disabled="rules.length >= 100"
        data-testid="add-rule"
        @click="add()"
      >
        {{ t('failurePolicy.add') }}
      </SButton>
    </div>
    <STable
      :columns="columns"
      :rows="rules"
      :reorderable="!disabled"
      :reorder-disabled="disabled"
      :empty-text="t('failurePolicy.empty')"
      @update:rows="reorder"
    >
      <template #cell-name="{ row }">
        <SField :error="errors.get(row.id)?.name">
          <SInput
            v-model="row.name"
            :disabled="disabled"
            :maxlength="100"
            :aria-label="t('failurePolicy.name')"
            data-testid="rule-name"
          />
        </SField>
        <SSelect
          :model-value="row.match.source"
          :options="sourceOptions(row)"
          :disabled="disabled"
          :aria-label="t('failurePolicy.source')"
          class="mt-2"
          data-testid="rule-source"
          @update:model-value="setSource(row, $event)"
        />
        <SDisclosure
          v-if="hasScope(row)"
          :label="t('failurePolicy.scopeDetails')"
        >
          <FailureRuleDetails :rule="row" />
        </SDisclosure>
      </template>
      <template #cell-codes="{ row }">
        <SField :error="errors.get(row.id)?.status_codes">
          <SInput
            v-model="row.match.status_codes"
            :disabled="disabled || row.match.source === 'transport'"
            :aria-label="t('failurePolicy.codes')"
            data-testid="rule-codes"
          />
        </SField>
      </template>
      <template #cell-keywords="{ row }">
        <SField
          :error="regexErrors?.[`${account ? 'account_rules' : 'retry_rules'}:${row.id}`] || errors.get(row.id)?.conditions"
          :hint="row.match.keyword_regex ? t('failurePolicy.regexHint') : undefined"
        >
          <STextarea
            :model-value="row.match.keywords.join('\n')"
            :disabled="disabled"
            :rows="3"
            :aria-label="t(row.match.keyword_regex ? 'failurePolicy.regexPlaceholder' : 'failurePolicy.keywords')"
            data-testid="rule-keywords"
            @update:model-value="setKeywords(row, $event)"
          />
        </SField>
        <SHint
          size="xs"
          class="mt-2"
          data-testid="rule-summary"
        >
          {{ summary(row) }}
        </SHint>
      </template>
      <template #cell-regex="{ row }">
        <SSwitch
          :model-value="!!row.match.keyword_regex"
          :disabled="disabled"
          :aria-label="t('failurePolicy.regexLabel')"
          data-testid="rule-regex"
          @update:model-value="row.match.keyword_regex = $event"
        />
      </template>
      <template #cell-same="{ row }">
        <SSwitch
          :model-value="!row.no_same_account_retry"
          :disabled="disabled"
          :aria-label="t('failurePolicy.sameAccountRetry')"
          data-testid="rule-same-account"
          @update:model-value="row.no_same_account_retry = !$event"
        />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1">
          <SButton
            variant="ghost"
            size="sm"
            :disabled="rules.length >= 100"
            data-testid="copy-rule"
            @click.stop="add(row)"
          >
            {{ t('common.copy') }}
          </SButton>
          <SButton
            variant="ghost"
            size="sm"
            tone="danger"
            data-testid="remove-rule"
            @click.stop="remove(row)"
          >
            {{ t('common.delete') }}
          </SButton>
        </div>
      </template>
    </STable>
  </section>
</template>
