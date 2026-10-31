<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SButton, SHint, SModal } from '@sub2api/ui'
import { joinList } from './format'
import { useModHost } from './host'
import type { Spec } from './types'
import { auditorIndex, stageRole, type CanvasAuditor } from './flowOps'

// Publish confirmation (new-api flow-publish-dialog.tsx): state, groups,
// timing and where each stage goes.
const props = defineProps<{
  open: boolean
  name: string
  nextVersion: number
  enabled: boolean
  draft: Spec
  groups: string[]
  auditors: CanvasAuditor[]
  loading: boolean
}>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'confirm'): void }>()
const host = useModHost()
const t = host.t

const lookup = computed(() => auditorIndex(props.auditors))

const lines = computed(() =>
  props.draft.stages.map((st, i) => {
    const head = t('flows.pubStage', {
      n: i + 1,
      role: t(`flows.role.${stageRole(i, st, lookup.value.typeOf)}`),
      auditors: st.auditors.map(lookup.value.nameOf).join(' ∥ ')
    })
    const combine = st.auditors.length > 1 ? ` · ${t(`flows.combineOpt.${st.combine || 'any'}`)}${st.combine === 'at_least' ? ` (N = ${st.n ?? 1})` : ''}` : ''
    const out = i === props.draft.stages.length - 1 ? t('flows.pubPassLast') : t('flows.pubPassNext', { n: i + 2 })
    return { head: head + combine, out }
  })
)
</script>

<template>
  <SModal :open="open" :title="t('flows.publishTitle', { name, v: nextVersion })" width="lg" @update:open="emit('update:open', $event)">
    <div class="mod-form">
      <div class="mod-config-inline">
        {{ t('flows.pubStatus') }}
        <SBadge :tone="enabled ? 'success' : 'gray'">{{ enabled ? t('enabled') : t('disabled') }}</SBadge>
      </div>
      <div>
        {{ t('flows.pubGroups', { groups: joinList(groups) || t('flows.pubNoGroups') }) }}
        <SHint inline size="xs">{{ t('flows.pubGroupsNote') }}</SHint>
      </div>
      <div>{{ t('flows.pubTiming') }}</div>
      <ol class="mod-publish-stages">
        <li v-for="(l, i) in lines" :key="i">
          {{ l.head }}<span class="mod-sub"> · {{ l.out }}</span>
        </li>
      </ol>
      <SHint size="xs">{{ t('flows.pubNote') }}</SHint>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="loading" @click="emit('confirm')">{{ t('flows.publish') }}</SButton>
    </template>
  </SModal>
</template>
