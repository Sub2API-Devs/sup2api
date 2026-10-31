<script setup lang="ts">
import { computed, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SField, SHint, SModal, SSegmented, STextarea } from '@sub2api/ui'
import { enumLabel, enumOptions } from './format'
import { createWatch, deleteWatch, errorMessage, updateWatch, useModHost } from './host'
import type { Watch, WatchLevel } from './types'

// Inline watch list actions of one user (new-api watch-level-actions): add
// at a level, switch the level, remove. Each one is confirmed in a dialog
// that says what changes and takes a reason for the history (new-api
// WatchActionModal). Emits the new entry (null = removed).
const props = defineProps<{ userId: number; watch: Pick<Watch, 'level'> | null; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t

const levels: WatchLevel[] = ['observe', 'enforce']
const levelOptions = computed(() => enumOptions('level', levels))

/** The action being confirmed: add or set a level, or release (level null). */
const pending = ref<{ kind: 'add' | 'level' | 'release'; level: WatchLevel | null } | null>(null)
const reason = ref('')
const busy = ref(false)

function ask(kind: 'add' | 'level' | 'release', level: WatchLevel | null) {
  if (kind === 'level' && level === props.watch?.level) return
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

/** Field errors of the watch API (staff, exempt) as their message. */
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
  <span class="mod-watch-actions">
    <template v-if="watch">
      <SSegmented :model-value="watch.level" :options="levelOptions" size="sm" :disabled="busy" @update:model-value="ask('level', $event as WatchLevel)" />
      <SButton :size="size || 'sm'" variant="ghost" @click="ask('release', null)">{{ t('watch.remove') }}</SButton>
    </template>
    <template v-else>
      <SButton v-for="l in levels" :key="l" :size="size || 'sm'" @click="ask('add', l)">{{ t(`watchActions.add.${l}`) }}</SButton>
    </template>

    <SModal :open="!!pending" :title="title" width="md" @update:open="!$event && (pending = null)">
      <div class="mod-form">
        <SHint>{{ description }}</SHint>
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
