<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SDisclosure, SSectionTitle, SSettingsGroup, SSpinner, SSwitch } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import FailurePolicyControls from './FailurePolicyControls.vue'
import FailureRulesTable from './FailureRulesTable.vue'
import FailurePolicyPreview from './FailurePolicyPreview.vue'
import { useFailurePolicy } from './useFailurePolicy'
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))
const { policy, configured, migrationNeeded, migrationMessage, loading, saving, error, errors, regexErrors, dirty, isLoaded, load, save } = useFailurePolicy()
const disabled = computed(() => !canManage.value || saving.value)
const ruleErrors = computed(() =>
  Object.entries(errors.value)
    .filter(([key]) => /^(retry_rules|account_rules)/.test(key))
    .map(([, message]) => message)
)
onMounted(load)
</script>
<template>
  <div
    class="space-y-5"
    data-testid="failure-policy-settings"
  >
    <SSpinner
      v-if="loading"
      block
    />
    <SAlert
      v-if="error"
      tone="danger"
    >
      {{ error
      }}<template #actions>
        <SButton
          :disabled="saving"
          @click="load"
        >
          {{ t('failurePolicy.reload') }}
        </SButton>
      </template>
    </SAlert>
    <template v-if="isLoaded && !loading">
      <SAlert
        v-if="!configured"
        tone="info"
      >
        {{ t('failurePolicy.migration') }}
      </SAlert>
      <SAlert
        v-if="migrationNeeded"
        tone="warning"
      >
        {{ t(migrationMessage) }}
      </SAlert>
      <SSectionTitle :title="t('failurePolicy.title')">
        <template #actions>
          <SButton
            v-if="canManage"
            variant="primary"
            size="sm"
            :loading="saving"
            :disabled="!dirty && configured && !migrationNeeded"
            data-testid="settings-save"
            @click="save"
          >
            {{ t('common.save') }}
          </SButton>
        </template>
      </SSectionTitle>
      <SAlert
        v-if="ruleErrors.length"
        tone="danger"
      >
        <div
          v-for="(message, index) in ruleErrors"
          :key="index"
        >
          {{ message }}
        </div>
      </SAlert>
      <SSettingsGroup
        :title="t('failurePolicy.retryEnabled')"
        :description="t('failurePolicy.retrySectionHint')"
        data-testid="retry-settings"
      >
        <template #actions>
          <SSwitch
            v-model="policy.retry_enabled"
            :disabled="disabled"
            :aria-label="t('failurePolicy.retryEnabled')"
          />
        </template>
        <FailurePolicyControls
          v-model="policy"
          :disabled="disabled"
          :errors="errors"
        />
        <div class="py-4">
          <FailureRulesTable
            v-model="policy.retry_rules"
            :regex-errors="regexErrors"
            :show-errors="Object.keys(errors).length > 0"
            :account="false"
            :disabled="disabled"
          />
        </div>
      </SSettingsGroup>
      <SSettingsGroup
        :title="t('failurePolicy.disableSection')"
        :description="t('failurePolicy.accountHint')"
        data-testid="disable-settings"
      >
        <template #actions>
          <SSwitch
            v-model="policy.account_enabled"
            :disabled="disabled"
            :aria-label="t('failurePolicy.accountEnabled')"
          />
        </template>
        <div class="py-4">
          <FailureRulesTable
            v-model="policy.account_rules"
            :regex-errors="regexErrors"
            :show-errors="Object.keys(errors).length > 0"
            :account="true"
            :disabled="disabled"
          />
        </div>
      </SSettingsGroup>
      <SDisclosure :label="t('failurePolicy.preview')">
        <FailurePolicyPreview :policy="policy" />
      </SDisclosure>
    </template>
  </div>
</template>
