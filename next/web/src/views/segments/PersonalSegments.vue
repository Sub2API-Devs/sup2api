<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SDrawer, SField, SHint, SPagination, SRowAction, type TableColumn } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import PersonalConvertDialog from '@/components/pricing/PersonalConvertDialog.vue'
import PersonalRemoveDialog from '@/components/pricing/PersonalRemoveDialog.vue'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import UserSearchSelect from '@/components/pricing/UserSearchSelect.vue'
import type { PersonalDialogUser, SegmentedUser } from '@/components/pricing/segmentLookup'
import { useList } from '@/composables/useList'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import SegmentEditor from './SegmentEditor.vue'
import SegmentTable from './SegmentTable.vue'

// The users priced individually: each is the single member of a personal
// segment (GET /segments?kind=personal). From here a user gets one, its
// settings are edited, and a user is moved back to a named segment, which
// deletes it. `changed` says how many there are may have changed.
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
// Picking a user is a search of the users list.
const canPick = computed(() => canManage.value && auth.has('user:read'))

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

const picked = ref<SegmentedUser | null>(null)
const convertOpen = ref(false)

/** A user who has a personal segment already opens it; anyone else is asked how to start one. */
async function pick(u: SegmentedUser) {
  if (u.segment?.kind !== 'personal') {
    picked.value = u
    convertOpen.value = true
    return
  }
  try {
    edit(await api.get<Segment>(`/segments/${u.segment.id}`))
  } catch (e) {
    notifyError(e)
  }
}

function converted(s: Segment) {
  changed()
  edit(s)
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
      <SField v-if="canPick" :label="t('segments.personal.pick')" :hint="t('segments.personal.pickHint')">
        <UserSearchSelect @select="pick" />
      </SField>
      <SegmentTable
        :lead="lead"
        :rows="list.items.value"
        :actions="canManage"
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
            <SRowAction :label="t('segments.personal.edit')" data-testid="personal-edit" @click="edit(row)" />
            <SRowAction tone="danger" :label="t('segments.personal.remove')" data-testid="personal-remove" @click="askRemove(row)" />
          </div>
        </template>
      </SegmentTable>
      <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
    </div>
  </SDrawer>
  <SegmentEditor v-model:open="editorOpen" :segment="editing" @changed="changed" @remove="askRemove" />
  <PersonalConvertDialog v-model:open="convertOpen" :user="picked" @done="converted" />
  <PersonalRemoveDialog v-model:open="removeOpen" :user="userOf(removing)" :origin="removing?.origin" @done="removed" />
</template>
