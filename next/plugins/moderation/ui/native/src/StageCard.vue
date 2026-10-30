<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SIcon, SInput, SSelect } from '@sub2api/ui'
import AuditorPicker from './AuditorPicker.vue'
import { enumLabel, useModHost, type Stage } from './host'
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
// between stages, Delete / Backspace removes), an "add auditor" fallback, the
// combine mode of parallel auditors and the fixed outcome lines.
const props = defineProps<{
  stage: Stage
  index: number
  count: number
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
}>()
const t = useModHost().t
const over = ref(false)

const last = computed(() => props.index === props.count - 1)
const multi = computed(() => props.stage.auditors.length > 1)
const neverHits = computed(() => props.stage.combine === 'all' && props.stage.auditors.some((id) => !props.byId.get(id)?.channelOk))
const combineOptions = computed(() => COMBINES.map((c) => ({ value: c, label: t(`flows.combineOpt.${c}`) })))
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
        <SButton size="xs" variant="ghost" square :aria-label="t('flows.moveEarlier')" :title="t('flows.moveEarlier')" :disabled="index === 0" @click="emit('move-stage', index - 1)">
          <SIcon name="chevron-right" class="mod-icon mod-flip" />
        </SButton>
        <SButton size="xs" variant="ghost" icon="chevron-right" icon-only :aria-label="t('flows.moveLater')" :title="t('flows.moveLater')" :disabled="last" @click="emit('move-stage', index + 1)" />
        <SButton size="xs" variant="ghost" icon="x" icon-only :aria-label="t('flows.removeStage')" :title="t('flows.removeStage')" @click="emit('remove-stage')" />
      </span>
    </header>

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

    <p v-if="neverHits" class="mod-text-warning">{{ t('flows.neverHits') }}</p>
    <p class="mod-sub">{{ t('flows.errorNote') }}</p>
    <div class="mod-stage-out">
      <span class="mod-text-success">{{ t('flows.passAllow') }}</span>
      <span class="mod-text-danger">{{ last ? t('flows.hitSuspicious') : t('flows.hitNextN', { n: index + 2 }) }}</span>
    </div>
  </section>
</template>
