<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SChip, SField, SHint, SInput, SSegmented, SSelect, SStatusDot } from '@sub2api/ui'
import { describeDraft, describeProblem, partsSentence } from './describe'
import {
  actionTypeChoices,
  addableActions,
  isForked,
  MAX_CONDITIONS,
  MAX_PERIODS,
  newAction,
  newCondition,
  remetric,
  removeCondition,
  retypedAction,
  type ItemDraft,
  type Problem
} from './items'
import {
  directionTone,
  enumOptions,
  metrics,
  opsOf,
  percentileMetric,
  scopes,
  useDwHost,
  type Action,
  type ActionType,
  type Condition,
  type Metric,
  type Scope
} from './host'

// The body of an editable item: "when" (the conditions, the counted
// requests, "at least M of the last N windows") and "then" (the actions and
// the cooldown), with the item's sentence as a preview. It edits the draft in
// place; the items logic decides from the result whether the rule is written
// as it was, updated or copied. A condition's own counted requests and its
// value without samples sit behind its "⋯" and show as tags when set.
const draft = defineModel<ItemDraft>({ required: true })
const props = defineProps<{ problems: Problem[] }>()
const t = useDwHost().t

const err = (path: string) => props.problems.some(p => p.path === path)
const scopeOptions = computed(() => enumOptions('scope', scopes))
const metricOptions = computed(() => enumOptions('metric', metrics))
const joinOptions = computed(() => enumOptions('join', ['and', 'or']))
const condScopeOptions = computed(() => [{ value: '', label: t('it.card.condScopeRule') }, ...enumOptions('scope', scopes)])
const whenEmptyOptions = computed(() => enumOptions('it.whenEmpty', ['fail', 'pass']))
const modeOptions = computed(() => enumOptions('it.mode', ['current_percent', 'base_percent', 'fixed']))
const opOptions = (m: Metric) => enumOptions('op', opsOf(m))
const typeOptions = (a: Action) => enumOptions('action', actionTypeChoices(draft.value.actions, a))
const UNIT: Record<Metric, string> = { error_rate: '%', ttfb: 'ms', latency: 'ms', weight: '' }

// Conditions whose options row is open, by index.
const open = ref(new Set<number>())
function toggleOpen(j: number) {
  const s = new Set(open.value)
  if (!s.delete(j)) s.add(j)
  open.value = s
}

const conditions = () => draft.value.conditions
const setCondition = (j: number, c: Condition) => conditions().splice(j, 1, c)
function setOption(c: Condition, field: 'scope' | 'when_empty', v: string) {
  if (v && !(field === 'when_empty' && v === 'fail')) Object.assign(c, { [field]: v })
  else delete c[field]
}
function dropCondition(j: number) {
  draft.value.conditions = removeCondition(conditions(), j)
  open.value = new Set()
}
const addCondition = () => conditions().push(newCondition('error_rate', conditions().length ? 'and' : undefined))
/** The tags of a condition's non-default options. */
const tags = (c: Condition) => [
  ...(c.scope && c.scope !== draft.value.scope ? [t(`scope.${c.scope}`)] : []),
  ...(c.when_empty === 'pass' ? [t('it.passTag')] : [])
]

const addable = computed(() => addableActions(draft.value.actions))
const actionTone = (a: Action) => directionTone[a.type === 'affinity_clear' ? 'clear' : a.type === 'weight_climb' ? 'climb' : 'degrade']
const setType = (j: number, type: ActionType) => draft.value.actions.splice(j, 1, retypedAction(draft.value.actions[j], type))

// The sentences with inputs in place of their numbers.
const SLOT = /(⟦\w⟧)/
const periodsParts = computed(() => t('it.card.periods', { n: '⟦n⟧', m: '⟦m⟧' }).split(SLOT).filter(Boolean))
const cooldownParts = computed(() => t('it.card.cooldown', { n: '⟦n⟧' }).split(SLOT).filter(Boolean))

