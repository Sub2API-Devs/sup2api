<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SField, SGrid, SInput, SSelect, SSwitch, STagInput, STextarea } from '@sub2api/ui'
import type { FailureRule } from './failurePolicy'

const rule = defineModel<FailureRule>({ required: true })
defineProps<{ account: boolean }>()
const { t } = useI18n()
const options = (keys: string[], group: string) => keys.map(value => ({ value, label: t(`failurePolicy.${group}.${value}`) }))
const keywords = computed({
  get: () => (rule.value.match.keywords || []).join('\n'),
  set: v => {
    rule.value.match.keywords = v.split('\n')
  }
})
const groups = computed({
  get: () => (rule.value.match.groups || []).join(','),
  set: v => {
    rule.value.match.groups = v.trim() ? v.split(',').map(x => Number(x.trim())) : []
  }
})
watch(
  () => rule.value.match.source,
  source => {
    if (source === 'transport') rule.value.match.status_codes = ''
  }
)
</script>

<template>
  <div
    class="space-y-4"
    data-testid="failure-rule-editor"
  >
    <SGrid
      :cols="1"
      :md-cols="2"
    >
      <SField :label="t('failurePolicy.name')">
        <SInput
          v-model="rule.name"
          :maxlength="100"
        />
      </SField>
      <SField :label="t('common.enabled')">
        <SSwitch
          v-model="rule.enabled"
          :aria-label="t('common.enabled')"
        />
      </SField>
      <SField :label="t('failurePolicy.source')">
        <SSelect
          v-model="rule.match.source"
          :options="options(['upstream', 'transport', 'core'], 'sources')"
        />
      </SField>
      <SField
        :label="t('failurePolicy.codes')"
        :hint="t('failurePolicy.codesHint')"
      >
        <SInput
          v-model="rule.match.status_codes"
          :disabled="rule.match.source === 'transport'"
          placeholder="429,500-599"
        />
      </SField>
      <SField
        :label="t('failurePolicy.keywords')"
        :hint="t('failurePolicy.keywordsHint')"
      >
        <STextarea
          v-model="keywords"
          :rows="3"
          data-testid="rule-keywords"
        />
      </SField>
      <SField :label="t('failurePolicy.matchMode')">
        <SSelect
          v-model="rule.match.mode"
          :options="options(['all', 'any'], 'modes')"
        />
      </SField>
    </SGrid>
    <SGrid
      :cols="1"
      :md-cols="3"
    >
      <SField
        :label="t('failurePolicy.groups')"
        :hint="t('failurePolicy.scopeHint')"
      >
        <SInput
          v-model="groups"
          placeholder="1,2"
        />
      </SField>
      <SField
        :label="t('failurePolicy.models')"
        :hint="t('failurePolicy.modelHint')"
      >
        <STagInput v-model="rule.match.models" />
      </SField>
      <SField
        :label="t('failurePolicy.protocols')"
        :hint="t('failurePolicy.scopeHint')"
      >
        <STagInput v-model="rule.match.protocols" />
      </SField>
    </SGrid>
    <SGrid
      :cols="1"
      :md-cols="2"
    >
      <SField :label="t('failurePolicy.action')">
        <SSelect
          v-model="rule.action"
          :options="
            account
              ? options(['none', 'cooldown', 'disable'], 'actions')
              : [
                { value: 'return', label: t('failurePolicy.actions.return') },
                { value: 'retry', label: t('failurePolicy.sharedRetry') }
              ]
          "
          data-testid="rule-action"
        />
      </SField>
      <SField
        v-if="account && rule.action === 'cooldown'"
        :label="t('failurePolicy.cooldown')"
      >
        <SInput
          v-model="rule.cooldown_seconds"
          type="number"
          :min="1"
          :max="86400"
        />
      </SField>
    </SGrid>
  </div>
</template>
