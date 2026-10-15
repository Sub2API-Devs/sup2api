<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SModal } from '@sub2api/ui'
import FailureRuleEditor from './FailureRuleEditor.vue'
import { newFailureRule, normalizeStatusCodes, ruleFormErrors, type FailureRule } from './failurePolicy'
const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ rule: FailureRule | null; account: boolean; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ save: [rule: FailureRule] }>()
const { t } = useI18n()
const draft = ref(newFailureRule('', props.account))
const errors = ref<Record<string, string>>({})
watch(
  [open, () => props.rule],
  ([value]) => {
    if (!value) return
    draft.value = props.rule ? JSON.parse(JSON.stringify(props.rule)) : newFailureRule(t('failurePolicy.newRule'), props.account)
    errors.value = {}
  },
  { immediate: true }
)
watch(
  () => props.disabled,
  disabled => {
    if (disabled) open.value = false
  }
)
function save() {
  if (props.disabled) return
  errors.value = ruleFormErrors(draft.value, t('failurePolicy.invalidRule'))
  if (Object.keys(errors.value).length) return
  const rule: FailureRule = JSON.parse(JSON.stringify(draft.value))
  rule.name = rule.name.trim()
  rule.enabled = true
  rule.action = props.account ? 'disable' : 'retry'
  rule.match.status_codes = normalizeStatusCodes(rule.match.status_codes)
  rule.match.keywords = [...new Set(rule.match.keywords.map(k => k.trim()).filter(Boolean))]
  emit('save', rule)
  open.value = false
}
</script>
<template>
  <SModal
    v-model:open="open"
    :title="t(rule ? 'common.edit' : 'failurePolicy.add')"
    width="lg"
  >
    <FailureRuleEditor
      v-model="draft"
      :account="account"
      :errors="errors"
    />
    <template #footer>
      <SButton @click="open = false">
        {{ t('common.cancel') }}
      </SButton>
      <SButton
        variant="primary"
        :disabled="disabled"
        data-testid="apply-rule"
        @click="save"
      >
        {{ t('common.confirm') }}
      </SButton>
    </template>
  </SModal>
</template>
