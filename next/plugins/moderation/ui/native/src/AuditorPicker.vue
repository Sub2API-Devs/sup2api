<script setup lang="ts">
import { computed } from 'vue'
import { SSelect } from '@sub2api/ui'
import { enumLabel } from './host'
import type { CanvasAuditor } from './flowOps'

// Keyboard / pointer alternative to dragging: always shows its placeholder;
// picking an auditor emits it.
const props = defineProps<{ auditors: CanvasAuditor[]; placeholder: string }>()
const emit = defineEmits<{ (e: 'pick', id: number): void }>()

const options = computed(() => props.auditors.map((a) => ({ value: a.id, label: `${a.name} · ${enumLabel('auditorType', a.type)}` })))

function pick(v: unknown) {
  if (typeof v === 'number') emit('pick', v)
}
</script>

<template>
  <SSelect :model-value="null" :options="options" :placeholder="placeholder" :aria-label="placeholder" size="sm" class="mod-picker" @update:model-value="pick" />
</template>
