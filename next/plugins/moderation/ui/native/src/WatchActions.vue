<script setup lang="ts">
import { computed, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SField, SHint, SModal, SSegmented, STextarea } from '@sub2api/ui'
import { enumLabel } from './format'
import { createWatch, deleteWatch, errorMessage, updateWatch, useModHost } from './host'
import type { Watch, WatchLevel } from './types'
import { levelRefused, userListHint, watchLevelOptions, WATCH_LEVELS as levels } from './watchLevels'

// Inline watch list actions of one user (new-api watch-level-actions): add
// at a level, switch the level, remove. Each one is confirmed in a dialog
// that says what changes and takes a reason for the history (new-api
// WatchActionModal). Emits the new entry (null = removed). An allowlisted
// user cannot be set to the enforce level (the backend answers
// level/allowlisted); for a blocklisted user the dialog says that the level
// does not change the timing.
const props = defineProps<{ userId: number; watch: Pick<Watch, 'level'> | null; size?: 'sm' | 'md'; allowlisted?: boolean; blocklisted?: boolean }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t

/** enforce is not offered to an allowlisted user */
const refused = (l: WatchLevel) => levelRefused(l, props.allowlisted)
const levelOptions = computed(() => watchLevelOptions(props.allowlisted))
const listHint = computed(() => userListHint(props))

/** The action being confirmed: add or set a level, or release (level null). */
const pending = ref<{ kind: 'add' | 'level' | 'release'; level: WatchLevel | null } | null>(null)
const reason = ref('')
const busy = ref(false)

function ask(kind: 'add' | 'level' | 'release', level: WatchLevel | null) {
  if (kind === 'level' && level === props.watch?.level) return
  if (level && refused(level)) return
  reason.value = ''
  pending.value = { kind, level }
}

const title = computed(() => {
  const p = pending.value
  if (!p) return ''
  const id = props.userId
  if (p.kind === 'add') return t('watchActions.title.add', { id, level: enumLabel('level', p.level) })
  return t(`watchActions.title.${p.kind === 'release' ? 'release' : p.level}`, { id })
})
const description = computed(() => (pending.value ? t(`watchActions.desc.${pending.value.level ?? 'release'}`) : ''))

/** Field errors of the watch API (user_id/staff, level/allowlisted) as their message. */
function failText(e: unknown): string {
  return (isApiError(e) && (e.fields.user_id || e.fields.level)) || errorMessage(e, t('actionFailed'))
}

async function confirm() {
  const p = pending.value
  if (!p) return
  const id = props.userId
  const why = reason.value.trim() ? { reason: reason.value.trim() } : {}
  busy.value = true
  try {
    let w: Watch | null = null
    if (p.kind === 'release') await deleteWatch(id, why)
    else if (p.kind === 'add') w = await createWatch({ user_id: id, level: p.level ?? 'observe', ...why })
    else w = await updateWatch(id, { level: p.level ?? 'observe', ...why })
    pending.value = null
    emit('changed', w)
    host.toast(p.kind === 'release' ? t('watch.removed', { id }) : t('watch.saved'), 'success')
  } catch (e) {
    host.toast(failText(e), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <span class="mod-watch-actions" :title="listHint || undefined">
    <template v-if="watch">
      <SSegmented :model-value="watch.level" :options="levelOptions" size="sm" :disabled="busy" @update:model-value="ask('level', $event as WatchLevel)" />
      <SButton :size="size || 'sm'" variant="ghost" @click="ask('release', null)">{{ t('watch.remove') }}</SButton>
    </template>
    <template v-else>
      <SButton v-for="l in levels" :key="l" :size="size || 'sm'" :disabled="refused(l)" @click="ask('add', l)">{{ t(`watchActions.add.${l}`) }}</SButton>
    </template>

    <SModal :open="!!pending" :title="title" width="md" @update:open="!$event && (pending = null)">
      <div class="mod-form">
        <SHint>{{ description }}</SHint>
        <SHint v-if="listHint" size="xs" tone="warning">{{ listHint }}</SHint>
        <SField :label="t('watchEdit.reason')" :hint="t('watchEdit.reasonHint')">
          <STextarea v-model="reason" :rows="2" :maxlength="500" />
        </SField>
      </div>
      <template #footer>
        <SButton @click="pending = null">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton :variant="pending?.level === 'enforce' ? 'danger' : 'primary'" :loading="busy" @click="confirm">{{ t('watchActions.confirm') }}</SButton>
      </template>
    </SModal>
  </span>
</template>
