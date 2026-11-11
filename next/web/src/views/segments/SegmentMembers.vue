<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SField, SHint, SInput, SPagination, SRowAction, SStatusBadge, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import UserSearchSelect from '@/components/pricing/UserSearchSelect.vue'
import { useSegmentsLookup, type SegmentedUser } from '@/components/pricing/segmentLookup'
import { confirmAction } from '@/composables/crud'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'

// The members of a named segment. A user is in exactly one segment, so adding
// one here moves him out of where he was (his personal settings go with a
// personal segment), and removing one moves him to the default segment. Both
// happen at once: they are not part of the form the list sits in.
const props = defineProps<{ segment: Segment }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const { segments } = useSegmentsLookup()

const list = useList<SegmentedUser>(`/segments/${props.segment.id}/members`, { q: '' })
const canManage = computed(() => auth.has('segment:manage'))
// Finding a user to add is a search of the users list.
const canAdd = computed(() => canManage.value && auth.has('user:read'))
/** Where a removed member goes; the default segment keeps its members. */
const fallback = computed(() => segments.value.find((s) => s.is_default && s.id !== props.segment.id))

const columns = computed<TableColumn[]>(() => [
  { key: 'email', label: t('common.user'), mobile: 'title' },
  { key: 'status', label: t('common.status'), mobile: 'status' },
  ...(canManage.value && fallback.value ? [{ key: 'actions', label: t('common.actions'), align: 'right' } satisfies TableColumn] : [])
])
const rowAttrs = (u: SegmentedUser) => ({ 'data-testid': 'segment-member-row', 'data-user': u.id })

const moveTo = (to: Segment, u: SegmentedUser) => api.post(`/segments/${to.id}/members`, { user_ids: [u.id] })

function moved(message: string) {
  toast(message, 'success')
  list.reload()
  emit('changed')
}

/** Joining a segment deletes the settings of a personal one: ask first. */
function mayLeave(u: SegmentedUser): Promise<boolean> {
  if (u.segment?.kind !== 'personal') return Promise.resolve(true)
  return confirm({
    title: t('segments.members.add'),
    message: t('segments.members.dropPersonal', { name: u.email, segment: props.segment.name }),
    confirmText: t('segments.members.dropPersonalConfirm'),
    danger: true
  })
}

/** "Moved a from X to Y": a personal segment is named after its user, so it reads as what it is. */
function joinedText(u: SegmentedUser): string {
  const names = { name: u.email, to: props.segment.name }
  const from = u.segment?.kind === 'personal' ? t('pricing.segment.personal') : u.segment?.name
  return from ? t('segments.members.movedFrom', { ...names, from }) : t('segments.members.movedTo', names)
}

async function add(u: SegmentedUser) {
  if (u.segment?.id === props.segment.id) return toast(t('segments.members.already', { name: u.email }))
  if (!(await mayLeave(u))) return
  try {
    await moveTo(props.segment, u)
    moved(joinedText(u))
  } catch (e) {
    notifyError(e)
  }
}

function remove(u: SegmentedUser) {
  const to = fallback.value
  if (!to) return
  const names = { name: u.email, segment: props.segment.name, to: to.name }
  return confirmAction(
    { title: t('segments.members.remove'), message: t('segments.members.removeConfirm', names), confirmText: t('segments.members.remove'), danger: true },
    () => moveTo(to, u),
    () => moved(t('segments.members.movedTo', names))
  )
}
</script>

<template>
  <div class="space-y-4" data-testid="segment-members">
    <SAlert tone="info" dense>{{ t('segments.members.notice') }}</SAlert>
    <SField v-if="canAdd" :label="t('segments.members.add')" :hint="t('segments.members.addHint', { segment: segment.name })">
      <UserSearchSelect :placeholder="t('segments.members.addPlaceholder')" @select="add" />
    </SField>
    <div class="space-y-2">
      <SHint v-if="segment.is_default" size="xs" data-testid="segment-members-default">{{ t('segments.members.defaultHint') }}</SHint>
      <!-- Enter filters the list; it must not submit the surrounding form. -->
      <SInput v-model="list.filters.q" class="w-64" size="sm" icon="search" clearable :aria-label="t('segments.members.search')" :placeholder="t('segments.members.search')" data-testid="segment-member-search" @keydown.enter.prevent />
      <STable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" dense :empty-text="t('segments.members.empty')" :row-attrs="rowAttrs" @retry="list.reload">
        <template #cell-email="{ row }">
          <span class="font-medium text-fg">{{ row.email }}</span>
          <SHint v-if="row.display_name" size="xs">{{ row.display_name }}</SHint>
        </template>
        <template #cell-status="{ row }"><SStatusBadge :status="row.status" /></template>
        <template #cell-actions="{ row }">
          <SRowAction tone="danger" :label="t('segments.members.remove')" data-testid="segment-member-remove" @click="remove(row)" />
        </template>
      </STable>
      <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
    </div>
  </div>
</template>
