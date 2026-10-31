<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SField, SHint, SInput, SModal, STextarea } from '@sub2api/ui'
import { canManage, createWatch, deleteWatch, errorMessage, updateWatch, useModHost, type Watch, type WatchLevel } from '../host'
import { userName } from '../directory'

// Watch list actions for one user (new-api watch-level-actions.tsx), used by
// the record detail and the watch list detail: not on the list → add as
// observe or enforce; on the list → upgrade or downgrade, remove. Level
// changes take an optional reason that goes to the watch history.
const props = defineProps<{ userId: number; watch: Watch | null | undefined; staff?: boolean; exempt?: boolean }>()
const emit = defineEmits<{ (e: 'changed', w: Watch | null): void }>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

type Mode = { kind: 'add'; level: WatchLevel } | { kind: 'level'; level: WatchLevel }
const mode = ref<Mode | null>(null)
const form = reactive({ days: 30 as number | string | null, reason: '' })
const err = reactive<Record<string, string>>({})
const busy = ref(false)

function open(m: Mode) {
  mode.value = m
  // An enforce entry has no expiry by default (new-api: block level never expires on its own).
  Object.assign(form, { days: m.level === 'enforce' ? 0 : 30, reason: '' })
  for (const k of Object.keys(err)) delete err[k]
}

const title = computed(() => {
  const m = mode.value
  if (!m) return ''
  const name = userName(props.userId)
  if (m.kind === 'add') return t(m.level === 'enforce' ? 'pagesP3.watchAct.addEnforceTitle' : 'pagesP3.watchAct.addTitle', { name })
  return t(m.level === 'enforce' ? 'pagesP3.watchAct.upgradeTitle' : 'pagesP3.watchAct.downgradeTitle', { name })
})
const desc = computed(() => (mode.value?.level === 'enforce' ? t('pagesP3.watchAct.enforceDesc') : t('pagesP3.watchAct.observeDesc')))

async function submit() {
  const m = mode.value
  if (!m) return
  for (const k of Object.keys(err)) delete err[k]
  const reason = form.reason.trim() || undefined
  busy.value = true
  try {
    let w: Watch
    if (m.kind === 'add') {
      const days = form.days === null || String(form.days).trim() === '' ? 0 : Number(form.days)
      w = await createWatch({ user_id: props.userId, level: m.level, days, reason })
    } else {
      w = await updateWatch(props.userId, { level: m.level, reason })
    }
    host.toast(t('watch.saved'), 'success')
    mode.value = null
    emit('changed', w)
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(err, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    busy.value = false
  }
}

async function remove() {
  const ok = await host.confirm({ title: t('pagesP3.watchAct.removeTitle', { name: userName(props.userId) }), message: t('pagesP3.watchAct.removeDesc'), confirmText: t('watch.remove'), danger: true })
  if (!ok) return
  busy.value = true
  try {
    await deleteWatch(props.userId)
    host.toast(t('watch.removed', { id: props.userId }), 'success')
    emit('changed', null)
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SHint v-if="staff" inline size="xs">{{ t('pagesP3.user.staff') }}</SHint>
  <SHint v-else-if="exempt" inline size="xs">{{ t('pagesP3.user.exempt') }}</SHint>
  <span v-else-if="manage" class="mod-pg-actions">
    <template v-if="!watch">
      <SButton size="sm" :loading="busy" @click="open({ kind: 'add', level: 'observe' })">{{ t('pagesP3.watchAct.add') }}</SButton>
      <SButton size="sm" :loading="busy" @click="open({ kind: 'add', level: 'enforce' })">{{ t('pagesP3.watchAct.addEnforce') }}</SButton>
    </template>
    <template v-else>
      <SButton v-if="watch.level === 'observe'" size="sm" :loading="busy" @click="open({ kind: 'level', level: 'enforce' })">{{ t('pagesP3.watchAct.upgrade') }}</SButton>
      <SButton v-else size="sm" :loading="busy" @click="open({ kind: 'level', level: 'observe' })">{{ t('pagesP3.watchAct.downgrade') }}</SButton>
      <SButton size="sm" variant="danger" :loading="busy" @click="remove">{{ t('pagesP3.watchAct.remove') }}</SButton>
    </template>
  </span>

  <SModal :open="!!mode" :title="title" width="md" @update:open="!$event && (mode = null)">
    <form class="mod-form" @submit.prevent="submit">
      <SHint size="xs">{{ desc }}</SHint>
      <SField v-if="mode?.kind === 'add'" :label="t('watch.days')" :hint="t('watch.daysHint')" :error="err.days">
        <SInput v-model="form.days" type="number" min="0" max="3650" step="1" />
      </SField>
      <SField :label="t('pagesP3.watchAct.reason')" :error="err.reason || err.user_id || err.level">
        <STextarea v-model="form.reason" :rows="2" :maxlength="255" :placeholder="t('pagesP3.watchAct.reasonPh')" />
      </SField>
    </form>
    <template #footer>
      <SButton @click="mode = null">{{ host.i18n.t('ui.cancel') }}</SButton>
      <SButton :variant="mode?.level === 'enforce' ? 'danger' : 'primary'" :loading="busy" @click="submit">{{ t('save') }}</SButton>
    </template>
  </SModal>
</template>

<style scoped>
.mod-pg-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
