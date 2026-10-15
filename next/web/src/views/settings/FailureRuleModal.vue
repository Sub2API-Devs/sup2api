<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SModal } from '@sub2api/ui'
import FailureRuleEditor from './FailureRuleEditor.vue'
import { newFailureRule, type FailureRule } from './failurePolicy'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ rule: FailureRule | null; account: boolean }>()
const emit = defineEmits<{ save: [rule: FailureRule] }>()
const { t } = useI18n()
const draft = ref(newFailureRule('', false))

watch(open, value => {
  if (value) draft.value = props.rule ? JSON.parse(JSON.stringify(props.rule)) : newFailureRule(t('failurePolicy.newRule'), props.account)
})

function save() {
  emit('save', draft.value)
  open.value = false
}
</script>

<template>
  <SModal
    v-model:open="open"
    :title="t(rule ? 'common.edit' : 'failurePolicy.add')"
    width="xl"
  >
    <FailureRuleEditor
      v-model="draft"
      :account="account"
    />
    <template #footer>
      <SButton @click="open = false">
        {{ t('common.cancel') }}
      </SButton>
      <SButton
        variant="primary"
        :disabled="!draft.name.trim()"
        @click="save"
      >
        {{ t('failurePolicy.applyDraft') }}
      </SButton>
    </template>
  </SModal>
</template>
