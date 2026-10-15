<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SDropdown, SHint, SSectionTitle, SSwitch, STable, type MenuAction, type TableColumn } from '@sub2api/ui'
import FailureRuleModal from './FailureRuleModal.vue'
import FailureRuleDetails from './FailureRuleDetails.vue'
import type { FailureRule } from './failurePolicy'

const rules = defineModel<FailureRule[]>({ required: true })
const props = defineProps<{ account: boolean; disabled: boolean }>()
const { t } = useI18n()
const open = ref(false)
const editing = ref<FailureRule | null>(null)
const dragging = ref<string | null>(null)
const columns = computed<TableColumn[]>(() => [
  { key: 'order', label: t('failurePolicy.order'), width: '70px' },
  { key: 'name', label: t('failurePolicy.name') },
  { key: 'enabled', label: t('common.enabled'), width: '80px' },
  { key: 'match', label: t('failurePolicy.conditions') },
  { key: 'action', label: t('failurePolicy.action') },
  { key: 'actions', label: '', width: '60px' }
])
const indexOf = (rule: FailureRule) => rules.value.findIndex(r => r.id === rule.id)
function move(from: number, to: number) {
  if (props.disabled || from < 0 || to < 0 || to >= rules.value.length || from === to) return
  const next = [...rules.value]
  const [rule] = next.splice(from, 1)
  if (rule) next.splice(to, 0, rule)
  rules.value = next
}
function rowAttrs(rule: FailureRule) {
  return {
    draggable: !props.disabled,
    onDragstart: () => {
      dragging.value = rule.id
    },
    onDragend: () => {
      dragging.value = null
    },
    onDragover: (event: DragEvent) => {
      if (dragging.value) event.preventDefault()
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      move(
        rules.value.findIndex(r => r.id === dragging.value),
        indexOf(rule)
      )
      dragging.value = null
    }
  }
}
function actions(rule: FailureRule): MenuAction[] {
  return [
    { key: 'edit', label: t('common.edit') },
    { key: 'copy', label: t('common.copy'), disabled: rules.value.length >= 100 },
    { key: 'up', label: t('failurePolicy.up'), disabled: indexOf(rule) === 0 },
    { key: 'down', label: t('failurePolicy.down'), disabled: indexOf(rule) === rules.value.length - 1 },
    { key: 'remove', label: t('common.delete'), danger: true }
  ]
}
function select(rule: FailureRule, action: string) {
  if (props.disabled) return
  if (action === 'up' || action === 'down') return move(indexOf(rule), indexOf(rule) + (action === 'up' ? -1 : 1))
  if (action === 'remove') {
    rules.value = rules.value.filter(r => r.id !== rule.id)
    return
  }
  editing.value = action === 'copy' ? { ...rule, id: crypto.randomUUID(), name: t('failurePolicy.copyName', { name: rule.name }) } : rule
  open.value = true
}
function add() {
  editing.value = null
  open.value = true
}
function save(rule: FailureRule) {
  if (props.disabled) return
  const exists = rules.value.some(r => r.id === rule.id)
  rules.value = exists ? rules.value.map(r => (r.id === rule.id ? rule : r)) : [...rules.value, rule]
}
function condition(rule: FailureRule) {
  const keywords = (rule.match.keywords || []).filter(k => k.trim()).join(', ')
  const parts = [rule.match.status_codes, keywords].filter(Boolean)
  return (
    parts.join(rule.match.mode === 'all' ? ' AND ' : ' OR ') ||
    t(rule.match.source === 'transport' ? 'failurePolicy.anyTransport' : 'failurePolicy.incomplete')
  )
}
</script>

<template>
  <section :data-testid="account ? 'account-rules' : 'retry-rules'">
    <SSectionTitle :title="t(account ? 'failurePolicy.account_rules' : 'failurePolicy.retry_rules')">
      <template #actions>
        <SButton
          v-if="!disabled"
          icon="plus"
          :disabled="rules.length >= 100"
          @click="add"
        >
          {{ t('failurePolicy.add') }}
        </SButton>
      </template>
    </SSectionTitle>
    <SHint class="mb-3">
      {{ t('failurePolicy.orderHint') }}
    </SHint>
    <STable
      card
      expandable
      :columns="columns"
      :rows="rules"
      :row-attrs="rowAttrs"
      :empty-text="t('failurePolicy.empty')"
    >
      <template #expand="{ row }">
        <FailureRuleDetails
          :rule="row"
          :account="account"
        />
      </template>
      <template #cell-order="{ row }">
        {{ indexOf(row) + 1 }}
      </template>
      <template #cell-enabled="{ row }">
        <SSwitch
          v-model="row.enabled"
          :disabled="disabled"
          :aria-label="t('common.enabled') + ' · ' + row.name"
        />
      </template>
      <template #cell-match="{ row }">
        <div>{{ condition(row) }}</div>
        <SHint size="xs">
          {{ t(`failurePolicy.sources.${row.match.source}`) }}
        </SHint>
      </template>
      <template #cell-action="{ row }">
        <div>{{ t(`failurePolicy.actions.${row.action}`) }}</div>
        <SHint
          v-if="!account && row.action !== 'return'"
          size="xs"
        >
          {{ t(`failurePolicy.egresses.${row.egress}`) }}
        </SHint>
      </template>
      <template #cell-actions="{ row }">
        <SDropdown
          v-if="!disabled"
          :actions="actions(row)"
          @select="select(row, $event)"
        />
      </template>
    </STable>
    <FailureRuleModal
      v-model:open="open"
      :rule="editing"
      :account="account"
      @save="save"
    />
  </section>
</template>
