<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SSegmented } from '@sub2api/ui'
import { useModHost } from './host'
import type { Watch, WatchLevel } from './types'
import WatchActionDialog from './WatchActionDialog.vue'
import { levelRefused, userListHint, watchLevelOptions, WATCH_LEVELS as levels, type WatchAction } from './watchLevels'

// Inline watch list actions of one user in the user drawer (new-api
// watch-level-actions): add at a level, switch the level, remove. Each one
// is confirmed in WatchActionDialog. Emits the new entry (null = removed).
// An allowlisted user cannot be set to the enforce level (the backend
// answers level/allowlisted); for a blocklisted user the dialog says that
// the level does not change the timing.
const props = defineProps<{ userId: number; watch: Pick<Watch, 'level'> | null; size?: 'sm' | 'md'; allowlisted?: boolean; blocklisted?: boolean }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const t = useModHost().t

/** enforce is not offered to an allowlisted user */
const refused = (l: WatchLevel) => levelRefused(l, props.allowlisted)
const levelOptions = computed(() => watchLevelOptions(props.allowlisted))
const listHint = computed(() => userListHint(props))

const pending = ref<WatchAction | null>(null)
function ask(kind: WatchAction['kind'], level: WatchLevel | null) {
  if (kind === 'level' && level === props.watch?.level) return
  if (level && refused(level)) return
  pending.value = { kind, level }
}
</script>

<template>
  <span class="mod-watch-actions" :title="listHint || undefined">
    <template v-if="watch">
      <SSegmented :model-value="watch.level" :options="levelOptions" size="sm" @update:model-value="ask('level', $event as WatchLevel)" />
      <SButton :size="size || 'sm'" variant="ghost" @click="ask('release', null)">{{ t('watch.remove') }}</SButton>
    </template>
    <template v-else>
      <SButton v-for="l in levels" :key="l" :size="size || 'sm'" :disabled="refused(l)" @click="ask('add', l)">{{ t(`watchActions.add.${l}`) }}</SButton>
    </template>
    <WatchActionDialog v-model:action="pending" :user-id="userId" :allowlisted="allowlisted" :blocklisted="blocklisted" @changed="emit('changed', $event)" />
  </span>
</template>
