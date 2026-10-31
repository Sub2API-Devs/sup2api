<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SButton, SCheckbox, SChoiceCards, SField, SGrid, SHint, SInput, SFormModal, SSectionTitle, SSelect, SSettingRow, SSwitch, STagInput, toast, type ChoiceOption } from '@sub2api/ui'
import type { StickyRule } from '@/api/types'
import { applyFormError } from '@/utils/formErrors'
import StickyProtocolPicker from './StickyProtocolPicker.vue'

// Create / edit a sticky rule. Built-in rules only allow enabled and
// priority; "copy" pre-fills a new admin rule from any rule.
const props = defineProps<{ open: boolean; rule: StickyRule | null; copy?: boolean; failurePolicyManaged?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const { t } = useI18n()

type KeySource = { type: string; path?: string; name?: string }

// The session value always comes from the request; no plugin computes it.
const KEY_TYPES = ['body', 'header', 'api_key', 'user'] as const
const INCLUDES = ['group', 'model', 'rule'] as const
const onFailureOptions = computed<ChoiceOption[]>(() =>
  (['failover', 'stick'] as const).map((f) => ({ value: f, label: t(`sticky.onFailure.${f}`), description: t(`sticky.onFailureHint.${f}`) }))
)
const keyTypeOptions = computed(() => KEY_TYPES.map((k) => ({ value: k, label: t(`sticky.keyTypes.${k}`) })))

const form = reactive({
  name: '',
  enabled: true,
  priority: 100,
  protocols: [] as string[],
  models: [] as string[],
  userAgentContains: [] as string[],
  key_sources: [] as KeySource[],
  value_regex: '',
  ttl_seconds: 3600 as number | null,
  key_includes: ['group', 'model', 'rule'] as string[],
  on_failure: 'failover' as 'failover' | 'stick'
})
const errors = ref<Record<string, string>>({})
const busy = ref(false)

const isEdit = computed(() => !!props.rule && !props.copy)
const limited = computed(() => isEdit.value && props.rule?.source !== 'admin')
const title = computed(() =>
  props.copy ? t('sticky.modal.copyTitle') : isEdit.value ? t('sticky.modal.editTitle', { name: props.rule?.name || '' }) : t('sticky.modal.createTitle')
)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    errors.value = {}
    const r = props.rule
    Object.assign(form, {
      name: r ? (props.copy ? `${r.name}-admin` : r.name) : '',
      enabled: r ? r.enabled : true,
      priority: r ? r.priority : 100,
      protocols: [...(r?.match?.protocols || [])],
      models: [...(r?.match?.models || [])],
      userAgentContains: [...(r?.match?.userAgentContains || [])],
      key_sources: (r?.key_sources || []).map((k) => ({ ...k })),
      value_regex: r?.value_regex || '',
      ttl_seconds: r ? r.ttl_seconds : 3600,
      key_includes: r ? [...(r.key_includes || [])] : ['group', 'model', 'rule'],
      on_failure: r?.on_failure || 'failover'
    })
    if (!form.key_sources.length && !limited.value) form.key_sources.push({ type: 'body', path: '' })
  }
)

function addSource() {
  form.key_sources.push({ type: 'header', name: '' })
}

function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= form.key_sources.length) return
  const [x] = form.key_sources.splice(i, 1)
  form.key_sources.splice(j, 0, x)
}

function setType(ks: KeySource, type: string) {
  ks.type = type
  if (type !== 'body') delete ks.path
  if (type !== 'header') delete ks.name
  if (type === 'body' && ks.path === undefined) ks.path = ''
  if (type === 'header' && ks.name === undefined) ks.name = ''
}

function toggleInclude(k: string, on: boolean) {
  const set = new Set(form.key_includes)
  if (on) set.add(k)
  else set.delete(k)
  form.key_includes = INCLUDES.filter((x) => set.has(x))
}

