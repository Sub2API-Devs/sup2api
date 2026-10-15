<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SField, SGrid, SHint, SInput, SSelect, SSettingsGroup, STextarea } from '@sub2api/ui'
import { errorMessage } from '@/utils/errors'
import FailureDecisionDetails from './FailureDecisionDetails.vue'
import { normalizedPolicy, policyFormErrors, type FailurePolicyForm, type FailurePreview } from './failurePolicy'

const props = defineProps<{ policy: FailurePolicyForm }>()
const { t } = useI18n()
const facts = reactive({ source: 'upstream', status: 429, text: '', group_id: 0, model: '', protocol: '' })
const result = ref<FailurePreview | null>(null)
const testing = ref(false)
const error = ref('')
let generation = 0
const sourceOptions = computed(() =>
  ['upstream', 'transport', 'core'].map(value => ({ value, label: t(`failurePolicy.sources.${value}`) }))
)
watch(
  () => [props.policy, facts],
  () => {
    generation++
    result.value = null
  },
  { deep: true }
)
async function test() {
  const errors = policyFormErrors(props.policy, t('failurePolicy.numberRequired'), t('failurePolicy.invalidRule'))
  if (Object.keys(errors).length) {
    error.value = Object.values(errors)[0]!
    result.value = null
    return
  }
  testing.value = true
  error.value = ''
  const started = generation
  const payload = JSON.stringify({
    policy: normalizedPolicy(props.policy),
    facts: { ...facts, status: facts.source === 'transport' ? 0 : facts.status }
  })
  try {
    const response = await api.post<FailurePreview>('/settings/failure-policy/preview', JSON.parse(payload))
    if (started === generation) result.value = response
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <SSettingsGroup
    :title="t('failurePolicy.preview')"
    :description="t('failurePolicy.previewHint')"
  >
    <template #actions>
      <SButton
        :loading="testing"
        data-testid="preview-policy"
        @click="test"
      >
        {{ t('failurePolicy.preview') }}
      </SButton>
    </template>
    <div class="space-y-4 py-4">
      <SGrid
        :cols="1"
        :md-cols="3"
      >
        <SField :label="t('failurePolicy.source')">
          <SSelect
            v-model="facts.source"
            :options="sourceOptions"
          />
        </SField>
        <SField :label="t('failurePolicy.status')">
          <SInput
            v-model="facts.status"
            type="number"
            :disabled="facts.source === 'transport'"
          />
        </SField>
        <SField :label="t('failurePolicy.group')">
          <SInput
            v-model="facts.group_id"
            type="number"
          />
        </SField>
        <SField :label="t('failurePolicy.models')">
          <SInput v-model="facts.model" />
        </SField>
        <SField :label="t('failurePolicy.protocols')">
          <SInput v-model="facts.protocol" />
        </SField>
      </SGrid>
      <SField :label="t('failurePolicy.errorText')">
        <STextarea
          v-model="facts.text"
          :rows="3"
        />
      </SField>
      <SAlert
        v-if="error"
        tone="danger"
      >
        {{ error }}
      </SAlert>
      <FailureDecisionDetails
        v-if="result"
        :decision="result.decision"
        :policy="policy"
        data-testid="policy-preview-result"
      />
      <SHint
        v-if="result?.text_truncated"
        tone="warning"
      >
        {{ t('failurePolicy.truncated') }}
      </SHint>
    </div>
  </SSettingsGroup>
</template>
