<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SDrawer, SHint, SPagination, SRowAction, type TableColumn } from '@sub2api/ui'
import type { PersonalDialogUser, Segment, SegmentRef } from '@/api/pricing'
import PersonalRemoveDialog from '@/components/pricing/PersonalRemoveDialog.vue'
import PersonalSegmentPicker from '@/components/pricing/PersonalSegmentPicker.vue'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import SegmentEditor from './SegmentEditor.vue'
import SegmentTable from './SegmentTable.vue'

// The users priced individually: each is the single member of a personal
// segment (GET /segments?kind=personal). From here a user gets one, its
// settings are edited, and a user is moved back to a named segment, which
// deletes it; a caller who may not manage segments only looks at them.
// `changed` says how many there are may have changed.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()

const list = useList<Segment>('/segments', { kind: 'personal' }, { immediate: false })
watch(
  () => props.open,
  (v) => {
    if (v) list.reload()
  }
)
const canManage = computed(() => auth.has('segment:manage'))

const lead = computed<TableColumn[]>(() => [
  { key: 'user', label: t('common.user'), mobile: 'title' },
  { key: 'origin', label: t('segments.personal.origin'), mobile: 'meta' }
])

function changed() {
  list.reload()
  emit('changed')
}

/** The member of a personal segment, as the dialogs take a user. */
function userOf(s: Segment | null): PersonalDialogUser | null {
  return s?.user ? { ...s.user, segment: s } : null
}

// ------------------------------------------------------------------ edit

const editing = ref<Segment | null>(null)
const editorOpen = ref(false)

function edit(s: Segment) {
  editing.value = s
  editorOpen.value = true
}

// ------------------------------------------------------------------ price a user individually

/** Opens the personal segment of the user picked: the one he had, or the one just made for him. */
async function pick(segment: SegmentRef, created: boolean) {
  if (created) changed()
  try {
    edit(await api.get<Segment>(`/segments/${segment.id}`))
  } catch (e) {
    notifyError(e)
  }
}

// ------------------------------------------------------------------ move back

const removing = ref<Segment | null>(null)
const removeOpen = ref(false)

function askRemove(s: Segment) {
  removing.value = s
  removeOpen.value = true
}

function removed() {
  editorOpen.value = false
  changed()
}
</script>

<template>
  <SDrawer :open="open" :title="t('segments.personal.title')" :description="t('segments.personal.description')" width="xl" @update:open="emit('update:open', $event)">
    <div class="space-y-4" data-testid="personal-segments">
      <PersonalSegmentPicker :label="t('segments.personal.pick')" :hint="t('segments.personal.pickHint')" @select="pick" />
      <SegmentTable
        :lead="lead"
        :rows="list.items.value"
        actions
        :loading="list.loading.value"
        :error="list.error.value"
        :empty-text="t('segments.personal.empty')"
        dense
        @retry="list.reload"
      >
        <template #cell-user="{ row }">
          <span class="font-medium text-fg">{{ row.user?.email ?? row.name }}</span>
          <SHint v-if="row.user?.display_name" size="xs">{{ row.user.display_name }}</SHint>
        </template>
        <template #cell-origin="{ row }"><SegmentBadge :segment="row.origin" /></template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <SRowAction :label="t(canManage ? 'segments.personal.edit' : 'common.view')" data-testid="personal-edit" @click="edit(row)" />
            <SRowAction v-if="canManage" tone="danger" :label="t('segments.personal.remove')" data-testid="personal-remove" @click="askRemove(row)" />
          </div>
        </template>
      </SegmentTable>
      <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
    </div>
  </SDrawer>
  <SegmentEditor v-model:open="editorOpen" :segment="editing" :readonly="!canManage" @changed="changed" @remove="askRemove" />
  <PersonalRemoveDialog v-model:open="removeOpen" :user="userOf(removing)" :origin="removing?.origin" @done="removed" />
</template>
