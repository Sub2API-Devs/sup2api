<script setup lang="ts">
import { ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SSegmented } from '@sub2api/ui'
import { createWatch, deleteWatch, errorMessage, updateWatch, useModHost, type Watch, type WatchLevel } from './host'

// Inline watch list actions of one user (new-api watch-level-actions): add
// at a level, switch the level, remove. Emits the new entry (null = removed).
const props = defineProps<{ userId: number; watch: Pick<Watch, 'level'> | null; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t
const busy = ref(false)

const levels: WatchLevel[] = ['observe', 'enforce']
const levelOptions = levels.map((v) => ({ value: v, label: t(`level.${v}`) }))

/** Field errors of the watch API (staff, exempt) as their message. */
function failText(e: unknown): string {
  return (isApiError(e) && (e.fields.user_id || e.fields.level)) || errorMessage(e, t('actionFailed'))
}

async function run(action: () => Promise<Watch | null>, done: string) {
  busy.value = true
  try {
    emit('changed', await action())
    host.toast(done, 'success')
  } catch (e) {
    host.toast(failText(e), 'error')
  } finally {
    busy.value = false
  }
}

const add = (level: WatchLevel) => run(() => createWatch({ user_id: props.userId, level }), t('watch.saved'))
const setLevel = (level: WatchLevel) => run(() => updateWatch(props.userId, { level }), t('watch.saved'))
async function remove() {
  const ok = await host.confirm({ message: t('watch.removeConfirm', { id: props.userId }), confirmText: t('watch.remove') })
  if (ok) await run(() => deleteWatch(props.userId).then(() => null), t('watch.removed', { id: props.userId }))
}
</script>

<template>
  <span class="mod-watch-actions">
    <template v-if="watch">
      <SSegmented :model-value="watch.level" :options="levelOptions" size="sm" :disabled="busy" @update:model-value="setLevel($event as WatchLevel)" />
      <SButton :size="size || 'sm'" variant="ghost" :loading="busy" @click="remove">{{ t('watch.remove') }}</SButton>
    </template>
    <template v-else>
      <SButton v-for="l in levels" :key="l" :size="size || 'sm'" :loading="busy" @click="add(l)">{{ t(`watchActions.add.${l}`) }}</SButton>
    </template>
  </span>
</template>
