<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SEmpty, SField, SFormModal, SGrid, SHint, SInput, STabs, STextarea, toast, type TabItem } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'
import { canListMembers } from '@/components/pricing/segmentMembers'
import { confirmDiscard } from '@/composables/confirmDiscard'
import { markUnsaved, useTabbedSave, type SaveStep } from '@/composables/useTabbedSave'
import { applyFormError } from '@/utils/formErrors'
import SegmentDiscountField from '@/components/pricing/SegmentDiscountField.vue'
import SegmentGroupsEditor from '@/components/pricing/SegmentGroupsEditor.vue'
import SegmentMembers from './SegmentMembers.vue'
import { formChanged, formOf, segmentBody, validDiscount } from '@/components/pricing/segmentForm'

// Creates or edits a segment. A named one has three tabs: what it is, what it
// gets in every group, and who is in it (for a caller who may list its
// members: they are users). A personal one (the segment of a
// single user) has no name and no members to edit: its discount sits above
// its groups, and `remove` asks the opener to move the user back to a named
// segment. Saving sends the form first and the groups' drafts after it; the
// members tab acts at once, and so do the model prices of a group. `changed`
// says the opener's list is out of date. Closing with something not saved
// asks first. `readonly` only shows the segment, to a caller who may not
// change it.
const TABS = ['basic', 'groups', 'members'] as const
export type SegmentEditorTab = (typeof TABS)[number]
const props = defineProps<{ open: boolean; segment: Segment | null; tab?: SegmentEditorTab; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'changed'): void; (e: 'remove', segment: Segment): void }>()
const { t } = useI18n()

/** The segment being edited: the opener's, or the one just created here. */
const current = ref<Segment | null>(null)
const form = reactive(formOf(null))
const errors = ref<Record<string, string>>({})
/** The tab in front; `tab` is the one the opener asks for. */
const shown = ref<SegmentEditorTab>('basic')
const groupsEditor = ref<InstanceType<typeof SegmentGroupsEditor>>()

const personal = computed(() => current.value?.kind === 'personal')
/** The tab the form's fields are on: a personal segment has only its discount, above its groups. */
const formTab = computed<SegmentEditorTab>(() => (personal.value ? 'groups' : 'basic'))
const showsMembers = canListMembers()
/** The tabs of the segment shown. */
const tabKeys = computed<SegmentEditorTab[]>(() => {
  if (personal.value) return [formTab.value]
  return TABS.filter((key) => key !== 'members' || showsMembers)
})

function show(segment: Segment | null, at: SegmentEditorTab = 'basic') {
  current.value = segment
  Object.assign(form, formOf(segment))
  errors.value = {}
  shown.value = tabKeys.value.includes(at) ? at : tabKeys.value[0]
}
watch(
  () => props.open,
  (v) => {
    if (v) show(props.segment, props.tab)
  },
  { immediate: true }
)

const title = computed(() => {
  if (!current.value) return t('segments.create')
  return t(props.readonly ? 'segments.viewTitle' : 'segments.editTitle', { name: current.value.name })
})
const formDirty = computed(() => !!current.value && formChanged(form, current.value))
const unsaved = (key: string) => (key === formTab.value && formDirty.value) || (key === 'groups' && groupsEditor.value?.dirty)
const tabs = computed<TabItem[]>(() => markUnsaved(tabKeys.value.map((key) => ({ key, label: t(`segments.tabs.${key}`) })), unsaved))

/** Leaves without saving: what was typed for a new segment counts as much as a change to a saved one. */
const leave = async () => (await confirmDiscard(formChanged(form, current.value) || groupsEditor.value?.dirty)) && emit('update:open', false)

// ------------------------------------------------------------------ saving

const { saving, run } = useTabbedSave(shown)
/** The fields hold still while they are saved: the answer replaces what they show. */
const locked = computed(() => props.readonly || saving.value)
/** The form was saved by the current attempt, whatever happens to the groups after it. */
let formSaved = false

function validate(): boolean {
  errors.value = {}
  if (!personal.value && !form.name.trim()) errors.value.name = t('common.required')
  if (!validDiscount(form.discount.trim())) errors.value.discount = t('segments.discount.invalid')
  return !Object.keys(errors.value).length
}

/** Checks and sends the form. False when it was refused: the errors are next to the fields. */
async function saveForm(): Promise<boolean> {
  if (!validate()) return false
  const body = segmentBody(form, personal.value)
  try {
    const saved = current.value ? await api.patch<Segment>(`/segments/${current.value.id}`, body) : await api.post<Segment>('/segments', body)
    current.value = saved
    Object.assign(form, formOf(saved))
  } catch (e) {
    applyFormError(e, errors)
    return false
  }
  formSaved = true
  return true
}

/** What Save does, in order: the groups' rates are answered under the discount the form has just saved. */
const steps: SaveStep<SegmentEditorTab>[] = [
  { tab: () => formTab.value, save: saveForm },
  { tab: 'groups', save: async () => (await groupsEditor.value?.save()) ?? true }
]

async function submit() {
  const creating = !current.value
  formSaved = false
  const done = await run(steps)
  if (formSaved) emit('changed')
  if (!done) return
  if (creating) created()
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
    :loading="saving"
    :submit-text="current ? t('common.save') : t('common.create')"
    :submit-attrs="{ 'data-testid': 'segment-editor-submit' }"
    :enter-submit="false"
    data-testid="segment-editor"
    @update:open="leave"
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
      <template v-if="!readonly" #actions>
        <SButton size="sm" data-testid="segment-editor-remove" @click="emit('remove', current)">{{ t('segments.personal.remove') }}</SButton>
      </template>
    </SAlert>
    <STabs v-model="shown" :tabs="tabs" :aria-label="title">
      <template #default="{ active }">
        <!-- The least height keeps the dialog from collapsing on a short tab. -->
        <div class="min-h-[20rem]">
          <div v-show="active === 'basic'" class="space-y-4">
            <SGrid>
              <SField :label="t('common.name')" required :hint="current?.is_default ? t('segments.defaultName') : undefined" :error="errors.name">
                <SInput v-model="form.name" :disabled="locked || current?.is_default" data-testid="segment-name" />
              </SField>
              <SegmentDiscountField v-if="!personal" v-model="form.discount" :error="errors.discount" :disabled="locked" />
            </SGrid>
            <SField :label="t('segments.note')" :error="errors.description">
              <STextarea v-model="form.description" :rows="2" :disabled="locked" data-testid="segment-description" />
            </SField>
          </div>
          <div v-show="active === 'groups'" class="space-y-4">
            <SegmentDiscountField v-if="personal" v-model="form.discount" :error="errors.discount" :disabled="locked" />
            <SHint v-if="current && !personal && !readonly" size="xs">{{ t('segments.groups.hint', { name: current.name }) }}</SHint>
            <SegmentGroupsEditor ref="groupsEditor" :segment-id="current?.id ?? null" :discount="form.discount.trim()" :editable="!readonly" :disabled="saving" @changed="emit('changed')" />
          </div>
          <template v-if="active === 'members'">
            <SegmentMembers v-if="current" :segment="current" @changed="emit('changed')" />
            <SEmpty v-else size="sm" icon="user" :text="t('segments.members.emptyNew')" data-testid="segment-members-empty" />
          </template>
        </div>
      </template>
    </STabs>
    <template v-if="readonly" #footer>
      <SButton variant="primary" data-testid="segment-editor-close" @click="emit('update:open', false)">{{ t('common.close') }}</SButton>
    </template>
  </SFormModal>
</template>
