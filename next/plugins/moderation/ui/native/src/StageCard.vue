<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SIcon, SInput, SSelect, SSwitch } from '@sub2api/ui'
import AuditorPicker from './AuditorPicker.vue'
import { enumLabel, enumOptions } from './format'
import { useModHost } from './host'
import type { Stage } from './types'
import {
  COMBINES,
  acceptsCanvasDrag,
  leavesInside,
  readCanvasDrag,
  startCanvasDrag,
  type CanvasAuditor,
  type CanvasDrag,
  type CanvasDropTarget,
  type Combine,
  type StageRole
} from './flowOps'

// One stage of the flow canvas: its auditors (drag; keyboard ← → moves
// between stages, Delete / Backspace removes), an "add auditor" picker, the
// combine mode of parallel auditors, the switch that makes a later stage a
// fallback stage (补审) and the fixed outcome lines. Stages move only among
// their own kind: review stages come first, fallback stages after them.
const props = defineProps<{
  stage: Stage
  index: number
  count: number
  /** how many review stages lead the flow (the fallback stages follow them) */
  reviewCount: number
  role: StageRole
  byId: ReadonlyMap<number, CanvasAuditor>
  /** auditors that can still be added to this stage */
  addable: CanvasAuditor[]
  disabled: boolean
}>()
const emit = defineEmits<{
  (e: 'drop', drag: CanvasDrag, target: CanvasDropTarget): void
  (e: 'add', id: number): void
  (e: 'remove', auditorIndex: number): void
  (e: 'move-stage', to: number): void
  (e: 'remove-stage'): void
  (e: 'combine', combine: Combine, n?: number): void
  (e: 'fallback', fallback: boolean): void
}>()
const t = useModHost().t
const over = ref(false)

const last = computed(() => props.index === props.count - 1)
const isFallback = computed(() => !!props.stage.fallback)
/** The first and the last stage of this stage's kind: it does not move past them. */
const firstOfKind = computed(() => props.index === (isFallback.value ? props.reviewCount : 0))
const lastOfKind = computed(() => props.index === (isFallback.value ? props.count : props.reviewCount) - 1)
const hasFallback = computed(() => props.reviewCount < props.count)
const multi = computed(() => props.stage.auditors.length > 1)
const combineOptions = computed(() => enumOptions('flows.combineOpt', COMBINES))
const nameOf = (id: number) => props.byId.get(id)?.name ?? t('flows.auditorN', { id })

function onOver(e: DragEvent) {
  if (props.disabled || !acceptsCanvasDrag(e)) return
  e.preventDefault()
  over.value = true
}
function onLeave(e: DragEvent) {
  if (!leavesInside(e)) over.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  over.value = false
  if (props.disabled) return
  const drag = readCanvasDrag(e)
  if (drag) emit('drop', drag, { kind: 'stage', stage: props.index })
}

function onKey(e: KeyboardEvent, auditorIndex: number) {
  if (props.disabled) return
  const node: CanvasDrag = { kind: 'node', stage: props.index, index: auditorIndex }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    emit('remove', auditorIndex)
  } else if (e.key === 'ArrowLeft' && props.index > 0) {
    e.preventDefault()
    emit('drop', node, { kind: 'stage', stage: props.index - 1 })
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    emit('drop', node, last.value ? { kind: 'new' } : { kind: 'stage', stage: props.index + 1 })
  }
}

function setN(v: unknown) {
  emit('combine', 'at_least', Number(v))
}
</script>

