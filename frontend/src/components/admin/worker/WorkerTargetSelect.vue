<template>
  <div>
    <label class="input-label">{{ t('admin.workers.addToWorker') }}</label>
    <select :value="modelValue ?? ''" class="input" data-testid="worker-target" @change="onChange">
      <option value="">{{ t('admin.workers.addToWorkerNone') }}</option>
      <option v-for="worker in workers" :key="worker.id" :value="worker.id">
        {{ worker.name }} ({{ worker.remote_worker_id }})
      </option>
    </select>
    <p class="mt-1 text-xs text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI, type Worker } from '@/api/admin'

const props = defineProps<{
  modelValue: number | null
  hintKey?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()
const { t } = useI18n()
const workers = ref<Worker[]>([])
const hint = computed(() => t(props.hintKey || 'admin.workers.addToWorkerHint'))

onMounted(async () => {
  try {
    workers.value = (await adminAPI.workers.list()).filter((worker) => worker.enabled)
  } catch {
    workers.value = []
  }
})

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value ? Number(value) : null)
}
</script>
