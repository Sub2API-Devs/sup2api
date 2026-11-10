<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SButton, SHint, SModal } from '@sub2api/ui'
import { joinList } from './format'
import { useModHost } from './host'
import type { Spec } from './types'
import { auditorIndex, reviewStageCount, stageRole, type CanvasAuditor } from './flowOps'

// Publish confirmation (new-api flow-publish-dialog.tsx): state, groups (and
// how many account bindings the flow has), timing and where each stage goes:
// a review stage hands a hit on, a fallback stage's hit is final.
const props = defineProps<{
  open: boolean
  name: string
  nextVersion: number
  enabled: boolean
  draft: Spec
  groups: string[]
  /** account bindings of the saved flow (the bindings tab) */
  accounts: number
  auditors: CanvasAuditor[]
  loading: boolean
}>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'confirm'): void }>()
const host = useModHost()
const t = host.t

const lookup = computed(() => auditorIndex(props.auditors))

/** Bound groups; without any, whether account bindings still send requests here. */
const groupsText = computed(() => {
  if (!props.groups.length) return props.accounts ? t('flows.pubAccountsOnly', { n: props.accounts }) : t('flows.pubNoGroups')
  return joinList(props.groups) + (props.accounts ? ` · ${t('flows.accountBindings', { n: props.accounts })}` : '')
})

/** Where a stage's verdicts lead (flow.go runFlow). */
function outcome(i: number, fallback: boolean): string {
  if (fallback) return t('flows.pubFallback')
  const review = reviewStageCount(props.draft.stages)
  // only a pass of the first stage reaches the fallback stages: a later pass overturns a hit
  const pass = i === 0 && review < props.draft.stages.length ? t('flows.passFallback') : t('flows.passAllow')
  return `${pass} · ${i === review - 1 ? t('flows.hitSuspicious') : t('flows.hitNextN', { n: i + 2 })}`
}

const lines = computed(() =>
  props.draft.stages.map((st, i) => {
    const head = t('flows.pubStage', {
      n: i + 1,
      role: t(`flows.role.${stageRole(i, st, lookup.value.typeOf)}`),
      auditors: st.auditors.map(lookup.value.nameOf).join(' ∥ ')
    })
    const combine = st.auditors.length > 1 ? ` · ${t(`flows.combineOpt.${st.combine || 'any'}`)}${st.combine === 'at_least' ? ` (N = ${st.n ?? 1})` : ''}` : ''
    return { head: head + combine, out: outcome(i, !!st.fallback) }
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
        {{ t('flows.pubGroups', { groups: groupsText }) }}
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
