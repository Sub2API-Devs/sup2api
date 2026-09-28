<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import {
  SBadge,
  SButton,
  SCheckbox,
  SField,
  SGrid,
  SHint,
  SInput,
  SModal,
  SRadio,
  SSectionTitle,
  SSelect,
  SSwitch,
  STagInput,
  toast,
  type SelectOption
} from '@sub2api/ui'
import type { PlatformEndpoint, StickyRule } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'
import { fieldErrors, notifyError } from '@/utils/errors'

// Create / edit a sticky rule. Plugin default rules only allow enabled,
// priority and ttl; "copy" pre-fills a new admin rule from any rule.
const props = defineProps<{ open: boolean; rule: StickyRule | null; copy?: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved'): void }>()
const { t } = useI18n()

type KeySource = { type: string; path?: string; name?: string; needs?: string[] }

const KEY_TYPES = ['body', 'header', 'api_key', 'user', 'plugin'] as const
const INCLUDES = ['group', 'model', 'rule'] as const
const keyTypeOptions = computed(() => KEY_TYPES.map((k) => ({ value: k, label: t(`sticky.keyTypes.${k}`) })))

const platformsCx = usePlatforms()

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
/** Manual protocol entry, only offered when the platform list may be incomplete. */
const protocolDraft = ref('')

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
    protocolDraft.value = ''
    // Protocols are picked from the declared endpoints; the composable caches
    // and de-duplicates concurrent calls, so calling it on every open is fine.
    platformsCx.load()
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

// ------------------------------------------------------- protocols (match)

type ProtocolEntry = { protocol: string; platformId: string; platformLabel: string; detail: string }

/** One entry per declared protocol, in platform order; the first platform declaring it wins. */
const protocolEntries = computed<ProtocolEntry[]>(() => {
  const out: ProtocolEntry[] = []
  const seen = new Set<string>()
  for (const p of platformsCx.platforms.value) {
    const byProtocol = new Map<string, PlatformEndpoint[]>()
    for (const e of p.endpoints || []) {
      if (!e.protocol) continue
      const eps = byProtocol.get(e.protocol)
      if (eps) eps.push(e)
      else byProtocol.set(e.protocol, [e])
    }
    for (const [protocol, eps] of byProtocol) {
      if (seen.has(protocol)) continue
      seen.add(protocol)
      const first = eps[0]
      // Several endpoints may share a protocol: show the first one and "+n".
      const detail = `${first.method} ${first.path}${eps.length > 1 ? ` +${eps.length - 1}` : ''}`
      out.push({ protocol, platformId: p.id, platformLabel: platformsCx.label(p.id), detail })
    }
  }
  return out
})

const protocolIndex = computed(() => new Map(protocolEntries.value.map((e) => [e.protocol, e])))

/** Not yet selected protocols, grouped by platform (<optgroup>). */
const protocolOptions = computed<SelectOption[]>(() => {
  const groups: SelectOption[] = []
  const byPlatform = new Map<string, SelectOption[]>()
  for (const e of protocolEntries.value) {
    if (form.protocols.includes(e.protocol)) continue
    let items = byPlatform.get(e.platformId)
    if (!items) {
      items = []
      byPlatform.set(e.platformId, items)
      groups.push({ value: e.platformId, label: e.platformLabel, options: items })
    }
    items.push({ value: e.protocol, label: `${e.protocol} · ${e.detail}` })
  }
  return groups
})

/** Selected but not declared anywhere (e.g. its plugin was removed): kept as is. */
function unknownProtocol(p: string) {
  return platformsCx.loaded.value && !patternProtocol(p) && !protocolIndex.value.has(p)
}

/** A hand-written glob ("anthropic.*", "*"): the server matches those too, so never "unknown". */
function patternProtocol(p: string) {
  return /[*?]/.test(p)
}

const hasUnknownProtocol = computed(() => form.protocols.some(unknownProtocol))
/** The built-in catalog is a fallback: plugin protocols are then missing. */
const protocolsPartial = computed(() => platformsCx.loaded.value && !platformsCx.complete.value)

function protocolTitle(p: string) {
  const e = protocolIndex.value.get(p)
  return e ? `${e.platformLabel} · ${e.detail}` : ''
}

function addProtocol(v: unknown) {
  const p = String(v || '').trim()
  if (!p || form.protocols.includes(p)) return
  form.protocols.push(p)
}

function removeProtocol(p: string) {
  form.protocols = form.protocols.filter((x) => x !== p)
}

function addProtocolDraft() {
  addProtocol(protocolDraft.value)
  protocolDraft.value = ''
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

      <SGrid :cols="1" md-template="2fr 1fr 1fr">
        <SField :label="t('common.name')" :error="errors.name" required>
          <SInput v-model.trim="form.name" mono :disabled="limited" placeholder="claude-code-session" />
        </SField>
        <SField :label="t('sticky.cols.priority')" :hint="t('sticky.modal.priorityHint')" :error="errors.priority">
          <SInput v-model.number="form.priority" type="number" />
        </SField>
        <SField :label="t('common.enabled')">
          <div class="pt-2"><SSwitch v-model="form.enabled" /></div>
        </SField>
      </SGrid>

      <fieldset :disabled="limited" class="space-y-5" :class="limited ? 'opacity-60' : ''">
        <div>
          <SSectionTitle tag="h4">{{ t('sticky.modal.match') }}</SSectionTitle>
          <SGrid :cols="1" :md-cols="3">
            <SField :label="t('sticky.modal.protocols')" :hint="t('sticky.modal.emptyAny')" :error="errors['match.protocols']">
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  v-for="p in form.protocols"
                  :key="p"
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
                  :class="
                    unknownProtocol(p)
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  "
                  :title="protocolTitle(p)"
                >
                  <span class="font-mono">{{ p }}</span>
                  <SBadge v-if="unknownProtocol(p)" tone="warning">{{ t('sticky.modal.protocolUnknown') }}</SBadge>
                  <SBadge v-else-if="patternProtocol(p)" tone="gray">{{ t('sticky.modal.protocolPattern') }}</SBadge>
                  <button v-if="!limited" type="button" class="opacity-60 hover:opacity-100" @click="removeProtocol(p)">×</button>
                </span>
                <SSelect
                  v-if="!limited && protocolOptions.length"
                  :model-value="null"
                  :options="protocolOptions"
                  :placeholder="t('sticky.modal.protocolPick')"
                  class="!w-auto !py-1 text-xs"
                  @update:model-value="addProtocol"
                />
                <SHint v-if="limited && !form.protocols.length" inline size="xs">{{ t('sticky.any') }}</SHint>
              </div>
              <SHint v-if="hasUnknownProtocol" tone="warning" size="xs" class="mt-1">{{ t('sticky.modal.protocolUnknownHint') }}</SHint>
              <template v-if="protocolsPartial">
                <SHint tone="warning" size="xs" class="mt-1">{{ t('sticky.modal.protocolsPartial') }}</SHint>
                <div v-if="!limited" class="mt-1 flex items-center gap-1.5">
                  <SInput
                    v-model="protocolDraft"
                    mono
                    class="!py-1 text-xs"
                    :placeholder="t('sticky.modal.protocolManual')"
                    @keydown.enter.prevent="addProtocolDraft"
                  />
                  <SButton size="sm" :disabled="!protocolDraft.trim()" @click="addProtocolDraft">+ {{ t('common.add') }}</SButton>
                </div>
              </template>
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
              <SSectionTitle tag="h4" class="!mb-0">{{ t('sticky.modal.keySources') }}</SSectionTitle>
              <SHint size="xs">{{ t('sticky.modal.keySourcesHint') }}</SHint>
            </div>
            <SButton size="sm" :disabled="limited" @click="addSource">+ {{ t('common.add') }}</SButton>
          </div>
          <SHint v-if="errors.key_sources" tone="danger" size="xs" class="mt-1">{{ errors.key_sources }}</SHint>
          <div class="space-y-2">
            <div v-for="(ks, i) in form.key_sources" :key="i">
              <div class="flex flex-wrap items-center gap-2">
                <SHint inline size="xs" class="w-5 text-right">{{ i + 1 }}.</SHint>
                <SSelect class="!w-32 !py-1.5" :model-value="ks.type" :options="keyTypeOptions" @update:model-value="setType(ks, String($event))" />
                <SInput v-if="ks.type === 'body'" v-model="ks.path" class="!w-64 !py-1.5" mono placeholder="metadata.user_id" />
                <SInput v-else-if="ks.type === 'header'" v-model="ks.name" class="!w-64 !py-1.5" mono placeholder="x-session-id" />
                <div v-else-if="ks.type === 'plugin'" class="w-80">
                  <STagInput v-model="ks.needs" :placeholder="t('sticky.modal.needsPlaceholder')" :disabled="limited" />
                </div>
                <SHint v-else inline size="xs">{{ t(`sticky.keyTypeHint.${ks.type}`) }}</SHint>
                <div class="ml-auto flex gap-1">
                  <SButton variant="ghost" size="sm" class="!px-1.5" :disabled="i === 0" @click="move(i, -1)">↑</SButton>
                  <SButton variant="ghost" size="sm" class="!px-1.5" :disabled="i === form.key_sources.length - 1" @click="move(i, 1)">↓</SButton>
                  <SButton variant="ghost" size="sm" class="!px-1.5" @click="form.key_sources.splice(i, 1)">×</SButton>
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
          <div class="flex items-center gap-2">
            <SInput v-model.number="form.ttl_seconds" type="number" min="0" />
            <SHint inline>{{ t('sticky.seconds') }}</SHint>
          </div>
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

      <SField :label="t('sticky.cols.onFailure')">
        <SGrid :cols="1" :md-cols="2" :gap="2">
          <SRadio
            v-for="f in ['failover', 'stick'] as const"
            :key="f"
            :model-value="form.on_failure"
            :value="f"
            :disabled="limited"
            class="!items-start rounded-xl border p-3"
            :class="[
              form.on_failure === f ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-dark-700',
              limited ? 'pointer-events-none' : ''
            ]"
            @update:model-value="form.on_failure = f"
          >
            <span class="font-medium">{{ t(`sticky.onFailure.${f}`) }}</span>
            <SHint inline size="xs" class="block">{{ t(`sticky.onFailureHint.${f}`) }}</SHint>
          </SRadio>
        </SGrid>
      </SField>
    </div>
    <template #footer>
      <SButton @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="primary" :loading="busy" @click="submit">{{ t('common.save') }}</SButton>
    </template>
  </SModal>
</template>
