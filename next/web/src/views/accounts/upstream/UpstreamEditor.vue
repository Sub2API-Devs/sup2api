<script setup lang="ts">
// SchemaForm widget `upstream-editor` (docs/UPSTREAM-DECLARATIVE.md §5): the
// account layer of a custom upstream type (auth, headers, route paths, the
// filtered fields let through) over the type's resolved declaration. The
// account editor provides the type and the server's field errors
// (ACCOUNT_FORM_KEY); a plugin (`host.components.UpstreamEditor`) passes
// them as props. The value is undefined while everything is default.
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SCheckbox, SHint, SInput, SSegmented, SSelect, SSettingsGroup } from '@sub2api/ui'
import type { AccountType, UpstreamAccountLayer } from '@/api/types'
import { ACCOUNT_FORM_KEY } from '@/components/schema/accountForm'
import {
  AUTH_TYPES,
  HEADER_MODES,
  SECTIONS,
  authHints,
  authOfType,
  baseAuth,
  defaultPath,
  headerHint,
  headerName,
  layerErrors,
  newHeader,
  pathHint,
  protocolName,
  readDraft,
  resetSection,
  routeProtocols,
  sectionLayer,
  writeLayer,
  type AuthType,
  type Draft,
  type HeaderRow,
  type Hint,
  type Section
} from './model'
import UpstreamSection from './UpstreamSection.vue'

// Extra widget props (schema, ui, multiple) must not land on the root.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ modelValue: UpstreamAccountLayer | null | undefined; disabled?: boolean; accountType?: AccountType | null; errors?: Record<string, string> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: UpstreamAccountLayer | undefined): void }>()
const { t } = useI18n()
const P = 'accounts.upstream'
const form = inject(ACCOUNT_FORM_KEY, null)

const accountType = computed(() => props.accountType ?? form?.accountType.value)
const up = computed(() => accountType.value?.upstream)
const passHeaders = computed(() => accountType.value?.pass_headers ?? [])
const serverErrors = computed(() => layerErrors(props.errors ?? form?.errors.value ?? {}))
const draft = ref<Draft | null>(null)
/** JSON of the layer last read or emitted: an echo of our own value does not reload the draft. */
let current = ''

function load() {
  current = JSON.stringify(props.modelValue ?? null)
  draft.value = up.value ? readDraft(props.modelValue, up.value) : null
}
watch(up, load, { immediate: true })
watch(
  () => props.modelValue,
  v => JSON.stringify(v ?? null) !== current && load()
)
watch(
  draft,
  d => {
    if (!d || !up.value) return
    const v = writeLayer(d, up.value)
    if (JSON.stringify(v ?? null) === current) return
    current = JSON.stringify(v ?? null)
    emit('update:modelValue', v)
  },
  { deep: true }
)

const authOptions = computed(() => AUTH_TYPES.map(v => ({ value: v, label: t(`${P}.auth.types.${v}`) })))
const modeOptions = computed(() => HEADER_MODES.map(v => ({ value: v, label: t(`${P}.headers.modes.${v}`) })))

/** The server's error at path, else the client hint: the line under an input. */
function note(path: string, hint?: Hint) {
  const server = serverErrors.value[path]
  if (server) return { text: server, tone: 'danger' as const }
  return hint ? { text: t(`${P}.hints.${hint.code}`, { name: hint.name ?? '' }), tone: 'warning' as const } : undefined
}

