<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SField, SFormModal, SHint, STextarea } from '@sub2api/ui'
import { enumLabel } from './format'
import { createWatch, deleteWatch, errorMessage, updateWatch, useModHost } from './host'
import type { Watch } from './types'
import type { WatchAction } from './watchLevels'

// Confirms a watch list action of one user (new-api WatchActionModal): add
// at a level, switch the level or remove. Says what changes, takes a reason
// for the history, then calls the API. v-model:action holds the action being
// confirmed (null = closed); emits the new entry (null = removed). Shared by
// the inline actions of the user drawer and the watch list's row actions.
const props = defineProps<{ userId: number | null; action: WatchAction | null }>()
const emit = defineEmits<{ (e: 'update:action', a: WatchAction | null): void; (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t

const reason = ref('')
const busy = ref(false)
watch(
  () => props.action,
  () => (reason.value = '')
)

const title = computed(() => {
  const a = props.action
  if (!a) return ''
  const id = props.userId
  if (a.kind === 'add') return t('watchActions.title.add', { id, level: enumLabel('level', a.level) })
  return t(`watchActions.title.${a.kind === 'release' ? 'release' : a.level}`, { id })
})
const description = computed(() => (props.action ? t(`watchActions.desc.${props.action.level ?? 'release'}`) : ''))

/** 409 locked (a user on a list, or a locked entry), the user_id/staff field error, else the message. */
function failText(e: unknown): string {
  if (isApiError(e) && e.code === 'locked') return t('lock.refused')
  return (isApiError(e) && e.fields.user_id) || errorMessage(e, t('actionFailed'))
}

async function confirm() {
  const a = props.action
  const id = props.userId
  if (!a || !id) return
  const why = reason.value.trim() ? { reason: reason.value.trim() } : {}
  busy.value = true
  try {
    let w: Watch | null = null
    if (a.kind === 'release') await deleteWatch(id, why)
    else if (a.kind === 'add') w = await createWatch({ user_id: id, level: a.level ?? 'observe', ...why })
    else w = await updateWatch(id, { level: a.level ?? 'observe', ...why })
    emit('update:action', null)
    emit('changed', w)
    host.toast(a.kind === 'release' ? t('watch.removed', { id }) : t('watch.saved'), 'success')
  } catch (e) {
    host.toast(failText(e), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SFormModal
    :open="!!action"
    :title="title"
    width="md"
    :loading="busy"
    :enter-submit="false"
    :submit-text="t('watchActions.confirm')"
    :submit-variant="action?.level === 'enforce' ? 'danger' : 'primary'"
    @update:open="!$event && emit('update:action', null)"
    @submit="confirm"
  >
    <div class="mod-form">
      <SHint>{{ description }}</SHint>
      <SField :label="t('watchEdit.reason')" :hint="t('watchEdit.reasonHint')">
        <STextarea v-model="reason" :rows="2" :maxlength="500" />
      </SField>
    </div>
  </SFormModal>
</template>
