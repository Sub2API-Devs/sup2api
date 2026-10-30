<script setup lang="ts">
import { ref } from 'vue'
import { SLink } from '@sub2api/ui'
import { enumLabel, useModHost, type Spec } from './host'
import { acceptsCanvasDrag, leavesInside, readCanvasDrag, startCanvasDrag, type CanvasAuditor, type CanvasDrag, type CanvasDropTarget } from './flowOps'

// Auditor library of the canvas: drag a card onto a stage; dropping a placed
// auditor back onto the library removes it from the flow.
const props = defineProps<{ auditors: CanvasAuditor[]; spec: Spec; disabled: boolean }>()
const emit = defineEmits<{ (e: 'drop', drag: CanvasDrag, target: CanvasDropTarget): void; (e: 'manage'): void }>()
const t = useModHost().t
const over = ref(false)

const usedIn = (id: number) =>
  props.spec.stages
    .map((s, i) => (s.auditors.includes(id) ? i + 1 : 0))
    .filter((n) => n > 0)

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
  if (drag) emit('drop', drag, { kind: 'trash' })
}
</script>

<template>
  <aside class="mod-lib" :class="{ 'mod-lib-over': over }" :aria-label="t('flows.libraryTitle')" @dragover="onOver" @dragleave="onLeave" @drop="onDrop">
    <div class="mod-lib-head">
      <strong>{{ t('flows.libraryTitle') }}</strong>
      <SLink as="button" @click="emit('manage')">{{ t('flows.manage') }}</SLink>
    </div>
    <p v-if="over" class="mod-lib-drop">{{ t('flows.libraryDrop') }}</p>
    <p v-if="!auditors.length" class="mod-sub">{{ t('flows.libraryEmpty') }}</p>
    <ul class="mod-lib-list">
      <li
        v-for="a in auditors"
        :key="a.id"
        class="mod-node"
        :class="{ 'mod-node-drag': !disabled }"
        :draggable="!disabled"
        @dragstart="startCanvasDrag($event, { kind: 'library', auditor: a.id })"
      >
        <div class="mod-node-name">{{ a.name }}</div>
        <div class="mod-node-sub">{{ enumLabel('auditorType', a.type) }}<template v-if="a.channelName"> · {{ a.channelName }}</template></div>
        <div class="mod-node-sub">{{ usedIn(a.id).length ? t('flows.usedIn', { stages: usedIn(a.id).join(', ') }) : t('flows.notUsed') }}</div>
      </li>
    </ul>
    <p class="mod-sub">{{ t('flows.libraryNote') }}</p>
  </aside>
</template>
