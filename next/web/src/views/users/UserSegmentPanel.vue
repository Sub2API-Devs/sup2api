<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SButton, SField, SGrid, SHint, toast } from '@sub2api/ui'
import type { PersonalDialogUser, Segment } from '@/api/pricing'
import PersonalConvertDialog from '@/components/pricing/PersonalConvertDialog.vue'
import PersonalRemoveDialog from '@/components/pricing/PersonalRemoveDialog.vue'
import SegmentSelect from '@/components/pricing/SegmentSelect.vue'
import { rateText } from '@/components/pricing/pricingFormat'
import { useSegmentsLookup } from '@/components/pricing/segmentLookup'
import { moveToSegment } from '@/components/pricing/segmentMembers'
import { confirmAction } from '@/composables/crud'
import SegmentDiscountField from '@/views/segments/SegmentDiscountField.vue'
import { validDiscount } from '@/views/segments/segmentForm'

// The segment one user belongs to, and the ways out of it. In a named segment:
// move him to another one, or give him a personal one. In a personal segment:
// its discount (a draft the parent saves with the rest of the personal
// settings), or back to a named segment. Every move is made at once and
// reported with `changed`.
const props = defineProps<{ user: PersonalDialogUser; segment: Segment; editable?: boolean }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const discount = defineModel<string>('discount', { required: true })
const { t } = useI18n()
const { segments } = useSegmentsLookup()

/** The user as the personal-segment dialogs want him: in the segment he is in now, whatever the list row still says. */
const member = computed<PersonalDialogUser>(() => ({ ...props.user, segment: props.segment }))
const convertOpen = ref(false)
const removeOpen = ref(false)

// What the select shows: the segment he is in, or the one a move is being confirmed to.
const chosen = ref<number | null>(props.segment.id)
watch(
  () => props.segment.id,
  (id) => {
    chosen.value = id
  }
)

async function switchTo(id: number | null) {
  const to = segments.value.find((s) => s.id === id)
  if (!to || to.id === props.segment.id) return
  chosen.value = to.id
  const names = { name: props.user.email, from: props.segment.name, to: to.name }
  const moved = await confirmAction(
    { title: t('users.pricing.switchTitle'), message: t('users.pricing.switchConfirm', names), confirmText: t('users.pricing.switchSubmit') },
    () => moveToSegment(to.id, [props.user.id]),
    () => {
      toast(t('users.pricing.switched', names), 'success')
      emit('changed')
    }
  )
  // Declined or failed: back to where he is.
  if (!moved) chosen.value = props.segment.id
}
</script>

<template>
  <div class="space-y-3" data-testid="user-segment-panel" :data-kind="segment.kind">
    <template v-if="segment.kind === 'named'">
      <SGrid :cols="2">
        <SField :label="t('users.segment')" :hint="t('users.pricing.segmentHint')">
          <SegmentSelect :model-value="chosen" :disabled="!editable" data-testid="user-segment-switch" @update:model-value="switchTo" />
        </SField>
        <SField :label="t('users.pricing.discount')" :hint="t('users.pricing.discountOf', { segment: segment.name })">
          <span class="flex min-h-control items-center font-mono font-medium" data-testid="user-segment-discount">{{ rateText(segment.discount) }}</span>
        </SField>
      </SGrid>
      <div v-if="editable" class="flex flex-wrap items-center gap-3">
        <SButton icon="user" data-testid="user-convert" @click="convertOpen = true">{{ t('users.pricing.convert') }}</SButton>
        <SHint size="xs" class="min-w-0 flex-1 basis-64">{{ t('users.pricing.convertHint') }}</SHint>
      </div>
    </template>
    <template v-else>
      <SAlert tone="accent" icon="user" data-testid="user-personal-banner">
        {{ t('users.pricing.personal') }}
        <template v-if="segment.origin">{{ t('users.pricing.origin', { segment: segment.origin.name }) }}</template>
        <template v-if="editable" #actions>
          <SButton size="sm" data-testid="user-move-back" @click="removeOpen = true">{{ t('users.pricing.moveBack') }}</SButton>
        </template>
      </SAlert>
      <SegmentDiscountField v-model="discount" :error="validDiscount(discount.trim()) ? undefined : t('segments.discount.invalid')" :disabled="!editable" />
    </template>

    <PersonalConvertDialog v-model:open="convertOpen" :user="member" @done="emit('changed')" />
    <PersonalRemoveDialog v-model:open="removeOpen" :user="member" :origin="segment.origin" @done="emit('changed')" />
  </div>
</template>
