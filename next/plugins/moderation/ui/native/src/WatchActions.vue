<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SSegmented } from '@sub2api/ui'
import { enumOptions } from './format'
import { useModHost } from './host'
import type { Watch, WatchLevel } from './types'
import WatchActionDialog from './WatchActionDialog.vue'
import { watchLocked, WATCH_LEVELS as levels, type WatchAction } from './watchLevels'

// Inline watch list actions of one user in the user drawer (new-api
// watch-level-actions): add at a level, switch the level, remove. Each one
// is confirmed in WatchActionDialog. Emits the new entry (null = removed).
// A user on a user list or with a locked entry (0.10.0) keeps the level the
// list fixes: the actions are disabled until the user is unlocked.
const props = defineProps<{ userId: number; watch: Pick<Watch, 'level' | 'locked'> | null; size?: 'sm' | 'md'; allowlisted?: boolean; blocklisted?: boolean }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const t = useModHost().t

const levelOptions = computed(() => enumOptions('level', levels))
const locked = computed(() => watchLocked({ ...props, locked: props.watch?.locked }))

const pending = ref<WatchAction | null>(null)
function ask(kind: WatchAction['kind'], level: WatchLevel | null) {
  if (kind === 'level' && level === props.watch?.level) return
  pending.value = { kind, level }
}
</script>

<template>
  <span class="mod-watch-actions" :title="locked ? t('lock.fixed') : undefined">
    <template v-if="watch">
      <SSegmented :model-value="watch.level" :options="levelOptions" size="sm" :disabled="locked" @update:model-value="ask('level', $event as WatchLevel)" />
      <SButton :size="size || 'sm'" variant="ghost" :disabled="locked" @click="ask('release', null)">{{ t('watch.remove') }}</SButton>
    </template>
    <template v-else>
      <SButton v-for="l in levels" :key="l" :size="size || 'sm'" :disabled="locked" @click="ask('add', l)">{{ t(`watchActions.add.${l}`) }}</SButton>
    </template>
    <WatchActionDialog v-model:action="pending" :user-id="userId" @changed="emit('changed', $event)" />
  </span>
</template>
