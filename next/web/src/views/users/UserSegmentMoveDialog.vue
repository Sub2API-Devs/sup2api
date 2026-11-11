<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SField, SFormModal, SHint, toast } from '@sub2api/ui'
import SegmentSelect from '@/components/pricing/SegmentSelect.vue'
import { useSegmentsLookup, type SegmentedUser } from '@/components/pricing/segmentLookup'
import { notifyError } from '@/utils/errors'
import { moveImpact, moveToSegment } from './userSegments'

// Moves the selected users to one named segment (POST /segments/:id/members).
// It says what the move changes before it is made: who moves, and who loses
// a personal segment by it.
const props = defineProps<{ open: boolean; users: SegmentedUser[] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'done'): void }>()
const { t } = useI18n()
const { segments } = useSegmentsLookup()

const target = ref<number | null>(null)
const busy = ref(false)
watch(
  () => props.open,
  (v) => {
    if (v) target.value = null
  }
)

const to = computed(() => segments.value.find((s) => s.id === target.value))
const impact = computed(() => moveImpact(props.users, target.value))
const staying = computed(() => props.users.length - impact.value.ids.length)

async function submit() {
  const segment = to.value
  if (!segment) return
  busy.value = true
  try {
    const { moved } = await moveToSegment(segment.id, impact.value.ids)
    toast(t('users.move.done', { n: moved, segment: segment.name }, moved), 'success')
    emit('done')
    emit('update:open', false)
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SFormModal
    :open="open"
    :title="t('users.move.title', { n: users.length }, users.length)"
    :loading="busy"
    :submit-text="t('users.move.submit')"
    :submit-disabled="!to || !impact.ids.length"
    :submit-attrs="{ 'data-testid': 'user-move-submit' }"
    :enter-submit="false"
    data-testid="user-move-dialog"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <SField :label="t('users.move.target')">
      <SegmentSelect v-model="target" data-testid="user-move-target" />
    </SField>
    <SHint v-if="to" data-testid="user-move-impact">
      <template v-if="impact.ids.length">{{ t('users.move.impact', { n: impact.ids.length, segment: to.name }, impact.ids.length) }}</template>
      <template v-if="staying">{{ t('users.move.staying', { n: staying, segment: to.name }, staying) }}</template>
    </SHint>
    <SAlert v-if="impact.personal" tone="warning" data-testid="user-move-personal">{{ t('users.move.personal', { n: impact.personal }, impact.personal) }}</SAlert>
  </SFormModal>
</template>
