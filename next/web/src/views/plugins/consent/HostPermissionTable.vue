<script setup lang="ts">
// Host permissions of the consent page: one row per host permission with its
// risk, diff tag, description and the grant checkbox (low risk is always
// granted; a permission the caller may not grant stays disabled).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SCheckbox, SEmpty, SHint, SIcon } from '@sub2api/ui'
import { lt } from '@/i18n'
import { useOptionalT } from '@/composables/optionalText'
import { hpKey, type Risk } from '../pluginUtil'
import RiskDot from '../parts/RiskDot.vue'
import ScopeChips from '../parts/ScopeChips.vue'
import type { HPRow } from './hostPermission'

const props = defineProps<{
  rows: HPRow[]
  checked: Record<string, boolean>
  /** Highlight the required permissions still unticked after a refused submit. */
  showMissing: boolean
}>()
const emit = defineEmits<{ (e: 'toggle', row: HPRow, on: boolean): void }>()
const { t } = useI18n()
const tr = useOptionalT()

function hpLabel(id: string): string {
  return tr(`plugins.hp.${hpKey(id)}`, undefined, id)
}
const riskTone = (risk: Risk) => (risk === 'critical' ? 'danger' : risk === 'high' || risk === 'medium' ? 'warning' : 'success')
const warnOf = (id: string) => (tr(`plugins.hpWarn.${hpKey(id)}`, undefined, t('plugins.consent.criticalWarn')))
const descOf = (id: string) => tr(`plugins.hpDesc.${hpKey(id)}`, undefined, '')
const rows = computed(() => props.rows)
</script>

<template>
  <SCard :title="t('plugins.consent.hostPermissions')" :subtitle="t('plugins.consent.hostPermissionsHint')" class="mt-4">
    <SEmpty v-if="rows.length === 0" :text="t('plugins.consent.noHostPermissions')" />
    <ul v-else class="divide-y divide-gray-100 dark:divide-dark-700">
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex items-start gap-3 py-3"
        :class="[
          !row.allowed ? 'opacity-60' : '',
          showMissing && !row.optional && !checked[row.id] ? '-mx-2 rounded-lg bg-red-50 px-2 dark:bg-red-950/30' : '',
          row.diffTag ? 'border-l-4 border-l-orange-400 pl-2' : ''
        ]"
      >
        <RiskDot :risk="row.risk" class="mt-1" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white">{{ hpLabel(row.id) }}</span>
            <SHint inline size="xs" class="font-mono">{{ row.id }}</SHint>
            <SBadge :tone="riskTone(row.risk)">{{ t(`plugins.risk.${row.risk}`) }}</SBadge>
            <SBadge v-if="row.optional" tone="gray">{{ t('common.optional') }}</SBadge>
            <SBadge v-if="row.diffTag === 'added'" tone="danger">{{ t('plugins.consent.diffAdded') }}</SBadge>
            <SBadge v-if="row.diffTag === 'widened'" tone="warning">{{ t('plugins.consent.diffWidened') }}</SBadge>
          </div>
          <SHint v-if="descOf(row.id)" size="xs" class="mt-0.5" :data-hp-desc="row.id">{{ descOf(row.id) }}</SHint>
          <p v-if="row.reason" class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ lt(row.reason) }}</p>
          <p v-if="row.risk === 'critical'" class="mt-0.5 text-xs text-red-600 dark:text-red-400">{{ warnOf(row.id) }}</p>
          <ScopeChips :scope="row.scope" class="mt-1" />
          <p v-if="!row.allowed" class="mt-1 flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
            <SIcon name="lock" class="h-3.5 w-3.5" />
            {{ t('plugins.consent.needPermission', { perm: row.requiredPerm }) }}
          </p>
        </div>
        <div class="shrink-0 pt-0.5">
          <SHint v-if="row.locked" inline size="xs">{{ t('plugins.consent.auto') }}</SHint>
          <SCheckbox v-else bare class="h-5 w-5" :model-value="!!checked[row.id]" :disabled="!row.allowed" @update:model-value="emit('toggle', row, $event)" />
        </div>
      </li>
    </ul>
  </SCard>
</template>
