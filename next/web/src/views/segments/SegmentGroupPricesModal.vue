<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SHint, SModal, toast } from '@sub2api/ui'
import type { SegmentGroupSetting } from '@/api/pricing'
import ModelPriceTable from '@/components/pricing/ModelPriceTable.vue'
import { rateText } from '@/components/pricing/pricingFormat'
import { confirmDiscard } from '@/composables/confirmDiscard'
import { notifyError } from '@/utils/errors'

// The model prices of a segment in one group (ModelPriceTable), opened from
// the segment's row of that group. It saves on its own, apart from the form
// the row sits in; `saved` tells the opener to count the rules again. Closing
// it with rules not saved asks first.
defineProps<{ open: boolean; setting: SegmentGroupSetting | null; editable?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const { t } = useI18n()

const table = ref<InstanceType<typeof ModelPriceTable>>()
const saving = ref(false)

const close = () => emit('update:open', false)
/** Cancel, ×, Escape and the backdrop: every way out but Save. */
const leave = async () => (await confirmDiscard(table.value?.dirty)) && close()

async function save() {
  if (!table.value?.dirty) return close()
  saving.value = true
  try {
    // False: a rule is not filled in yet, and the table says which.
    if (!(await table.value.save())) return
    toast(t('common.saved'), 'success')
    emit('saved')
    close()
  } catch (e) {
    notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SModal
    :open="open"
    :title="setting ? t('segments.prices.title', { segment: setting.segment.name, group: setting.group.name }) : ''"
    width="2xl"
    :persistent="saving"
    :closable="!saving"
    @update:open="leave"
  >
    <div v-if="setting" class="space-y-3" data-testid="segment-prices">
      <SHint size="xs">{{ t(editable ? 'segments.prices.hint' : 'segments.prices.readonlyHint', { rate: rateText(setting.rate.value) }) }}</SHint>
      <ModelPriceTable ref="table" :group-id="setting.group.id" :segment="setting.segment" :editable="editable" />
    </div>
    <template #footer>
      <SButton v-if="!editable" variant="primary" data-testid="segment-prices-close" @click="close">{{ t('common.close') }}</SButton>
      <template v-else>
        <SButton :disabled="saving" data-testid="segment-prices-cancel" @click="leave">{{ t('common.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" data-testid="segment-prices-save" @click="save">{{ t('common.save') }}</SButton>
      </template>
    </template>
  </SModal>
</template>
