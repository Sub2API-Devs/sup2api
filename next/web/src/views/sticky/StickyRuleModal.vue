<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SField, SModal, SSwitch, STagInput, toast } from '@sub2api/ui'
import type { StickyRule } from '@/api/types'
import { fieldErrors, notifyError } from '@/utils/errors'

// Create / edit a sticky rule. Plugin default rules only allow enabled,
// priority and ttl; "copy" pre-fills a new admin rule from any rule.
const props = defineProps<{ open: boolean; rule: StickyRule | null; copy?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const { t } = useI18n()

type KeySource = { type: string; path?: string; name?: string; needs?: string[] }

const KEY_TYPES = ['body', 'header', 'api_key', 'user', 'plugin'] as const
const INCLUDES = ['group', 'model', 'rule'] as const

const form = reactive({
  name: '',
  enabled: true,
  priority: 100,
  protocols: [] as string[],
  models: [] as string[],
  userAgentContains: [] as string[],
  key_sources: [] as KeySource[],
  value_regex: '',
  ttl_seconds: 3600 as number | '',
  key_includes: ['group', 'model', 'rule'] as string[],
  on_failure: 'failover' as 'failover' | 'stick'
})
const errors = ref<Record<string, string>>({})
const busy = ref(false)

const isEdit = computed(() => !!props.rule && !props.copy)
const limited = computed(() => isEdit.value && props.rule?.source === 'plugin_default')
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
      key_sources: (r?.key_sources || []).map((k) => ({ ...k, needs: [...(k.needs || [])] })),
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
  if (type !== 'plugin') delete ks.needs
  if (type === 'body' && ks.path === undefined) ks.path = ''
  if (type === 'header' && ks.name === undefined) ks.name = ''
  if (type === 'plugin' && !ks.needs) ks.needs = []
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
      if (k.type === 'plugin' && k.needs?.length) o.needs = k.needs
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
  if (form.ttl_seconds !== '' && (Number(form.ttl_seconds) < 0 || !Number.isInteger(Number(form.ttl_seconds)))) {
    errors.value.ttl_seconds = t('sticky.modal.badTtl')
  }
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    if (limited.value && props.rule) {
      await api.patch(`/sticky-rules/${props.rule.id}`, {
        enabled: form.enabled,
        priority: Number(form.priority) || 0,
        ttl_seconds: Number(form.ttl_seconds) || 0
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
    const fe = fieldErrors(e)
    errors.value = fe
    if (!Object.keys(fe).length) notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="title" width="xl" @update:open="emit('update:open', $event)">
    <div class="space-y-5">
      <p v-if="limited" class="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
        {{ t('sticky.modal.limitedHint', { plugin: rule?.plugin_key || '—' }) }}
      </p>

      <div class="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <SField :label="t('common.name')" :error="errors.name" required>
          <input v-model.trim="form.name" class="input font-mono" :disabled="limited" placeholder="claude-code-session" />
        </SField>
        <SField :label="t('sticky.cols.priority')" :hint="t('sticky.modal.priorityHint')" :error="errors.priority">
          <input v-model.number="form.priority" type="number" class="input" />
        </SField>
        <SField :label="t('common.enabled')">
          <div class="pt-2"><SSwitch v-model="form.enabled" /></div>
        </SField>
      </div>

      <fieldset :disabled="limited" class="space-y-5" :class="limited ? 'opacity-60' : ''">
        <div>
          <h4 class="section-title">{{ t('sticky.modal.match') }}</h4>
          <div class="grid gap-4 md:grid-cols-3">
            <SField :label="t('sticky.modal.protocols')" :hint="t('sticky.modal.emptyAny')">
              <STagInput v-model="form.protocols" placeholder="anthropic.messages" :disabled="limited" />
            </SField>
            <SField :label="t('sticky.modal.models')" :hint="t('sticky.modal.modelsHint')">
              <STagInput v-model="form.models" placeholder="claude-*" :disabled="limited" />
            </SField>
            <SField :label="t('sticky.modal.ua')" :hint="t('sticky.modal.emptyAny')">
              <STagInput v-model="form.userAgentContains" placeholder="claude-cli" :disabled="limited" />
            </SField>
          </div>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <div>
              <h4 class="section-title !mb-0">{{ t('sticky.modal.keySources') }}</h4>
              <p class="muted text-xs">{{ t('sticky.modal.keySourcesHint') }}</p>
            </div>
            <SButton size="sm" :disabled="limited" @click="addSource">+ {{ t('common.add') }}</SButton>
          </div>
          <p v-if="errors.key_sources" class="input-error-text">{{ errors.key_sources }}</p>
          <div class="space-y-2">
            <div v-for="(ks, i) in form.key_sources" :key="i">
              <div class="flex flex-wrap items-center gap-2">
                <span class="muted w-5 text-right text-xs">{{ i + 1 }}.</span>
                <select class="input !w-32 !py-1.5" :value="ks.type" @change="setType(ks, ($event.target as HTMLSelectElement).value)">
                  <option v-for="k in KEY_TYPES" :key="k" :value="k">{{ t(`sticky.keyTypes.${k}`) }}</option>
                </select>
                <input v-if="ks.type === 'body'" v-model="ks.path" class="input !w-64 !py-1.5 font-mono" placeholder="metadata.user_id" />
                <input v-else-if="ks.type === 'header'" v-model="ks.name" class="input !w-64 !py-1.5 font-mono" placeholder="x-session-id" />
                <div v-else-if="ks.type === 'plugin'" class="w-80">
                  <STagInput v-model="ks.needs" :placeholder="t('sticky.modal.needsPlaceholder')" :disabled="limited" />
                </div>
                <span v-else class="muted text-xs">{{ t(`sticky.keyTypeHint.${ks.type}`) }}</span>
                <div class="ml-auto flex gap-1">
                  <button type="button" class="btn btn-ghost btn-sm !px-1.5" :disabled="i === 0" @click="move(i, -1)">↑</button>
                  <button type="button" class="btn btn-ghost btn-sm !px-1.5" :disabled="i === form.key_sources.length - 1" @click="move(i, 1)">↓</button>
                  <button type="button" class="btn btn-ghost btn-sm !px-1.5" @click="form.key_sources.splice(i, 1)">×</button>
                </div>
              </div>
              <p v-if="errors[`key_sources.${i}`]" class="input-error-text ml-7">{{ errors[`key_sources.${i}`] }}</p>
            </div>
          </div>
        </div>

        <SField :label="t('sticky.modal.valueRegex')" :hint="t('sticky.modal.valueRegexHint')" :error="errors.value_regex">
          <input v-model="form.value_regex" class="input font-mono" placeholder="session_([a-f0-9-]+)" />
        </SField>
      </fieldset>

      <div class="grid gap-4 md:grid-cols-2">
        <SField :label="t('sticky.cols.ttl')" :hint="t('sticky.modal.ttlHint')" :error="errors.ttl_seconds">
          <div class="flex items-center gap-2">
            <input v-model.number="form.ttl_seconds" type="number" min="0" class="input" />
            <span class="muted text-sm">{{ t('sticky.seconds') }}</span>
          </div>
        </SField>
        <SField :label="t('sticky.cols.keyIncludes')" :hint="t('sticky.modal.keyIncludesHint')">
          <div class="flex gap-4 pt-2">
            <label v-for="k in INCLUDES" :key="k" class="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                class="checkbox"
                :checked="form.key_includes.includes(k)"
                :disabled="limited"
                @change="toggleInclude(k, ($event.target as HTMLInputElement).checked)"
              />
              {{ t(`sticky.includes.${k}`) }}
            </label>
          </div>
        </SField>
      </div>

      <SField :label="t('sticky.cols.onFailure')">
        <div class="grid gap-2 md:grid-cols-2">
          <label
            v-for="f in ['failover', 'stick'] as const"
            :key="f"
            class="flex cursor-pointer gap-2 rounded-xl border p-3 text-sm"
            :class="[
              form.on_failure === f ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-dark-700',
              limited ? 'pointer-events-none opacity-60' : ''
            ]"
          >
            <input v-model="form.on_failure" type="radio" class="checkbox mt-0.5 !rounded-full" :value="f" :disabled="limited" />
            <span>
              <span class="font-medium">{{ t(`sticky.onFailure.${f}`) }}</span>
              <span class="muted block text-xs">{{ t(`sticky.onFailureHint.${f}`) }}</span>
            </span>
          </label>
        </div>
      </SField>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="busy" @click="submit">{{ t('common.save') }}</SButton>
    </template>
  </SModal>
</template>
