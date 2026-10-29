<script setup lang="ts">
// Priority or weight of an account, edited in place in the list like the
// channel table of new-api: Enter or leaving the box saves a changed value
// (PATCH /accounts/:id with that one field), Escape puts the saved value back.
// An out-of-range value is not sent: the box returns to the saved value.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { notifyError } from '@/utils/errors'

/** The ranges of CONTRACTS §18.1. */
const RANGE = { priority: [0, 1_000_000], weight: [1, 1000] } as const

const props = defineProps<{ account: Account; field: 'priority' | 'weight'; editable: boolean }>()
const emit = defineEmits<{ saved: [patch: Partial<Pick<Account, 'priority' | 'weight'>>] }>()
const { t } = useI18n()
const saved = computed(() => (props.field === 'weight' ? props.account.weight ?? 1 : props.account.priority))
const label = computed(() => t(props.field === 'weight' ? 'accounts.weight' : 'accounts.priority'))
// v-model on a number box may hand back a number.
const draft = ref<string | number>(String(saved.value))
const busy = ref(false)
watch(saved, (v) => {
  if (!busy.value) draft.value = String(v)
})

function reset() {
  draft.value = String(saved.value)
}
async function commit() {
  const text = String(draft.value).trim()
  const n = Number(text)
  const [min, max] = RANGE[props.field]
  if (text === '' || !Number.isInteger(n) || n < min || n > max) {
    if (text !== String(saved.value)) toast(t('accounts.listUi.numberRange', { label: label.value, min, max }), 'warning')
    reset()
    return
  }
  if (n === saved.value || busy.value) return
  busy.value = true
  try {
    await api.patch(`/accounts/${props.account.id}`, { [props.field]: n })
    emit('saved', { [props.field]: n })
  } catch (e) {
    reset()
    notifyError(e)
  } finally {
    busy.value = false
  }
}
function onEscape(e: KeyboardEvent) {
  reset()
  ;(e.target as HTMLInputElement).blur()
}
</script>

<template>
  <input
    v-if="editable"
    v-model="draft"
    type="number"
    inputmode="numeric"
    :min="RANGE[field][0]"
    :max="RANGE[field][1]"
    step="1"
    class="s-number-cell h-7 w-16 rounded-md border border-transparent bg-surface-2 px-2 text-center text-xs tabular-nums text-fg transition-colors hover:border-line focus:border-primary-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60"
    :aria-label="label"
    :title="label"
    :disabled="busy"
    :data-testid="`account-${field}-input`"
    @click.stop
    @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
    @keydown.esc.prevent="onEscape"
    @blur="commit"
  >
  <span v-else class="inline-flex h-7 min-w-16 items-center justify-center rounded-md bg-surface-2 px-2 text-xs tabular-nums text-fg-muted" :data-testid="`account-${field}`">{{ saved }}</span>
</template>

<style scoped>
.s-number-cell {
  appearance: textfield;
  -moz-appearance: textfield;
}
.s-number-cell::-webkit-inner-spin-button,
.s-number-cell::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
