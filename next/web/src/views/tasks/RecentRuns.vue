<script setup lang="ts">
// The results of a task's latest runs as small squares, newest on the left.
import { useI18n } from 'vue-i18n'
import { squareClass } from './tasks'

defineProps<{ statuses: string[] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-0.5" data-testid="task-recent">
    <span
      v-for="(s, i) in statuses"
      :key="i"
      class="inline-block h-3 w-1 rounded-sm"
      :class="squareClass(s)"
      :title="t(`tasks.status.${s}`)"
      :data-status="s"
    />
    <span v-if="!statuses.length" class="text-fg-muted">{{ t('tasks.empty') }}</span>
  </div>
</template>
