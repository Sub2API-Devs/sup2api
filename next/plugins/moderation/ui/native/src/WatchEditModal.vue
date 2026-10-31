<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SButton, SField, SInput, SModal, SSegmented, fromLocalInput, toLocalInput } from '@sub2api/ui'
import { applyErrorsOrToast, clearErrors, type FieldErrors } from './forms'
import { enumOptions } from './format'
import { canManageSettings, createWatch, fetchPluginSettings, settingValue, updateWatch, useModHost } from './host'
import type { Watch, WatchChange, WatchLevel } from './types'
import { resolveUserIds } from './users'

// Add a user to the watch list or edit an entry (new-api watch-add-dialog /
// watch-change-dialogs): level, absolute expiry or none, note and a reason
// for the history. The user is a username (resolved through the core) or an
// id. Only changed fields are sent, and a note alone is logged as a note
// change. An untouched expiry is left to the backend, which on a new entry
// or a level change sets watch_days at observe and none at enforce; the form
// shows that default for the chosen level until the expiry is edited.
const props = defineProps<{ open: boolean; entry: Watch | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useModHost()
const t = host.t

type Expiry = 'never' | 'at'
const form = reactive({ user: '', level: 'observe' as WatchLevel, expiry: 'at' as Expiry, expiresAt: '', note: '', reason: '' })
/** The form as opened, to tell what changed. */
const initial = { level: 'observe' as WatchLevel, expiry: 'at' as Expiry, expiresAt: '', note: '' }
const errs = reactive<FieldErrors>({})
const saving = ref(false)

/** watch_days of the settings (null when not readable: moderation:read users); the default expiry of a new entry. */
const watchDays = ref<number | null>(null)
async function loadWatchDays() {
  if (!canManageSettings()) return
  const s = await fetchPluginSettings().catch(() => null)
  const days = Number(settingValue(s, 'watch_days'))
  watchDays.value = days > 0 ? days : null
}

const inDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString()

/** The expiry the backend keeps or sets for `level` when none is sent. */
function defaultExpiry(level: WatchLevel): { expiry: Expiry; expiresAt: string } {
  const w = props.entry
  if (w && level === w.level) return { expiry: w.expires_at ? 'at' : 'never', expiresAt: toLocalInput(w.expires_at) }
  if (level === 'enforce') return { expiry: 'never', expiresAt: '' }
  return { expiry: 'at', expiresAt: watchDays.value ? toLocalInput(inDays(watchDays.value)) : '' }
}
/** Shows the default expiry of the level unless the user edited it (it then stays unsent). */
function followLevel() {
  if (expiryChanged.value) return
  const d = defaultExpiry(form.level)
  Object.assign(initial, d)
  Object.assign(form, d)
}

function fill() {
  const w = props.entry
  const level = w?.level ?? 'observe'
  Object.assign(initial, { level, note: w?.note ?? '' }, defaultExpiry(level))
  Object.assign(form, initial, { user: w ? String(w.user_id) : '', reason: '' })
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    clearErrors(errs)
    fill()
    if (watchDays.value !== null) return
    await loadWatchDays()
    if (props.open) followLevel()
  }
)
watch(() => form.level, followLevel)

const levelOptions = computed(() => enumOptions('level', ['observe', 'enforce']))
const expiryOptions = computed(() => [
  { value: 'at', label: t('watchEdit.expiresAt') },
  { value: 'never', label: t('watch.noExpiry') }
])
const expiryChanged = computed(() => form.expiry !== initial.expiry || (form.expiry === 'at' && form.expiresAt !== initial.expiresAt))
/** The hint on an untouched expiry that the backend sets (new entry or new level). */
const expiryHint = computed(() => (expiryChanged.value || (props.entry && form.level === props.entry.level) ? '' : t(`watchEdit.defaultExpiry.${form.level}`)))

function body(): WatchChange {
  const b: WatchChange = {}
  if (!props.entry || form.level !== initial.level) b.level = form.level
  if (form.note.trim() !== initial.note.trim()) b.note = form.note.trim()
  if (expiryChanged.value) b.expires_at = form.expiry === 'never' ? '' : fromLocalInput(form.expiresAt)
  if (form.reason.trim()) b.reason = form.reason.trim()
  return b
}

/** The user of a new entry: one id, else a field error. */
async function userId(): Promise<number | null> {
  const ids = await resolveUserIds(form.user)
  if (ids?.length === 1 && ids[0] > 0) return ids[0]
  errs.user_id = ids === null ? t('events.userSearchDenied') : ids.length > 1 ? t('watchEdit.ambiguous', { n: ids.length }) : t('blocks.invalidUser')
  return null
}

async function save() {
  clearErrors(errs)
  const b = body()
  if (expiryChanged.value && form.expiry === 'at' && !b.expires_at) {
    errs.expires_at = t('watchEdit.expiryRequired')
    return
  }
  if (props.entry && b.level === undefined && b.note === undefined && b.expires_at === undefined) {
    emit('update:open', false)
    return
  }
  saving.value = true
  try {
    if (props.entry) await updateWatch(props.entry.user_id, b)
    else {
      const uid = await userId()
      if (uid === null) return
      await createWatch({ user_id: uid, ...b })
    }
    host.toast(t('watch.saved'), 'success')
    emit('update:open', false)
    emit('saved')
  } catch (e) {
    applyErrorsOrToast(errs, e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="entry ? t('watch.editTitle', { id: entry.user_id }) : t('watch.add')" width="md" @update:open="emit('update:open', $event)">
    <form class="mod-form" @submit.prevent="save">
      <SField v-if="!entry" :label="t('events.user')" :hint="t('watchEdit.userHint')" required :error="errs.user_id">
        <SInput v-model="form.user" :placeholder="t('events.userPlaceholder')" />
      </SField>
      <SField :label="t('watch.col.level')" :hint="t('watch.levelHint')" :error="errs.level">
        <SSegmented v-model="form.level" :options="levelOptions" />
      </SField>
      <SField :label="t('watch.col.expires')" :hint="expiryHint" :error="errs.expires_at || errs.days">
        <div class="mod-inline mod-gap">
          <SSegmented v-model="form.expiry" :options="expiryOptions" size="sm" />
          <SInput v-if="form.expiry === 'at'" v-model="form.expiresAt" type="datetime-local" size="sm" />
        </div>
      </SField>
      <SField :label="t('watch.col.note')" :error="errs.note">
        <SInput v-model="form.note" :maxlength="500" />
      </SField>
      <SField :label="t('watchEdit.reason')" :hint="t('watchEdit.reasonHint')" :error="errs.reason">
        <SInput v-model="form.reason" :maxlength="500" />
      </SField>
    </form>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
    </template>
  </SModal>
</template>
