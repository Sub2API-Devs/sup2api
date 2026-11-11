<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SEmpty, SField, SFormModal, SGrid, SHint, SInput, STabs, STextarea, toast, type TabItem } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { notifyError } from '@/utils/errors'
import { applyFormError } from '@/utils/formErrors'
import SegmentDiscountField from './SegmentDiscountField.vue'
import SegmentGroupsEditor from './SegmentGroupsEditor.vue'
import SegmentMembers from './SegmentMembers.vue'
import { formChanged, formOf, segmentBody, validDiscount } from './segmentForm'

// Creates or edits a segment. A named one has three tabs: what it is, what it
// gets in every group, and who is in it. A personal one (the segment of a
// single user) has no name and no members to edit: its discount sits above
// its groups, and `remove` asks the opener to move the user back to a named
// segment. Saving sends the form first and the groups' drafts after it; the
// members tab acts at once. `changed` says the opener's list is out of date.
export type SegmentEditorTab = 'basic' | 'groups' | 'members'
const props = defineProps<{ open: boolean; segment: Segment | null; tab?: SegmentEditorTab }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'changed'): void; (e: 'remove', segment: Segment): void }>()
const { t } = useI18n()

/** The segment being edited: the opener's, or the one just created here. */
const current = ref<Segment | null>(null)
const form = reactive(formOf(null))
const errors = ref<Record<string, string>>({})
/** The tab in front; `tab` is the one the opener asks for. */
const shown = ref<SegmentEditorTab>('basic')
const saving = ref(false)
const groupsEditor = ref<InstanceType<typeof SegmentGroupsEditor>>()

const personal = computed(() => current.value?.kind === 'personal')

function show(segment: Segment | null, at: SegmentEditorTab = 'basic') {
  current.value = segment
  Object.assign(form, formOf(segment))
  errors.value = {}
  shown.value = at
}
watch(
  () => props.open,
  (v) => {
    if (v) show(props.segment, props.tab)
  },
  { immediate: true }
)

const title = computed(() => (current.value ? t('segments.editTitle', { name: current.value.name }) : t('segments.create')))
/** A dot on the tabs with something to save. */
const unsaved = (dirty: boolean | undefined) => (dirty ? '•' : undefined)
const tabs = computed<TabItem[]>(() => {
  const groups: TabItem = { key: 'groups', label: t('segments.tabs.groups'), badge: unsaved(groupsEditor.value?.dirty) }
  if (personal.value) return [groups]
  return [{ key: 'basic', label: t('segments.tabs.basic'), badge: unsaved(!!current.value && formChanged(form, current.value)) }, groups, { key: 'members', label: t('segments.tabs.members') }]
})

// ------------------------------------------------------------------ saving

function validate(): boolean {
  errors.value = {}
  if (!personal.value && !form.name.trim()) errors.value.name = t('common.required')
  if (!validDiscount(form.discount.trim())) errors.value.discount = t('segments.discount.invalid')
  return !Object.keys(errors.value).length
}

/** Sends the form. False when it was refused: the errors are next to the fields. */
async function saveForm(): Promise<boolean> {
  const body = segmentBody(form, personal.value)
  try {
    const saved = current.value ? await api.patch<Segment>(`/segments/${current.value.id}`, body) : await api.post<Segment>('/segments', body)
    current.value = saved
    Object.assign(form, formOf(saved))
    return true
  } catch (e) {
    applyFormError(e, errors)
    return false
  }
}

/** Saves the drafts of the groups tab. False when one cannot be saved, or the request failed. */
async function saveGroups(): Promise<boolean> {
  try {
    return (await groupsEditor.value?.save()) ?? true
  } catch (e) {
    notifyError(e)
    return false
  }
}

/** Saves the form, then the groups. The tab that could not be saved, if any. */
async function save(): Promise<SegmentEditorTab | null> {
  if (!validate() || !(await saveForm())) return 'basic'
  const groupsSaved = await saveGroups()
  emit('changed')
  return groupsSaved ? null : 'groups'
}

async function submit() {
  const creating = !current.value
  saving.value = true
  const failedAt = await save()
  saving.value = false
  if (failedAt) shown.value = failedAt
  else if (creating) created()
  else updated()
}

/** A new segment stays open on its groups: they and its members can be set now. */
function created() {
  toast(t('segments.created'), 'success')
  shown.value = 'groups'
}

function updated() {
  toast(t('common.updated'), 'success')
  emit('update:open', false)
}
</script>

<template>
  <SFormModal
    :open="open"
    :title="title"
    width="2xl"
    fixed
    :loading="saving"
    :submit-text="current ? t('common.save') : t('common.create')"
    :submit-attrs="{ 'data-testid': 'segment-editor-submit' }"
    :enter-submit="false"
    data-testid="segment-editor"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <template v-if="personal && current" #header>
      <h3 class="flex min-w-0 items-center gap-2 text-base font-semibold text-fg" data-testid="segment-editor-personal">
        <span class="truncate">{{ current.name }}</span>
        <SegmentBadge :segment="current" class="shrink-0" />
      </h3>
    </template>
    <SAlert v-if="personal && current" tone="accent" icon="user" data-testid="segment-editor-notice">
      {{ current.origin ? t('segments.personal.noticeOrigin', { origin: current.origin.name }) : t('segments.personal.notice') }}
      <template #actions>
        <SButton size="sm" data-testid="segment-editor-remove" @click="emit('remove', current)">{{ t('segments.personal.remove') }}</SButton>
      </template>
    </SAlert>
    <STabs v-model="shown" :tabs="tabs" :aria-label="title">
      <template #default="{ active }">
        <div v-show="active === 'basic'" class="space-y-4">
          <SGrid>
            <SField :label="t('common.name')" required :hint="current?.is_default ? t('segments.defaultName') : undefined" :error="errors.name">
              <SInput v-model="form.name" :disabled="current?.is_default" data-testid="segment-name" />
            </SField>
            <SegmentDiscountField v-if="!personal" v-model="form.discount" :error="errors.discount" />
          </SGrid>
          <SField :label="t('segments.note')" :error="errors.description">
            <STextarea v-model="form.description" :rows="2" data-testid="segment-description" />
          </SField>
        </div>
        <div v-show="active === 'groups'" class="space-y-4">
          <SegmentDiscountField v-if="personal" v-model="form.discount" :error="errors.discount" />
          <SHint v-if="current && !personal" size="xs">{{ t('segments.groups.hint', { name: current.name }) }}</SHint>
          <SegmentGroupsEditor ref="groupsEditor" :segment-id="current?.id ?? null" :discount="form.discount.trim()" editable />
        </div>
        <template v-if="active === 'members'">
          <SegmentMembers v-if="current" :segment="current" @changed="emit('changed')" />
          <SEmpty v-else size="sm" icon="user" :text="t('segments.members.emptyNew')" data-testid="segment-members-empty" />
        </template>
      </template>
    </STabs>
  </SFormModal>
</template>
