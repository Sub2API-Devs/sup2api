<script setup lang="ts">
// Page label of the simple pager ("3 / 12"): opens a bottom sheet with a
// page number to jump to and, when `sizes` is not empty, the page size.
import { ref } from 'vue'
import { useUiT } from '../i18n'
import type { SelectOption } from '../types'
import SButton from '../SButton.vue'
import SDrawer from '../SDrawer.vue'
import SField from '../SField.vue'
import SInput from '../SInput.vue'
import SSegmented from '../SSegmented.vue'

const props = defineProps<{ page: number; pages: number; pageSize: number; sizes: SelectOption[] }>()
const emit = defineEmits<{ (e: 'go', page: number): void; (e: 'size', size: number): void }>()
const t = useUiT()
const open = ref(false)
const target = ref<number | null>(null)

function show() {
  target.value = props.page
  open.value = true
}
function jump() {
  const p = Math.trunc(Number(target.value))
  if (p >= 1) emit('go', Math.min(p, props.pages))
  open.value = false
}
function size(v: unknown) {
  emit('size', Number(v))
  open.value = false
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost h-10 px-3 tabular-nums"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-label="t('ui.pageOf', { n: page, total: pages })"
    data-testid="page-jump"
    @click="show"
  >
    {{ page }} / {{ pages }}
  </button>
  <SDrawer v-model:open="open" side="bottom" :title="t('ui.pagination')">
    <form class="flex items-end gap-2" @submit.prevent="jump">
      <SField :label="t('ui.goToPage')" class="flex-1">
        <SInput v-model="target" type="number" inputmode="numeric" :min="1" :max="pages" data-testid="page-jump-input" />
      </SField>
      <SButton type="submit" variant="primary" data-testid="page-jump-go">{{ t('ui.go') }}</SButton>
    </form>
    <SField v-if="sizes.length" :label="t('ui.pageSize')" class="mt-4">
      <SSegmented block :model-value="pageSize" :options="sizes" @update:model-value="size" />
    </SField>
  </SDrawer>
</template>