const sharedNote = computed(() => draft.value.source?.shared && !isForked(draft.value))
const preview = computed(() => partsSentence(describeDraft(draft.value, t), t))
const messages = computed(() => props.problems.map(p => describeProblem(p, t)))
</script>

<template>
  <div class="dw-it-card">
    <section class="dw-it-blk">
      <div class="dw-it-blk-h">
        <span class="dw-it-tag">{{ t('it.card.when') }}</span>
        <small class="dw-it-muted">{{ t('it.card.precedence') }}</small>
        <SSegmented
          :model-value="draft.scope"
          class="dw-it-blk-end"
          size="sm"
          :options="scopeOptions"
          :aria-label="t('it.card.scope')"
          @update:model-value="draft.scope = $event as Scope"
        />
      </div>
      <template v-for="(c, j) in draft.conditions" :key="j">
        <div class="dw-it-cond">
          <SSelect
            v-if="j > 0"
            class="dw-it-w-join"
            size="sm"
            :model-value="c.join ?? 'and'"
            :options="joinOptions"
            :aria-label="t('it.card.join')"
            :error="err(`conditions.${j}.join`)"
            @update:model-value="c.join = $event as Condition['join']"
          />
          <span v-else class="dw-it-w-join" aria-hidden="true" />
          <SSelect
            class="dw-it-w-metric"
            size="sm"
            :model-value="c.metric"
            :options="metricOptions"
            :aria-label="t('it.card.metric')"
            @update:model-value="setCondition(j, remetric(c, $event as Metric))"
          />
          <SInput
            v-if="percentileMetric(c.metric)"
            v-model="c.p"
            class="dw-it-w-p"
            size="sm"
            type="number"
            min="50"
            max="100"
            :aria-label="t('it.card.p')"
            :error="err(`conditions.${j}.p`)"
          >
            <template #prefix>P</template>
          </SInput>
          <SSelect
            v-model="c.op"
            class="dw-it-w-op"
            size="sm"
            :options="opOptions(c.metric)"
            :aria-label="t('it.card.op')"
            :error="err(`conditions.${j}.op`)"
          />
          <SInput
            v-model="c.value"
            class="dw-it-w-value"
            size="sm"
            type="number"
            min="0"
            :suffix="UNIT[c.metric]"
            :aria-label="t('it.card.value')"
            :error="err(`conditions.${j}.value`)"
          />
          <span class="dw-it-cond-end">
            <SChip v-for="tag in tags(c)" :key="tag" size="xs" clickable @click="toggleOpen(j)">{{ tag }}</SChip>
            <SButton
              v-if="c.metric !== 'weight'"
              size="xs"
              variant="ghost"
              icon="more"
              icon-only
              :aria-label="t('it.card.condMore')"
              :aria-expanded="open.has(j)"
              @click="toggleOpen(j)"
            />
            <SButton
              size="xs"
              variant="ghost"
              icon="x"
              icon-only
              :aria-label="t('it.card.removeCond')"
              :disabled="draft.conditions.length <= 1"
              @click="dropCondition(j)"
            />
          </span>
        </div>
        <div v-if="open.has(j) && c.metric !== 'weight'" class="dw-it-cond-opts">
          <SField inline size="sm" :label="t('it.card.condScope')" :hint="t('it.card.condScopeHint')">
            <SSelect
              class="dw-it-opt-ctl"
              size="sm"
              :model-value="c.scope ?? ''"
              :options="condScopeOptions"
              :error="err(`conditions.${j}.scope`)"
              @update:model-value="setOption(c, 'scope', String($event))"
            />
          </SField>
          <SField inline size="sm" :label="t('it.card.whenEmpty')" :hint="t('it.card.whenEmptyHint')">
            <SSelect
              class="dw-it-opt-ctl"
              size="sm"
              :model-value="c.when_empty ?? 'fail'"
              :options="whenEmptyOptions"
              @update:model-value="setOption(c, 'when_empty', String($event))"
            />
          </SField>
        </div>
      </template>
      <div class="dw-it-blk-f">
        <SButton size="xs" variant="ghost" icon="plus" :disabled="draft.conditions.length >= MAX_CONDITIONS" @click="addCondition">{{
          t('it.card.addCond')
        }}</SButton>
        <span class="dw-it-sentence-inputs">
          <template v-for="(part, i) in periodsParts" :key="i">
            <SInput
              v-if="part === '⟦n⟧'"
              v-model="draft.periods"
              class="dw-it-w-num"
              size="sm"
              type="number"
              min="1"
              :max="MAX_PERIODS"
              :aria-label="t('it.card.periodsN')"
              :error="err('periods')"
            />
            <SInput
              v-else-if="part === '⟦m⟧'"
              v-model="draft.hit_periods"
              class="dw-it-w-num"
              size="sm"
              type="number"
              min="1"
              :max="draft.periods ?? MAX_PERIODS"
              :aria-label="t('it.card.periodsM')"
              :error="err('hit_periods')"
            />
            <span v-else>{{ part }}</span>
          </template>
        </span>
      </div>
      <p v-if="sharedNote" class="dw-it-note">{{ t('it.card.shared') }}</p>
    </section>

    <section class="dw-it-blk">
      <div class="dw-it-blk-h">
        <span class="dw-it-tag">{{ t('it.card.then') }}</span>
        <small class="dw-it-muted">{{ t('it.card.order') }}</small>
      </div>
      <div v-for="(a, j) in draft.actions" :key="j" class="dw-it-act">
        <SStatusDot :tone="actionTone(a)" size="xs" />
        <SSelect
          class="dw-it-w-type"
          size="sm"
          :model-value="a.type"
          :options="typeOptions(a)"
          :aria-label="t('it.card.type')"
          :error="err(`actions.${j}.type`)"
          @update:model-value="setType(j, $event as ActionType)"
        />
        <template v-if="a.type !== 'affinity_clear'">
          <SSelect
            v-model="a.mode"
            class="dw-it-w-mode"
            size="sm"
            :options="modeOptions"
            :aria-label="t('it.card.mode')"
            :error="err(`actions.${j}.mode`)"
          />
          <SInput
            v-model="a.value"
            class="dw-it-w-amount"
            size="sm"
            type="number"
            min="1"
            :suffix="a.mode === 'fixed' ? '' : '%'"
            :aria-label="t('it.card.amount')"
            :error="err(`actions.${j}.value`)"
          />
        </template>
        <SInput
          v-else
          v-model="a.percent"
          class="dw-it-w-amount"
          size="sm"
          type="number"
          min="1"
          max="100"
          suffix="%"
          :aria-label="t('it.card.percent')"
          :error="err(`actions.${j}.percent`)"
        />
        <SButton
          class="dw-it-blk-end"
          size="xs"
          variant="ghost"
          icon="x"
          icon-only
          :aria-label="t('it.card.removeAction')"
          :disabled="draft.actions.length <= 1"
          @click="draft.actions.splice(j, 1)"
        />
      </div>
      <div class="dw-it-blk-f">
        <SButton size="xs" variant="ghost" icon="plus" :disabled="!addable.length" @click="draft.actions.push(newAction(addable[0]))">{{
          t('it.card.addAction')
        }}</SButton>
        <span class="dw-it-sentence-inputs dw-it-muted">
          <template v-for="(part, i) in cooldownParts" :key="i">
            <SInput
              v-if="part === '⟦n⟧'"
              v-model="draft.cooldown_seconds"
              class="dw-it-w-num"
              size="sm"
              type="number"
              min="0"
              :aria-label="t('it.card.cooldownLabel')"
              :error="err('cooldown_seconds')"
            />
            <span v-else>{{ part }}</span>
          </template>
        </span>
      </div>
    </section>

    <p class="dw-it-preview">{{ preview }}</p>
    <ul v-if="messages.length" class="dw-it-errors" role="alert">
      <li v-for="(m, i) in messages" :key="i">
        <SHint inline size="xs" tone="danger">{{ m }}</SHint>
      </li>
    </ul>
  </div>
</template>
