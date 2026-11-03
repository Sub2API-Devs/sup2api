<script setup lang="ts">
// One node task on one node in the task × node matrix.
import { useI18n } from 'vue-i18n'
import { SDateTime, SHint, SStatusDot } from '@sub2api/ui'
import { dotTone, formatDuration, nodeStatus, type NodeTask } from './tasks'

const props = defineProps<{ task: NodeTask; alive: boolean }>()
const emit = defineEmits<{ (e: 'open'): void }>()
const { t } = useI18n()

function title() {
  return [t(`tasks.status.${nodeStatus(props.task)}`), props.task.error || props.task.message || ''].filter(Boolean).join('\n')
}
</script>

<template>
  <button type="button" class="flex flex-col items-start text-left" :class="alive ? '' : 'opacity-50'" :title="title()" @click.stop="emit('open')">
    <span class="inline-flex items-center gap-1.5">
      <SStatusDot :tone="dotTone(nodeStatus(task))" :label="t(`tasks.status.${nodeStatus(task)}`)" sr-only size="xs" />
      <SDateTime v-if="task.last_finished_at" :value="task.last_finished_at" mode="relative" />
      <span v-else class="text-fg-muted">{{ t('tasks.status.never') }}</span>
    </span>
    <SHint size="xs">
      {{ formatDuration(task.duration_ms) }}
      <template v-if="task.consecutive_failures"> · <span class="text-danger-600 dark:text-danger-400">×{{ task.consecutive_failures }}</span></template>
    </SHint>
  </button>
</template>