const view = computed(() => {
  const d = draft.value
  const u = up.value
  if (!d || !u) return null
  const base = baseAuth(u)
  const inherit = d.auth.type === base.type
  const authHint = authHints(d.auth, u)
  const protocols = routeProtocols(u)
  return {
    d,
    protocols,
    filterFields: u.filterFields ?? [],
    dirty: Object.fromEntries(SECTIONS.map(s => [s, sectionLayer(d, u, s) !== undefined])) as Record<Section, boolean>,
    authPlaceholder: {
      name: inherit ? base.name : t(`${P}.auth.namePlaceholder.${d.auth.type}`),
      value: inherit ? base.value : '{api_key}'
    },
    defaultPaths: Object.fromEntries(protocols.map(p => [p, defaultPath(u, p)])),
    /** By input: auth.name, auth.value, header.<row id>, route.<protocol>. */
    notes: {
      'auth.name': note('auth.name', authHint.name),
      'auth.value': note('auth.value', authHint.value),
      ...Object.fromEntries(
        d.headers.map(r => [`header.${r.id}`, note(`headers.${headerName(r)}`, headerHint(r, d, u, passHeaders.value))])
      ),
      ...Object.fromEntries(protocols.map(p => [`route.${p}`, note(`routes.${p}`, pathHint(d.paths[p] ?? '', u))]))
    } as Record<string, ReturnType<typeof note>>
  }
})
const customized = computed(() => !!view.value && Object.values(view.value.dirty).some(Boolean))

function reset(s?: Section) {
  if (draft.value && up.value) resetSection(draft.value, up.value, s)
}
function setAuthType(type: AuthType) {
  if (draft.value && up.value) draft.value.auth = authOfType(type, up.value)
}
function toggleHeader(r: HeaderRow) {
  if (r.base) r.removed = !r.removed
  else draft.value?.headers.splice(draft.value.headers.indexOf(r), 1)
}
function setAllowed(field: string, on: boolean) {
  const d = draft.value
  if (d) d.allow = on ? [...d.allow, field] : d.allow.filter(f => f !== field)
}
</script>

