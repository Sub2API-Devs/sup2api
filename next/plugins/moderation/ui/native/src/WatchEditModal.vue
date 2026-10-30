<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SField, SInput, SModal, SSegmented, fromLocalInput, toLocalInput } from '@sub2api/ui'
import { createWatch, errorMessage, updateWatch, useModHost, type Watch, type WatchChange, type WatchLevel } from './host'
import { resolveUserIds } from './users'

// Add a user to the watch list or edit an entry (new-api watch-add-dialog /
// watch-change-dialogs): level, absolute expiry or none, note and a reason
// for the history. The user is a username (resolved through the core) or an id.
const props = defineProps<{ open: boolean; entry: Watch | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const host = useModHost()
const t = host.t

const DEFAULT_DAYS = 30
const form = reactive({ user: '', level: 'observe' as WatchLevel, expiry: 'at' as 'never' | 'at', expiresAt: '', note: '', reason: '' })
const errs = reactive<Record<string, string>>({})
const saving = ref(false)

const inDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const w = props.entry
    for (const k of Object.keys(errs)) delete errs[k]
    Object.assign(form, {
      user: w ? String(w.user_id) : '',
      level: w?.level ?? 'observe',
      expiry: w && !w.expires_at ? 'never' : 'at',
      expiresAt: toLocalInput(w ? w.expires_at : inDays(DEFAULT_DAYS)),
      note: w?.note ?? '',
      reason: ''
    })
  }
)

const levelOptions = computed(() => (['observe', 'enforce'] as WatchLevel[]).map((v) => ({ value: v, label: t(`level.${v}`) })))
const expiryOptions = computed(() => [
  { value: 'at', label: t('watchEdit.expiresAt') },
  { value: 'never', label: t('watch.noExpiry') }
])

function body(): WatchChange {
  return {
    level: form.level,
    expires_at: form.expiry === 'never' ? '' : fromLocalInput(form.expiresAt),
    note: form.note.trim(),
    ...(form.reason.trim() ? { reason: form.reason.trim() } : {})
  }
}

/** The user of a new entry: one id, else a field error. */
async function userId(): Promise<number | null> {
  const ids = await resolveUserIds(form.user)
  if (ids?.length === 1 && ids[0] > 0) return ids[0]
  errs.user_id = ids === null ? t('events.userSearchDenied') : ids.length > 1 ? t('watchEdit.ambiguous', { n: ids.length }) : t('blocks.invalidUser')
  return null
}

async function save() {
  for (const k of Object.keys(errs)) delete errs[k]
  if (form.expiry === 'at' && !body().expires_at) {
    errs.expires_at = t('watchEdit.expiryRequired')
    return
  }
  saving.value = true
  try {
    if (props.entry) await updateWatch(props.entry.user_id, body())
    else {
      const uid = await userId()
      if (uid === null) return
      await createWatch({ user_id: uid, ...body() })
    }
    host.toast(t('watch.saved'), 'success')
    emit('update:open', false)
    emit('saved')
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(errs, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
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
      <SField :label="t('watch.col.expires')" :error="errs.expires_at || errs.days">
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