<template>
  <section
    class="mod-stage-card"
    :class="{ 'mod-drop-over': over }"
    :aria-label="t('trace.stageN', { n: index + 1 })"
    :data-stage="index"
    @dragover="onOver"
    @dragleave="onLeave"
    @drop="onDrop"
  >
    <header class="mod-stage-card-head">
      <span v-if="!disabled" class="mod-grip" draggable="true" :title="t('flows.dragStage')" @dragstart="startCanvasDrag($event, { kind: 'stage', stage: index })">
        <SIcon name="grip-vertical" class="mod-icon" />
      </span>
      <strong class="mod-stage-card-title">{{ t('trace.stageN', { n: index + 1 }) }} · {{ t(`flows.role.${role}`) }}</strong>
      <SBadge :tone="multi ? 'info' : 'gray'" size="xs">{{ multi ? t('flows.parallel', { n: stage.auditors.length }) : t('flows.single') }}</SBadge>
      <span v-if="!disabled" class="mod-ml-auto mod-stage-card-tools">
        <SButton size="xs" variant="ghost" :disabled="firstOfKind" @click="emit('move-stage', index - 1)">{{ t('flows.moveEarlier') }}</SButton>
        <SButton size="xs" variant="ghost" :disabled="lastOfKind" @click="emit('move-stage', index + 1)">{{ t('flows.moveLater') }}</SButton>
        <SButton size="xs" variant="ghost" tone="danger" @click="emit('remove-stage')">{{ t('flows.removeStage') }}</SButton>
      </span>
    </header>
    <!-- the first stage is always a review stage -->
    <div v-if="index > 0 && (!disabled || isFallback)" class="mod-stage-fallback" :title="t('flows.fallbackSwitchHint')">
      <SSwitch :model-value="isFallback" size="sm" :disabled="disabled" :label="t('flows.fallbackSwitch')" @update:model-value="emit('fallback', $event)" />
    </div>

    <ul class="mod-lib-list">
      <li
        v-for="(id, i) in stage.auditors"
        :key="id"
        class="mod-node mod-node-row"
        :class="{ 'mod-node-drag': !disabled }"
        :tabindex="disabled ? undefined : 0"
        :draggable="!disabled"
        :data-auditor="id"
        :aria-label="nameOf(id)"
        @dragstart="startCanvasDrag($event, { kind: 'node', stage: index, index: i })"
        @keydown="onKey($event, i)"
      >
        <div class="mod-node-body">
          <div class="mod-node-name">{{ nameOf(id) }}</div>
          <div class="mod-node-sub">
            <template v-if="byId.get(id)">{{ enumLabel('auditorType', byId.get(id)!.type) }}<template v-if="byId.get(id)!.channelName"> · {{ byId.get(id)!.channelName }}</template></template>
            <span v-else class="mod-text-danger">{{ t('flows.auditorMissing') }}</span>
          </div>
          <div v-if="byId.get(id) && !byId.get(id)!.channelOk" class="mod-text-warning">{{ t('flows.channelDown') }}</div>
        </div>
        <SButton v-if="!disabled" size="xs" variant="ghost" icon="x" icon-only :aria-label="t('flows.removeAuditor', { name: nameOf(id) })" @click="emit('remove', i)" />
      </li>
    </ul>

    <AuditorPicker v-if="!disabled && addable.length" :auditors="addable" :placeholder="t('flows.addParallel')" @pick="emit('add', $event)" />

    <div v-if="multi" class="mod-stage-combine">
      <span class="mod-sub">{{ t('flows.combine') }}</span>
      <SSelect
        :model-value="stage.combine || 'any'"
        :options="combineOptions"
        :disabled="disabled"
        :aria-label="t('flows.combine')"
        size="sm"
        @update:model-value="emit('combine', $event as Combine, stage.n)"
      />
      <label v-if="stage.combine === 'at_least'" class="mod-stage-n">
        N =
        <SInput :model-value="stage.n ?? 1" type="number" :min="1" :max="stage.auditors.length" size="sm" :disabled="disabled" aria-label="N" @update:model-value="setN" />
      </label>
    </div>

    <p class="mod-sub">{{ t('flows.errorNote') }}</p>
    <div v-if="isFallback" class="mod-stage-out">
      <span class="mod-text-danger">{{ t('flows.fallbackHit') }}</span>
      <span class="mod-text-success">{{ t('flows.fallbackPass') }}</span>
    </div>
    <div v-else class="mod-stage-out">
      <span class="mod-text-success">{{ index === 0 && hasFallback ? t('flows.passFallback') : t('flows.passAllow') }}</span>
      <span class="mod-text-danger">{{ lastOfKind ? t('flows.hitSuspicious') : t('flows.hitNextN', { n: index + 2 }) }}</span>
    </div>
  </section>
</template>
