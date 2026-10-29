<script setup lang="ts">
// 指定模型限速 of the account editor (CONTRACTS §68, §71, like new-api's
// channel form): each card is one set of concurrency / RPM / TPM / sessions
// caps with one or more model lists; the models of a list share one counter,
// every list counts on its own. A model may be in one list only. Server
// errors of the saved entries (model_limits[i]...) are shown under the card
// holding entry i.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SField, SHint, SInput, SLink, SIcon, toast } from '@sub2api/ui'
import ModelTagSelect from '@/components/models/ModelTagSelect.vue'
import { entryPositions, newCard, repeatedModel, type ModelLimitCard } from './modelLimits'

const props = defineProps<{ options: string[]; errors: Record<string, string>; disabled?: boolean }>()
const cards = defineModel<ModelLimitCard[]>({ required: true })
const { t } = useI18n()

const FIELDS = [
  { key: 'max_concurrency', label: () => t('accounts.concurrency'), max: 100_000 },
  { key: 'rpm_limit', label: () => 'RPM', max: 10_000_000 },
  { key: 'tpm_limit', label: () => 'TPM', max: 1_000_000_000_000 },
  { key: 'spm_limit', label: () => t('accounts.limitsUi.sessions'), max: 10_000_000 }
] as const

/** Messages of the server's model_limits[i]... errors, by card. */
const cardErrors = computed(() => {
  const out: string[][] = cards.value.map(() => [])
  const positions = entryPositions(cards.value)
  for (const [field, message] of Object.entries(props.errors)) {
    const m = /^model_limits\[(\d+)\]/.exec(field)
    const pos = m ? positions[Number(m[1])] : undefined
    if (pos && !out[pos.card].includes(message)) out[pos.card].push(message)
  }
  return out
})
const generalError = computed(() => props.errors.model_limits || '')
const repeated = computed(() => repeatedModel(cards.value))

function setList(card: ModelLimitCard, i: number, models: string[]) {
  const before = repeatedModel(cards.value)
  card.lists[i] = models
  const now = repeatedModel(cards.value)
  if (now && now !== before) toast(t('accounts.modelLimits.duplicate', { model: now }), 'warning')
}
function addCard() {
  cards.value.push(newCard())
}
function removeList(card: ModelLimitCard, i: number) {
  card.lists.splice(i, 1)
}
function removeCard(i: number) {
  cards.value.splice(i, 1)
}
</script>

<template>
  <div class="space-y-3" data-testid="model-limits">
    <SHint v-if="!cards.length" size="xs">{{ t('accounts.modelLimits.empty') }}</SHint>
    <div v-for="(card, ci) in cards" :key="ci" class="space-y-2 rounded-lg border border-line p-3" data-testid="model-limit-card">
      <div v-for="(list, li) in card.lists" :key="li" class="flex items-start gap-2">
        <ModelTagSelect class="min-w-0 flex-1" :model-value="list" :options="options" :placeholder="t('accounts.modelLimits.placeholder')" :readonly="disabled" @update:model-value="setList(card, li, $event)" @invalid="toast(t('accounts.modelInvalid', { model: $event }), 'warning')" />
        <SButton v-if="card.lists.length > 1" size="sm" variant="ghost" icon="x" icon-only :aria-label="t('accounts.modelLimits.removeList')" :disabled="disabled" @click="removeList(card, li)" />
      </div>
      <SLink as="button" class="inline-flex items-center gap-1 text-xs" :disabled="disabled" data-testid="model-limit-add-list" @click="card.lists.push([])"><SIcon name="plus" class="h-3.5 w-3.5" />{{ t('accounts.modelLimits.addList') }}</SLink>
      <div class="flex flex-wrap items-end gap-2">
        <SField v-for="f in FIELDS" :key="f.key" :label="f.label()" class="w-36">
          <SInput v-model.number="card[f.key]" type="number" min="0" :max="f.max" size="sm" :disabled="disabled" :data-testid="`model-limit-${f.key}`" />
        </SField>
        <SButton class="ms-auto" size="sm" variant="ghost" tone="danger" icon="trash" icon-only :aria-label="t('accounts.modelLimits.removeCard')" :title="t('accounts.modelLimits.removeCard')" :disabled="disabled" data-testid="model-limit-remove" @click="removeCard(ci)" />
      </div>
      <SHint v-for="msg in cardErrors[ci]" :key="msg" tone="danger" size="xs">{{ msg }}</SHint>
    </div>
    <SHint v-if="repeated" tone="warning" size="xs">{{ t('accounts.modelLimits.duplicate', { model: repeated }) }}</SHint>
    <SHint v-if="generalError" tone="danger" size="xs">{{ generalError }}</SHint>
    <SButton size="sm" icon="plus" :disabled="disabled" data-testid="model-limit-add" @click="addCard">{{ t('accounts.modelLimits.add') }}</SButton>
  </div>
</template>
