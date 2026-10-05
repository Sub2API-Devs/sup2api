<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SInput, SLink } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { notifyError } from '@/utils/errors'

const props = defineProps<{ account: Account; editable: boolean }>()
const emit = defineEmits<{ saved: [values: { priority: number; weight: number }] }>()
const { t } = useI18n()
const editing = ref(false), busy = ref(false)
const priority = ref(0), weight = ref(1)
const valid = computed(() => Number.isInteger(Number(priority.value)) && Number(priority.value) >= 0 && Number(priority.value) <= 1000000 && Number.isInteger(Number(weight.value)) && Number(weight.value) >= 1 && Number(weight.value) <= 1000)
function edit() {
  priority.value = props.account.priority
  weight.value = props.account.weight ?? 1
  editing.value = true
}
async function save() {
  if (!props.editable || !valid.value || busy.value) return
  busy.value = true
  try {
    const values = { priority: Number(priority.value), weight: Number(weight.value) }
    await api.patch(`/accounts/${props.account.id}`, values)
    emit('saved', values)
    editing.value = false
  } catch (e) { notifyError(e) } finally { busy.value = false }
}
</script>

<template>
  <form v-if="editing" class="min-w-36 space-y-1" data-testid="schedule-inline-editor" @submit.prevent="save" @keydown.esc="!busy && (editing = false)">
    <label class="flex items-center gap-2 text-xs"><span class="w-12">{{ t('accounts.priority') }}</span><SInput v-model="priority" type="number" min="0" max="1000000" class="!w-20" :disabled="busy" /></label>
    <label class="flex items-center gap-2 text-xs"><span class="w-12">{{ t('accounts.weight') }}</span><SInput v-model="weight" type="number" min="1" max="1000" class="!w-20" :disabled="busy" /></label>
    <div class="flex justify-end gap-1"><SButton size="sm" :disabled="busy" @click="editing = false">{{ t('common.cancel') }}</SButton><SButton type="submit" size="sm" variant="primary" :loading="busy" :disabled="!valid">{{ t('common.save') }}</SButton></div>
  </form>
  <SLink v-else-if="editable" as="button" class="text-xs tabular-nums" data-testid="schedule-inline-edit" :title="t('common.edit')" @click="edit">{{ account.priority }} / {{ account.weight ?? 1 }}</SLink>
  <span v-else class="text-xs tabular-nums">{{ account.priority }} / {{ account.weight ?? 1 }}</span>
</template>
