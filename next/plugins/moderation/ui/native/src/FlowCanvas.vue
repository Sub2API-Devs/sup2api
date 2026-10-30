<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { SButton } from '@sub2api/ui'
import AuditorLibrary from './AuditorLibrary.vue'
import AuditorPicker from './AuditorPicker.vue'
import StageCard from './StageCard.vue'
import { useModHost, type Spec } from './host'
import {
  FLOW_TEMPLATES,
  MAX_STAGES,
  MAX_STAGE_AUDITORS,
  acceptsCanvasDrag,
  addAuditor,
  addStage,
  applyDrop,
  applyTemplate,
  isAuditorType,
  leavesInside,
  moveStage,
  readCanvasDrag,
  removeAuditor,
  removeStage,
  setCombine,
  stageRole,
  type CanvasAuditor,
  type CanvasDrag,
  type CanvasDropTarget,
  type Combine,
  type FlowTemplate
} from './flowOps'

// Flow stages as horizontal cards (new-api flow-canvas.tsx). Auditors are
// placed by native drag and drop or the pickers; every change goes through
// flowOps, so the result always matches the backend rules.
const props = defineProps<{ spec: Spec; auditors: CanvasAuditor[]; disabled: boolean }>()
const emit = defineEmits<{ (e: 'update:spec', spec: Spec): void; (e: 'manage'): void }>()
const host = useModHost()
const t = host.t

const root = ref<HTMLElement>()
const overNew = ref(false)
const usable = computed(() => props.auditors.filter((a) => isAuditorType(a.type)))
const byId = computed(() => new Map(props.auditors.map((a) => [a.id, a])))
const typeOf = (id: number) => byId.value.get(id)?.type
const nameOf = (id: number) => byId.value.get(id)?.name ?? `#${id}`

const change = (next: Spec) => {
  if (next !== props.spec) emit('update:spec', next)
}

function drop(drag: CanvasDrag, target: CanvasDropTarget) {
  const next = applyDrop(props.spec, drag, target, typeOf)
  if (next === 'duplicate') host.toast(t('flows.dupToast'), 'warning')
  else if (next === 'full') host.toast(t('flows.fullToast', { n: MAX_STAGE_AUDITORS }), 'warning')
  else if (next === 'max_stages') host.toast(t('flows.maxStagesToast', { n: MAX_STAGES }), 'warning')
  else if (next !== 'noop') {
    emit('update:spec', next)
    if (drag.kind === 'node') refocus(drag, target, next)
  }
}

/** Keeps the keyboard focus on an auditor moved with ← / →. */
function refocus(drag: Extract<CanvasDrag, { kind: 'node' }>, target: CanvasDropTarget, next: Spec) {
  if (target.kind === 'trash') return
  const id = props.spec.stages[drag.stage]?.auditors[drag.index]
  let stage = target.kind === 'new' ? next.stages.length - 1 : target.stage
  // the source stage disappeared when it held only this auditor
  if (target.kind === 'stage' && props.spec.stages[drag.stage].auditors.length === 1 && target.stage > drag.stage) stage--
  nextTick(() => root.value?.querySelector<HTMLElement>(`[data-stage="${stage}"] [data-auditor="${id}"]`)?.focus())
}

// warnings that do not block publishing
const warnings = computed(() => {
  const list: string[] = []
  const spec = props.spec
  for (const id of new Set(spec.stages.flatMap((s) => s.auditors))) {
    const a = byId.value.get(id)
    if (a && !a.channelOk) list.push(t('flows.warnChannel', { name: a.name }))
  }
  if (spec.stages[0]?.auditors.some((id) => typeOf(id) === 'typesafe')) list.push(t('flows.warnJevFirst'))
  spec.stages.forEach((st, i) => {
    const repeated = st.auditors.find((id) => spec.stages[i - 1]?.auditors.includes(id))
    if (repeated !== undefined) list.push(t('flows.warnRepeat', { prev: i, n: i + 1, name: nameOf(repeated) }))
  })
  return list
})

async function useTemplate(tpl: FlowTemplate) {
  if (props.spec.stages.length) {
    const ok = await host.confirm({
      title: t('flows.templateConfirmTitle'),
      message: t('flows.templateConfirm', { name: t(`flows.template.${tpl}`) }),
      confirmText: t('flows.applyTemplate')
    })
    if (!ok) return
  }
  change(applyTemplate(props.spec, tpl, usable.value))
}

function onOverNew(e: DragEvent) {
  if (!acceptsCanvasDrag(e)) return
  e.preventDefault()
  overNew.value = true
}
function onLeaveNew(e: DragEvent) {
  if (!leavesInside(e)) overNew.value = false
}
function onDropNew(e: DragEvent) {
  e.preventDefault()
  overNew.value = false
  const d = readCanvasDrag(e)
  if (d) drop(d, { kind: 'new' })
}
</script>

<template>
  <div ref="root" class="mod-canvas-wrap">
    <div v-if="!disabled" class="mod-canvas-templates">
      <span class="mod-sub">{{ t('flows.templateLabel') }}</span>
      <SButton v-for="tpl in FLOW_TEMPLATES" :key="tpl" size="xs" @click="useTemplate(tpl)">{{ t(`flows.template.${tpl}`) }}</SButton>
    </div>

    <div class="mod-canvas-main">
      <AuditorLibrary :auditors="usable" :spec="spec" :disabled="disabled" @drop="drop" @manage="emit('manage')" />
      <div class="mod-canvas">
        <div class="mod-canvas-io">{{ t('flows.input') }}</div>
        <template v-for="(st, i) in spec.stages" :key="i">
          <div class="mod-canvas-arrow">
            <span aria-hidden="true">→</span>
            <span v-if="i > 0" class="mod-text-danger">{{ t('flows.hitNext') }}</span>
          </div>
          <StageCard
            :stage="st"
            :index="i"
            :count="spec.stages.length"
            :role="stageRole(i, st, typeOf)"
            :by-id="byId"
            :addable="st.auditors.length < MAX_STAGE_AUDITORS ? usable.filter((a) => !st.auditors.includes(a.id)) : []"
            :disabled="disabled"
            @drop="drop"
            @add="change(addAuditor(spec, i, $event, typeOf))"
            @remove="change(removeAuditor(spec, i, $event))"
            @move-stage="change(moveStage(spec, i, $event))"
            @remove-stage="change(removeStage(spec, i))"
            @combine="(c: Combine, n?: number) => change(setCombine(spec, i, c, n))"
          />
        </template>
        <section
          v-if="!disabled && spec.stages.length < MAX_STAGES"
          class="mod-canvas-new"
          :class="{ 'mod-drop-over': overNew }"
          :aria-label="t('flows.newStage')"
          @dragover="onOverNew"
          @dragleave="onLeaveNew"
          @drop="onDropNew"
        >
          <strong>{{ t('flows.newStage') }}</strong>
          <span>{{ t('flows.dropHere') }}</span>
          <AuditorPicker :auditors="usable" :placeholder="t('flows.orPick')" @pick="change(addStage(spec, $event, typeOf))" />
        </section>
        <div class="mod-canvas-io mod-canvas-result">
          <strong>{{ t('flows.result') }}</strong>
          <span>{{ t('flows.resultDesc') }}</span>
        </div>
      </div>
    </div>

    <ul v-if="warnings.length" class="mod-canvas-warnings">
      <li v-for="w in warnings" :key="w">⚠ {{ w }}</li>
    </ul>
    <p v-if="!disabled" class="mod-sub">{{ t('flows.keyboardHelp') }}</p>
  </div>
</template>
