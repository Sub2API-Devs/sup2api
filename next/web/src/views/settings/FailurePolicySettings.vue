<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SDisclosure, SHint, SSelect, SSettingsGroup, SSpinner, SStack } from '@sub2api/ui'
import { useAuthStore } from '@/stores/auth'
import SettingsSaveBar from '@/components/SettingsSaveBar.vue'
import FailurePolicyControls from './FailurePolicyControls.vue'
import FailureRulesTable from './FailureRulesTable.vue'
import FailurePolicyPreview from './FailurePolicyPreview.vue'
import { useFailurePolicy } from './useFailurePolicy'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('settings:manage'))
const {
  policy,
  configured,
  migrationNeeded,
  loading,
  saving,
  error,
  errors,
  revision,
  history,
  historyLoading,
  dirty,
  isLoaded,
  load,
  publish,
  reset,
  loadHistory,
  restore
} = useFailurePolicy()
const disabled = computed(() => !canManage.value || saving.value)
const selectedHistory = ref<number | null>(null)
const historyOptions = computed(() =>
  history.value.map(p => ({ value: p.revision, label: t('failurePolicy.version', { version: p.revision }) }))
)
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
      {{ error }}
      <template #actions>
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
        {{ t('failurePolicy.unifiedMigration') }}
      </SAlert>
      <SSettingsGroup
        :title="t('failurePolicy.title')"
        :description="t('failurePolicy.description')"
      >
        <template #actions>
          <SettingsSaveBar
            :dirty="dirty || !configured || migrationNeeded"
            :saving="saving"
            :can-manage="canManage"
            :save-label="t('failurePolicy.publish')"
            @save="publish"
            @reset="reset"
          />
        </template>
        <div class="py-3">
          <SHint>
            {{ t('failurePolicy.version', { version: revision }) }} ·
            {{ t('failurePolicy.budget', { count: policy.retry_enabled ? 1 + Number(policy.max_retries) : 1 }) }}
          </SHint>
        </div>
        <FailurePolicyControls
          v-model="policy"
          :disabled="disabled"
          :errors="errors"
        />
      </SSettingsGroup>
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
      <FailureRulesTable
        v-model="policy.retry_rules"
        :account="false"
        :disabled="disabled"
      />
      <FailureRulesTable
        v-model="policy.account_rules"
        :account="true"
        :disabled="disabled"
      />
      <FailurePolicyPreview :policy="policy" />
      <SDisclosure :label="t('failurePolicy.history')">
        <SStack
          direction="row"
          align="center"
          wrap
        >
          <SButton
            :loading="historyLoading"
            @click="loadHistory"
          >
            {{ t('common.refresh') }}
          </SButton>
          <template v-if="history.length">
            <SSelect
              v-model="selectedHistory"
              :options="historyOptions"
              :aria-label="t('failurePolicy.history')"
            />
            <SButton
              :disabled="disabled || selectedHistory === null"
              @click="restore(selectedHistory)"
            >
              {{ t('failurePolicy.restore') }}
            </SButton>
          </template>
          <SHint v-else>
            {{ t('failurePolicy.noHistory') }}
          </SHint>
        </SStack>
      </SDisclosure>
    </template>
  </div>
</template>