<template>
  <SHint v-if="!view" tone="warning" data-testid="upstream-editor-unavailable">{{ t(`${P}.noDefaults`) }}</SHint>
  <SSettingsGroup v-else dense :description="t(`${P}.hint`)" class="w-full" data-testid="upstream-editor">
    <template #actions>
      <SButton size="xs" variant="ghost" icon="refresh" :disabled="disabled || !customized" data-testid="upstream-reset" @click="reset()">{{
        t(`${P}.resetAll`)
      }}</SButton>
    </template>
    <p v-if="serverErrors['']" class="input-error-text py-2">{{ serverErrors[''] }}</p>

    <!-- auth -->
    <UpstreamSection
      :label="t(`${P}.auth.title`)"
      :error="serverErrors['auth'] || serverErrors['auth.type']"
      data-testid="upstream-auth"
      :hint="t(`${P}.auth.hint`)"
      :dirty="view.dirty.auth"
      :disabled="disabled"
      @reset="reset('auth')"
    >
      <div class="flex w-full flex-col gap-2 sm:w-96">
        <SSegmented
          :model-value="view.d.auth.type"
          :options="authOptions"
          size="sm"
          block
          :disabled="disabled"
          :aria-label="t(`${P}.auth.title`)"
          @update:model-value="setAuthType($event as AuthType)"
        />
        <template v-if="view.d.auth.type !== 'none'">
          <template v-for="f in ['name', 'value'] as const" :key="f">
            <SInput
              v-model="view.d.auth[f]"
              size="sm"
              mono
              :placeholder="view.authPlaceholder[f]"
              :aria-label="t(`${P}.auth.${f}`)"
              :error="!!view.notes[`auth.${f}`]"
              :disabled="disabled"
              :data-testid="`upstream-auth-${f}`"
            />
            <SHint v-if="view.notes[`auth.${f}`]" size="xs" :tone="view.notes[`auth.${f}`]!.tone">{{
              view.notes[`auth.${f}`]!.text
            }}</SHint>
          </template>
        </template>
      </div>
    </UpstreamSection>

    <!-- headers -->
    <UpstreamSection
      stacked
      :label="t(`${P}.headers.title`)"
      :error="serverErrors['headers']"
      data-testid="upstream-headers"
      :hint="t(`${P}.headers.hint`)"
      :dirty="view.dirty.headers"
      :disabled="disabled"
      @reset="reset('headers')"
    >
      <div class="w-full space-y-2">
        <div
          v-for="r in view.d.headers"
          :key="r.id"
          class="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,12rem)_7rem_minmax(0,1fr)_auto]"
          :data-testid="`upstream-header-${r.base ? r.name : 'new'}`"
        >
          <SInput
            v-model="r.name"
            size="sm"
            mono
            class="col-span-2 sm:col-span-1"
            :class="r.removed ? 'line-through opacity-60' : ''"
            :readonly="!!r.base"
            :placeholder="t(`${P}.headers.name`)"
            :aria-label="t(`${P}.headers.name`)"
            :disabled="disabled"
          />
          <SButton
            size="sm"
            variant="ghost"
            icon-only
            class="max-sm:col-start-3 max-sm:row-start-1 sm:order-last"
            :icon="r.removed ? 'refresh' : 'trash'"
            :aria-label="t(`${P}.headers.${r.removed ? 'restore' : 'remove'}`)"
            :disabled="disabled"
            data-testid="upstream-header-toggle"
            @click="toggleHeader(r)"
          />
          <SSelect
            v-model="r.mode"
            size="sm"
            :options="modeOptions"
            :aria-label="t(`${P}.headers.title`)"
            :disabled="disabled || r.removed"
          />
          <SInput
            v-model="r.value"
            size="sm"
            mono
            class="col-span-2 sm:col-span-1"
            :placeholder="r.base?.value ?? t(`${P}.headers.value`)"
            :aria-label="t(`${P}.headers.value`)"
            :error="!!view.notes[`header.${r.id}`]"
            :disabled="disabled || r.removed"
          />
          <SHint
            v-if="view.notes[`header.${r.id}`]"
            size="xs"
            class="col-span-3 sm:col-span-4"
            :tone="view.notes[`header.${r.id}`]!.tone"
            >{{ view.notes[`header.${r.id}`]!.text }}</SHint
          >
        </div>
        <SButton size="sm" icon="plus" :disabled="disabled" data-testid="upstream-header-add" @click="view.d.headers.push(newHeader())">{{
          t(`${P}.headers.add`)
        }}</SButton>
      </div>
    </UpstreamSection>

    <!-- routes -->
    <UpstreamSection
      v-if="view.protocols.length"
      stacked
      :label="t(`${P}.routes.title`)"
      :error="serverErrors['routes']"
      data-testid="upstream-routes"
      :hint="t(`${P}.routes.hint`)"
      :dirty="view.dirty.routes"
      :disabled="disabled"
      @reset="reset('routes')"
    >
      <div class="w-full space-y-2">
        <div v-for="p in view.protocols" :key="p" class="grid gap-1 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-3">
          <div class="min-w-0 text-sm">
            {{ protocolName(p) }} <span class="font-mono text-xs text-fg-muted">{{ p }}</span>
          </div>
          <SInput
            v-model="view.d.paths[p]"
            size="sm"
            mono
            :placeholder="view.defaultPaths[p]"
            :aria-label="protocolName(p)"
            :error="!!view.notes[`route.${p}`]"
            :disabled="disabled"
            :data-testid="`upstream-route-${p}`"
          />
          <SHint v-if="view.notes[`route.${p}`]" size="xs" class="sm:col-start-2" :tone="view.notes[`route.${p}`]!.tone">{{
            view.notes[`route.${p}`]!.text
          }}</SHint>
        </div>
      </div>
    </UpstreamSection>

    <!-- filtered fields let through -->
    <UpstreamSection
      v-if="view.filterFields.length"
      :label="t(`${P}.allow.title`)"
      :error="serverErrors['allowFields']"
      data-testid="upstream-allow"
      :hint="t(`${P}.allow.hint`)"
      :dirty="view.dirty.allowFields"
      :disabled="disabled"
      @reset="reset('allowFields')"
    >
      <div class="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
        <SCheckbox
          v-for="f in view.filterFields"
          :key="f"
          class="font-mono"
          :model-value="view.d.allow.includes(f)"
          :label="f"
          :disabled="disabled"
          :data-testid="`upstream-allow-${f}`"
          @update:model-value="setAllowed(f, $event)"
        />
      </div>
    </UpstreamSection>
  </SSettingsGroup>
</template>
