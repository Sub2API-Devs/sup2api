<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ modelValue: string[] | null | undefined; placeholder?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>()
const { t } = useI18n()
const draft = ref('')

function add() {
  const v = draft.value.trim()
  if (!v) return
  const list = [...(props.modelValue || [])]
  for (const part of v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)) {
    if (!list.includes(part)) list.push(part)
  }
  emit('update:modelValue', list)
  draft.value = ''
}

function remove(i: number) {
  const list = [...(props.modelValue || [])]
  list.splice(i, 1)
  emit('update:modelValue', list)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add()
  } else if (e.key === 'Backspace' && !draft.value && props.modelValue?.length) {
    remove(props.modelValue.length - 1)
  }
}
</script>

<template>
  <div
    class="input flex min-h-[42px] flex-wrap items-center gap-1.5 !py-1.5"
    :class="disabled ? 'pointer-events-none opacity-60' : ''"
  >
    <span
      v-for="(tag, i) in modelValue || []"
      :key="tag"
      class="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
    >
      {{ tag }}
      <button type="button" class="opacity-60 hover:opacity-100" @click="remove(i)">×</button>
    </span>
    <input
      v-model="draft"
      class="min-w-[8rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
      :placeholder="placeholder || t('ui.addTag')"
      :disabled="disabled"
      @keydown="onKey"
      @blur="add"
    />
  </div>
</template>
