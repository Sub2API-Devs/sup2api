<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SButton, SDisclosure, SHint, SSectionTitle, STable, createItemId, type TableColumn } from '@sub2api/ui'
import FailureRuleModal from './FailureRuleModal.vue'
import FailureRuleDetails from './FailureRuleDetails.vue'
import type { FailureRule } from './failurePolicy'
const rules = defineModel<FailureRule[]>({ required: true })
const props = defineProps<{ account: boolean; disabled: boolean }>()
const { t } = useI18n()
const open = ref(false)
const editing = ref<FailureRule | null>(null)
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('failurePolicy.name'), width: '170px' },
  { key: 'codes', label: t('failurePolicy.codesShort'), width: '150px' },
  { key: 'keywords', label: t('failurePolicy.keywordsShort'), class: 'max-w-sm break-words' },
  ...(props.disabled ? [] : [{ key: 'actions', label: t('common.actions'), width: '190px' }])
])
function edit(rule: FailureRule | null, copy = false) {
  if (props.disabled) return
  editing.value =
    copy && rule
      ? { ...JSON.parse(JSON.stringify(rule)), id: createItemId(), name: t('failurePolicy.copyName', { name: rule.name }) }
      : rule
  open.value = true
}
function remove(rule: FailureRule) {
  if (!props.disabled) rules.value = rules.value.filter(r => r.id !== rule.id)
}
function reorder(rows: FailureRule[]) {
  if (!props.disabled) rules.value = rows
}
function save(rule: FailureRule) {
  if (props.disabled) return
  const exists = rules.value.some(r => r.id === rule.id)
  rules.value = exists ? rules.value.map(r => (r.id === rule.id ? rule : r)) : [...rules.value, rule]
}
const keywords = (rule: FailureRule) => (rule.match.keywords || []).filter(k => k.trim())
</script>
<template>
  <section :data-testid="account ? 'account-rules' : 'retry-rules'">
    <SSectionTitle :title="t(account ? 'failurePolicy.account_rules' : 'failurePolicy.retry_rules')">
      <template #actions>
        <SButton
          v-if="!disabled"
          icon="plus"
          size="sm"
          :disabled="rules.length >= 100"
          data-testid="add-rule"
          @click="edit(null)"
        >
          {{
            t('failurePolicy.add')
          }}
        </SButton>
      </template>
    </SSectionTitle>
    <SHint class="mb-3">
      {{ t('failurePolicy.orderHint') }}
    </SHint>
    <STable
      :columns="columns"
      :rows="rules"
      :reorderable="!disabled"
      :reorder-disabled="disabled"
      :empty-text="t('failurePolicy.empty')"
      @update:rows="reorder"
    >
      <template #cell-name="{ row }">
        <div>{{ row.name }}</div>
        <SHint size="xs">
          {{ t(`failurePolicy.sources.${row.match.source}`) }}
        </SHint>
        <SDisclosure :label="t('failurePolicy.scopeDetails')">
          <FailureRuleDetails :rule="row" />
        </SDisclosure>
      </template>
      <template #cell-codes="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge
            v-for="code in row.match.status_codes.split(',').filter(Boolean)"
            :key="code"
            tone="gray"
            size="xs"
          >
            {{ code }}
          </SBadge><SHint v-if="!row.match.status_codes">
            —
          </SHint>
        </div>
      </template>
      <template #cell-keywords="{ row }">
        <div
          v-for="(keyword, index) in keywords(row).slice(0, 2)"
          :key="index"
          class="break-words"
        >
          {{ keyword }}
        </div>
        <SHint v-if="!keywords(row).length">
          —
        </SHint>
        <SDisclosure
          v-if="keywords(row).length > 2"
          :label="t('failurePolicy.moreKeywords', { count: keywords(row).length - 2 })"
        >
          <div
            v-for="(keyword, index) in keywords(row).slice(2)"
            :key="index"
            class="break-words"
          >
            {{ keyword }}
          </div>
        </SDisclosure>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1">
          <SButton
            variant="ghost"
            size="sm"
            data-testid="edit-rule"
            @click.stop="edit(row)"
          >
            {{ t('common.edit') }}
          </SButton>
          <SButton
            variant="ghost"
            size="sm"
            :disabled="rules.length >= 100"
            data-testid="copy-rule"
            @click.stop="edit(row, true)"
          >
            {{
              t('common.copy')
            }}
          </SButton>
          <SButton
            variant="ghost"
            size="sm"
            tone="danger"
            data-testid="remove-rule"
            @click.stop="remove(row)"
          >
            {{
              t('common.delete')
            }}
          </SButton>
        </div>
      </template>
    </STable>
    <FailureRuleModal
      v-model:open="open"
      :rule="editing"
      :account="account"
      :disabled="disabled"
      @save="save"
    />
  </section>
</template>
