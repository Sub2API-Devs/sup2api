<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SChoiceCards, SFormModal, toast, type ChoiceOption } from '@sub2api/ui'
import type { Segment } from '@/api/pricing'
import { notifyError } from '@/utils/errors'
import type { PersonalDialogUser } from './segmentLookup'

// Gives a user a personal segment (POST /users/:id/personal-segment): he
// leaves his segment for one of his own, which starts as a copy of that
// segment's settings or empty. `done` carries the new segment.
const props = defineProps<{ open: boolean; user: PersonalDialogUser | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'done', segment: Segment): void }>()
const { t } = useI18n()

const copy = ref(true)
const busy = ref(false)
watch(
  () => props.open,
  (v) => {
    if (v) copy.value = true
  }
)

const from = computed(() => props.user?.segment?.name || t('pricingTools.convert.currentSegment'))
const choices = computed<ChoiceOption[]>(() => [
  { value: true, icon: 'copy', label: t('pricingTools.convert.copy', { from: from.value }), description: t('pricingTools.convert.copyHint') },
  { value: false, icon: 'plus', label: t('pricingTools.convert.blank'), description: t('pricingTools.convert.blankHint') }
])

async function submit() {
  const user = props.user
  if (!user) return
  busy.value = true
  try {
    const segment = await api.post<Segment>(`/users/${user.id}/personal-segment`, { copy: copy.value })
    toast(t('pricingTools.convert.done', { name: user.email }), 'success')
    emit('done', segment)
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
    :title="t('pricingTools.convert.title', { name: user?.email || '' })"
    :loading="busy"
    :submit-text="t('pricingTools.convert.submit')"
    :submit-attrs="{ 'data-testid': 'personal-convert-submit' }"
    :enter-submit="false"
    data-testid="personal-convert-dialog"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <SAlert tone="accent" icon="user">{{ t('pricingTools.convert.intro', { from }) }}</SAlert>
    <SChoiceCards :model-value="copy" :cols="1" :options="choices" :aria-label="t('pricingTools.convert.startFrom')" data-testid="personal-convert-start" @update:model-value="copy = $event === true" />
  </SFormModal>
</template>
