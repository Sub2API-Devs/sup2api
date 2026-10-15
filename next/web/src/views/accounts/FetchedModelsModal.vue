<script setup lang="ts">
// Models fetched from the upstream (CONTRACTS §19): every one starts ticked;
// the ticked ones are merged into the account's list (`apply`).
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SButton, SCheckbox, SHint, SLink, SModal } from '@sub2api/ui'

const props = defineProps<{ models: string[]; skipped: number; /** The account's current list (marked "already listed"). */ existing: string[] }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ (e: 'apply', picked: string[]): void }>()
const { t } = useI18n()
const picked = ref<Record<string, boolean>>({})
const pickedModels = computed(() => props.models.filter((m) => picked.value[m]))

function setAll(v: boolean) {
  picked.value = Object.fromEntries(props.models.map((m) => [m, v]))
}
watch(() => props.models, () => setAll(true), { immediate: true })
</script>

<template>
  <SModal v-model:open="open" :title="t('accounts.fetchModelsTitle', { n: models.length })" width="md">
    <div class="mb-2 flex items-center justify-between text-xs">
      <SHint inline size="xs">
        {{ t('accounts.fetchPicked', { n: pickedModels.length, total: models.length }) }}
        <span v-if="skipped"> · {{ t('accounts.fetchSkipped', { n: skipped }) }}</span>
      </SHint>
      <span class="flex gap-2">
        <SLink as="button" @click="setAll(true)">{{ t('accounts.selectAll') }}</SLink>
        <SLink as="button" @click="setAll(false)">{{ t('accounts.selectNone') }}</SLink>
      </span>
    </div>
    <div class="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border border-line p-2" data-testid="fetched-models">
      <SCheckbox v-for="m in models" :key="m" v-model="picked[m]">
        <span class="inline-flex items-center gap-2">
          <span class="font-mono text-xs">{{ m }}</span>
          <SBadge v-if="existing.includes(m)" tone="gray" size="xs">{{ t('accounts.fetchAlready') }}</SBadge>
        </span>
      </SCheckbox>
    </div>
    <template #footer>
      <SButton @click="open = false">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :disabled="!pickedModels.length" @click="emit('apply', pickedModels)">{{ t('accounts.fetchApply') }}</SButton>
    </template>
  </SModal>
</template>
