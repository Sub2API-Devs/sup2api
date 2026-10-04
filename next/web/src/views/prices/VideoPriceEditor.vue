<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SButton, SField, SGrid, SHint, SInput } from '@sub2api/ui'
import { emptyVideoRate, type VideoPrice } from './videoPrice'
const model = defineModel<VideoPrice>({ required: true })
defineProps<{ disabled?: boolean }>()
const { t } = useI18n()
const fields = ['price_per_million_tokens', 'video_input_price_per_million_tokens', 'video_price_per_second'] as const
</script>

<template>
  <div class="space-y-4">
    <SHint>{{ t('prices.video.hint') }}</SHint>
    <SGrid :cols="3" :gap="3">
      <SField v-for="key in fields" :key="key" :label="t(`prices.video.${key}`)">
        <SInput v-model.number="model[key]" type="number" min="0" step="any" :disabled="disabled" />
      </SField>
    </SGrid>
    <SHint>{{ t('prices.video.overridesHint') }}</SHint>
    <div v-for="(row, index) in model.resolution_prices" :key="index" class="space-y-3 rounded-lg border p-3">
      <SField :label="t('prices.video.sizes')">
        <SInput :model-value="row.sizes.join(', ')" :disabled="disabled" placeholder="1920x1080, 1600x900"
          @update:model-value="row.sizes = String($event ?? '').split(',').map(s => s.trim()).filter(Boolean)" />
      </SField>
      <SGrid :cols="3" :gap="3">
        <SField v-for="key in fields" :key="key" :label="t(`prices.video.${key}`)">
          <SInput v-model.number="row[key]" type="number" min="0" step="any" :disabled="disabled" />
        </SField>
      </SGrid>
      <SButton :disabled="disabled" @click="model.resolution_prices.splice(index, 1)">{{ t('prices.video.remove') }}</SButton>
    </div>
    <SButton :disabled="disabled" @click="model.resolution_prices.push({ ...emptyVideoRate(), sizes: [] })">{{ t('prices.video.add') }}</SButton>
  </div>
</template>