function validRegex(s: string) {
  if (!s) return true
  try {
    new RegExp(s)
    return true
  } catch {
    return false
  }
}

function body() {
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    priority: Number(form.priority) || 0,
    match: { protocols: form.protocols, models: form.models, userAgentContains: form.userAgentContains },
    key_sources: form.key_sources.map((k) => {
      const o: KeySource = { type: k.type }
      if (k.type === 'body') o.path = (k.path || '').trim()
      if (k.type === 'header') o.name = (k.name || '').trim()
      return o
    }),
    value_regex: form.value_regex,
    ttl_seconds: Number(form.ttl_seconds) || 0,
    key_includes: form.key_includes,
    on_failure: form.on_failure
  }
}

async function submit() {
  errors.value = {}
  if (!limited.value) {
    if (!form.name.trim()) errors.value.name = t('common.required')
    if (!form.key_sources.length) errors.value.key_sources = t('sticky.modal.needSource')
    form.key_sources.forEach((k, i) => {
      if (k.type === 'body' && !k.path?.trim()) errors.value[`key_sources.${i}`] = t('sticky.modal.needPath')
      if (k.type === 'header' && !k.name?.trim()) errors.value[`key_sources.${i}`] = t('sticky.modal.needHeader')
    })
    if (!validRegex(form.value_regex)) errors.value.value_regex = t('sticky.modal.badRegex')
  }
  if (form.ttl_seconds !== null && (form.ttl_seconds < 0 || !Number.isInteger(form.ttl_seconds))) {
    errors.value.ttl_seconds = t('sticky.modal.badTtl')
  }
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    if (limited.value && props.rule) {
      // The definition of a built-in rule follows the core: only the
      // switches are the administrator's.
      await api.patch(`/sticky-rules/${props.rule.id}`, {
        enabled: form.enabled,
        priority: Number(form.priority) || 0
      })
    } else if (isEdit.value && props.rule) {
      await api.patch(`/sticky-rules/${props.rule.id}`, body())
    } else {
      await api.post('/sticky-rules', body())
    }
    toast(t('common.saved'), 'success')
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    applyFormError(e, errors)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SFormModal :open="open" :title="title" width="xl" :loading="busy" @update:open="emit('update:open', $event)" @submit="submit">
    <div class="space-y-5">
      <SAlert v-if="limited" tone="accent" dense>{{ t('sticky.modal.limitedHint') }}</SAlert>

      <SGrid :cols="1" md-template="2fr 1fr">
        <SField :label="t('common.name')" :error="errors.name" required>
          <SInput v-model.trim="form.name" mono :disabled="limited" placeholder="claude-code-session" />
        </SField>
        <SField :label="t('sticky.cols.priority')" :hint="t('sticky.modal.priorityHint')" :error="errors.priority">
          <SInput v-model.number="form.priority" type="number" />
        </SField>
      </SGrid>
      <SSettingRow :label="t('common.enabled')" dense for="sticky-rule-enabled" flush>
        <SSwitch id="sticky-rule-enabled" v-model="form.enabled" :aria-label="t('common.enabled')" />
      </SSettingRow>

      <fieldset :disabled="limited" class="space-y-5" :class="limited ? 'opacity-60' : ''">
        <div>
          <SSectionTitle tag="h4">{{ t('sticky.modal.match') }}</SSectionTitle>
          <SGrid :cols="1" :md-cols="3">
            <SField :label="t('sticky.modal.protocols')" :hint="t('sticky.modal.emptyAny')" :error="errors['match.protocols']">
              <StickyProtocolPicker v-model="form.protocols" :disabled="limited" />
            </SField>
            <SField :label="t('sticky.modal.models')" :hint="t('sticky.modal.modelsHint')">
              <STagInput v-model="form.models" placeholder="claude-*" :disabled="limited" />
            </SField>
            <SField :label="t('sticky.modal.ua')" :hint="t('sticky.modal.emptyAny')">
              <STagInput v-model="form.userAgentContains" placeholder="claude-cli" :disabled="limited" />
            </SField>
          </SGrid>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <div>
              <SSectionTitle tag="h4" class="mb-0">{{ t('sticky.modal.keySources') }}</SSectionTitle>
              <SHint size="xs">{{ t('sticky.modal.keySourcesHint') }}</SHint>
            </div>
            <SButton size="sm" :disabled="limited" icon="plus" @click="addSource">{{ t('common.add') }}</SButton>
          </div>
          <SHint v-if="errors.key_sources" tone="danger" size="xs" class="mt-1">{{ errors.key_sources }}</SHint>
          <div class="space-y-2">
            <div v-for="(ks, i) in form.key_sources" :key="i">
              <div class="flex flex-wrap items-center gap-2">
                <SHint inline size="xs" class="w-5 text-right">{{ i + 1 }}.</SHint>
                <SSelect class="w-32" size="sm" :aria-label="t('sticky.modal.keySources')" :model-value="ks.type" :options="keyTypeOptions" @update:model-value="setType(ks, String($event))" />
                <SInput v-if="ks.type === 'body'" v-model="ks.path" class="w-64" size="sm" mono placeholder="metadata.user_id" />
                <SInput v-else-if="ks.type === 'header'" v-model="ks.name" class="w-64" size="sm" mono placeholder="x-session-id" />
                <SHint v-else inline size="xs">{{ t(`sticky.keyTypeHint.${ks.type}`) }}</SHint>
                <div class="ml-auto flex gap-1">
                  <SButton variant="ghost" size="sm" square :disabled="i === 0" :title="t('common.moveUp')" :aria-label="t('common.moveUp')" @click="move(i, -1)">↑</SButton>
                  <SButton variant="ghost" size="sm" square :disabled="i === form.key_sources.length - 1" :title="t('common.moveDown')" :aria-label="t('common.moveDown')" @click="move(i, 1)">↓</SButton>
                  <SButton variant="ghost" size="sm" :title="t('common.remove')" :aria-label="t('common.remove')" icon-only icon="x" @click="form.key_sources.splice(i, 1)" />
                </div>
              </div>
              <SHint v-if="errors[`key_sources.${i}`]" tone="danger" size="xs" class="ml-7 mt-1">{{ errors[`key_sources.${i}`] }}</SHint>
            </div>
          </div>
        </div>

        <SField :label="t('sticky.modal.valueRegex')" :hint="t('sticky.modal.valueRegexHint')" :error="errors.value_regex">
          <SInput v-model="form.value_regex" mono placeholder="session_([a-f0-9-]+)" />
        </SField>
      </fieldset>

      <SGrid :cols="1" :md-cols="2">
        <SField :label="t('sticky.cols.ttl')" :hint="t('sticky.modal.ttlHint')" :error="errors.ttl_seconds">
          <SInput v-model="form.ttl_seconds" type="number" min="0" :suffix="t('sticky.seconds')" :disabled="limited" />
        </SField>
        <SField :label="t('sticky.cols.keyIncludes')" :hint="t('sticky.modal.keyIncludesHint')">
          <div class="flex gap-4 pt-2">
            <SCheckbox
              v-for="k in INCLUDES"
              :key="k"
              :model-value="form.key_includes.includes(k)"
              :disabled="limited"
              :label="t(`sticky.includes.${k}`)"
              @update:model-value="toggleInclude(k, $event)"
            />
          </div>
        </SField>
      </SGrid>

      <SHint v-if="failurePolicyManaged">{{ t('failurePolicy.stickyManaged') }}</SHint>
      <SField v-else :label="t('sticky.cols.onFailure')">
        <SChoiceCards
          :model-value="form.on_failure"
          :options="onFailureOptions"
          :disabled="limited"
          data-testid="sticky-on-failure"
          @update:model-value="form.on_failure = $event as typeof form.on_failure"
        />
      </SField>
    </div>
  </SFormModal>
</template>
