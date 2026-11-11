<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SEmpty, SField, SHint, SModal, SSelect, type SelectOption } from '@sub2api/ui'
import type { SegmentRef } from '@/api/pricing'
import ModelPriceTable from '@/components/pricing/ModelPriceTable.vue'
import { rateText } from '@/components/pricing/pricingFormat'
import { notifyError } from '@/utils/errors'
import PersonalSegmentPicker from './PersonalSegmentPicker.vue'
import type { SegmentView } from './segmentDrafts'

// The model prices of a group: the group's own, which everyone pays, or those
// of one user group in it. `segments` are the rows of the user groups editor
// beside it, so the choice and the rate shown follow what is being edited
// there; a user picked here joins those rows through `include`. The table
// holds the drafts of one target at a time: changing the target asks first
// when there are any.
const props = defineProps<{ groupId: number | null; segments: SegmentView[]; defaultRate: string; editable?: boolean }>()
const emit = defineEmits<{ (e: 'include', segment: SegmentRef): void }>()
const { t } = useI18n()

const table = ref<InstanceType<typeof ModelPriceTable>>()
/** Whose prices the table edits; null = the group's own. */
const segment = ref<SegmentRef | null>(null)
/** The target asked for while the table has drafts: the dialog decides. */
const pending = ref<{ segment: SegmentRef | null } | null>(null)
const saving = ref(false)

const view = computed(() => props.segments.find((s) => s.id === segment.value?.id))
const dirty = computed(() => !!table.value?.dirty)

const optionOf = (s: SegmentView): SelectOption => ({ value: s.id, label: s.accessible ? s.segment.name : t('groups.pricing.notGrantedOption', { name: s.segment.name }) })
const kindOptions = (kind: SegmentRef['kind']) => props.segments.filter((s) => s.segment.kind === kind).map(optionOf)
const targets = computed<SelectOption[]>(() => {
  const groups: SelectOption[] = [
    { value: 'named', label: t('groups.pricing.namedTargets'), options: kindOptions('named') },
    { value: 'personal', label: t('pricing.segment.personal'), options: kindOptions('personal') }
  ]
  return [{ value: null, label: t('groups.pricing.groupTarget') }, ...groups.filter((g) => g.options?.length)]
})

/** Changes whose prices are edited; with drafts in the table the dialog asks first. */
function select(next: SegmentRef | null) {
  if ((next?.id ?? null) === (segment.value?.id ?? null)) return
  if (dirty.value) pending.value = { segment: next }
  else segment.value = next
}
const selectId = (id: SelectOption['value']) => select(props.segments.find((s) => s.id === id)?.segment ?? null)

function pick(picked: SegmentRef) {
  emit('include', picked)
  select(picked)
}

/** Answers the dialog: saves the drafts first, or lets the reload of the new target drop them. A save that fails keeps the target. */
async function settle(keep: boolean) {
  const next = pending.value
  if (!next) return
  const done = !keep || (await save().catch(failed))
  pending.value = null
  if (done) segment.value = next.segment
}
function failed(e: unknown) {
  notifyError(e)
  return false
}

function load() {
  segment.value = null
  pending.value = null
  return table.value?.load()
}

/** Saves the drafts of the current target. False when one cannot be saved yet (the table says which). */
async function save(): Promise<boolean> {
  saving.value = true
  try {
    return (await table.value?.save()) ?? true
  } finally {
    saving.value = false
  }
}

defineExpose({ load, save, dirty, select })
</script>

<template>
  <SEmpty v-if="groupId === null" size="sm" icon="price" :text="t('groups.pricing.emptyNew')" data-testid="group-pricing-empty" />
  <div v-else class="space-y-3" data-testid="group-pricing">
    <div class="flex flex-wrap items-end gap-3">
      <SField :label="t('groups.pricing.target')" class="w-72 max-w-full">
        <SSelect :model-value="segment?.id ?? null" :options="targets" searchable data-testid="group-pricing-target" @update:model-value="selectId" />
      </SField>
      <PersonalSegmentPicker class="w-72 max-w-full" :label="t('groups.pickUser')" :disabled="!editable" @select="pick" />
    </div>
    <SHint v-if="!segment" size="xs" data-testid="group-pricing-scope">{{ t('groups.pricing.groupScope', { rate: rateText(defaultRate) }) }}</SHint>
    <SAlert v-else :tone="segment.kind === 'personal' ? 'accent' : 'info'" :icon="segment.kind === 'personal' ? 'user' : undefined" dense data-testid="group-pricing-scope">
      {{ t('groups.pricing.segmentScope', { name: segment.name }) }}
      <template v-if="view">{{ view.accessible ? t('groups.pricing.segmentRate', { rate: rateText(view.rate) }) : t('groups.pricing.segmentNotGranted') }}</template>
    </SAlert>
    <ModelPriceTable ref="table" :group-id="groupId" :segment="segment" :editable="editable" />

    <SModal :open="!!pending" :title="t('groups.pricing.unsavedTitle')" width="sm" top :closable="!saving" :persistent="saving" @update:open="pending = null">
      <p class="text-sm text-fg-muted" data-testid="group-pricing-unsaved">{{ t('groups.pricing.unsavedText') }}</p>
      <template #footer>
        <SButton :disabled="saving" data-testid="group-pricing-unsaved-stay" @click="pending = null">{{ t('groups.pricing.unsavedStay') }}</SButton>
        <SButton variant="danger" :disabled="saving" data-testid="group-pricing-unsaved-discard" @click="settle(false)">{{ t('groups.pricing.unsavedDiscard') }}</SButton>
        <SButton variant="primary" :loading="saving" data-testid="group-pricing-unsaved-save" @click="settle(true)">{{ t('groups.pricing.unsavedSave') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
