<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SDisclosure, SField, SGrid, SInput, SSelect, STagInput, STextarea } from '@sub2api/ui'
import type { FailureRule } from './failurePolicy'
const rule = defineModel<FailureRule>({ required: true })
withDefaults(defineProps<{ account: boolean; errors?: Record<string, string> }>(), { errors: () => ({}) })
const { t } = useI18n()
const options = (keys: string[], group: string) => keys.map(value => ({ value, label: t(`failurePolicy.${group}.${value}`) }))
const keywords = computed({
  get: () => (rule.value.match.keywords || []).join('\n'),
  set: (v: string) => {
    rule.value.match.keywords = v.split(/\r?\n/)
  }
})
const bothConditions = computed(() => !!rule.value.match.status_codes.trim() && rule.value.match.keywords.some(k => k.trim()))
const groups = computed({
  get: () => (rule.value.match.groups || []).join(','),
  set: (v: string) => {
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
    <SField
      :label="t('failurePolicy.name')"
      :error="errors.name"
    >
      <SInput
        v-model="rule.name"
        :maxlength="100"
        data-testid="rule-name"
      />
    </SField>
    <SField
      :label="t('failurePolicy.codes')"
      :hint="t('failurePolicy.codesHint')"
      :error="errors.status_codes"
    >
      <SInput
        v-model="rule.match.status_codes"
        :disabled="rule.match.source === 'transport'"
        placeholder="401,403,429,500-599"
        data-testid="rule-codes"
      />
    </SField>
    <SField
      :label="t('failurePolicy.keywords')"
      :hint="t('failurePolicy.keywordsHint')"
    >
      <STextarea
        v-model="keywords"
        :rows="6"
        data-testid="rule-keywords"
      />
    </SField>
    <SAlert
      v-if="errors.conditions"
      tone="danger"
    >
      {{ errors.conditions }}
    </SAlert>
    <SField
      v-if="bothConditions"
      :label="t('failurePolicy.matchMode')"
    >
      <SSelect
        v-model="rule.match.mode"
        :options="options(['all', 'any'], 'modes')"
      />
    </SField>
    <SDisclosure :label="t('failurePolicy.advancedScope')">
      <SGrid
        :cols="1"
        :md-cols="2"
        class="pt-3"
      >
        <SField :label="t('failurePolicy.source')">
          <SSelect
            v-model="rule.match.source"
            :options="options(['upstream', 'transport', 'core'], 'sources')"
            data-testid="rule-source"
          />
        </SField>
        <SField
          :label="t('failurePolicy.groups')"
          :hint="t('failurePolicy.scopeHint')"
          :error="errors.groups"
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
    </SDisclosure>
  </div>
</template>
