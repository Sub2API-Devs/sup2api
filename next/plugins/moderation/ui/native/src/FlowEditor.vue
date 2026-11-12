<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SLink, SSpinner } from '@sub2api/ui'
import FlowCanvas from './FlowCanvas.vue'
import FlowConfigCard from './FlowConfigCard.vue'
import FlowPublishDialog from './FlowPublishDialog.vue'
import FlowSimulate from './FlowSimulate.vue'
import FlowVersions from './FlowVersions.vue'
import { useCatalog } from './catalog'
import { joinList } from './format'
import { canManage, errorMessage, fetchFlow, publishFlow, saveFlow, setFlowEnabled, toastError, useModHost } from './host'
import type { Flow, Scope, Spec } from './types'
import { applyTemplate, auditorIndex, autoTimeoutMs, canonicalSpec, canvasAuditors, flowBody, isAuditorType, newSpec, NEW_FLOW_SCOPE, sameSpec } from './flowOps'
import { validateSpec, type SpecIssue } from './flowValidate'

// Flow editor (new-api flow-editor-form.tsx): name + draft kept locally and
// compared with the saved draft ("unsaved") and the published version
// ("unpublished"). Saving writes the draft; publishing saves first when
// needed and then publishes with expected_version. The enabled switch and
// the scope are columns of the flow, not of the spec: a change saves at once
// (before the first save it goes with the new flow).
const props = defineProps<{ flowId: number | null; groupLabel: (id: number) => string }>()
const emit = defineEmits<{
  (e: 'close'): void
  /** a new flow was saved for the first time */
  (e: 'created', id: number): void
  /** the flow changed on the server (the list reloads) */
  (e: 'changed'): void
  (e: 'manage'): void
}>()
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const loading = ref(true)
const loadError = ref('')
const saved = ref<Flow | null>(null)
const name = ref('')
const draft = ref<Spec>(newSpec())
/** The fields that apply at once. */
const live = reactive<{ enabled: boolean; scope: Scope | null }>({ enabled: true, scope: NEW_FLOW_SCOPE })
type LiveField = keyof typeof live
const busy = ref<'save' | 'publish' | 'discard' | LiveField | null>(null)
const publishOpen = ref(false)
const versionsOpen = ref(false)
const simulateOpen = ref(false)

// Auditors and channels of the library come from the shared catalog.
const catalog = useCatalog()
const auditors = computed(() => canvasAuditors(catalog.state.auditors, catalog.state.channels))
const lookup = computed(() => auditorIndex(auditors.value))

function resetFrom(f: Flow) {
  saved.value = f
  name.value = f.name
  draft.value = canonicalSpec(f.draft)
  Object.assign(live, { enabled: f.enabled, scope: f.scope })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const id = saved.value?.id ?? props.flowId
    const [f] = await Promise.all([id ? fetchFlow(id) : Promise.resolve(null), catalog.ensure()])
    if (f) resetFrom(f)
    else {
      // A new flow starts from the recommended "first → review" template.
      draft.value = applyTemplate(
        newSpec(),
        'first_review',
        auditors.value.filter((a) => isAuditorType(a.type))
      )
    }
  } catch (e) {
    loadError.value = errorMessage(e, t('flows.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** Reloads the saved flow after a publish, discard or rollback. */
async function refresh() {
  if (!saved.value) return
  try {
    resetFrom(await fetchFlow(saved.value.id))
  } catch (e) {
    toastError(e, 'flows.loadFailed')
  }
  emit('changed')
}

const isNew = computed(() => !saved.value)
const issues = computed(() => validateSpec(draft.value, lookup.value.typeOf))
const nameMissing = computed(() => !name.value.trim())
const dirty = computed(() => !saved.value || name.value !== saved.value.name || !sameSpec(draft.value, saved.value.draft))
const unpublished = computed(() => !saved.value?.version || saved.value.dirty)
const publishedVersion = computed(() => saved.value?.version ?? 0)
const autoMs = computed(() => autoTimeoutMs(draft.value, lookup.value.byId))
const groupNames = computed(() => (saved.value?.groups || []).map(props.groupLabel))
const accountBindings = computed(() => saved.value?.accounts?.length ?? 0)

function issueText(i: SpecIssue): string {
  const prefix = i.stage === undefined ? '' : t('flows.stagePrefix', { n: i.stage + 1 })
  const suffix = i.field ? ` (${i.field})` : i.auditor !== undefined && i.code === 'unknown_auditor' ? ` (#${i.auditor})` : ''
  return prefix + t(`flows.issue.${i.code}`) + suffix
}

function fail(e: unknown) {
  const fields = isApiError(e) ? Object.values(e.fields) : []
  if (isApiError(e) && e.fieldCodes.scope === 'invalid_scope') host.toast(t('flows.invalidScope'), 'error')
  else if (fields.length) host.toast(joinList(fields, 'clauseSep'), 'error')
  else toastError(e)
}

/**
 * Saves name + draft (creates a new flow); returns the saved flow. A new
 * flow counts as saved right after the POST, so a failed enable afterwards
 * never makes the next save create it again.
 */
async function persist(): Promise<Flow> {
  const body = flowBody(name.value.trim(), draft.value, live.scope)
  const creating = !saved.value
  const f = await saveFlow(saved.value?.id ?? null, body)
  saved.value = { ...f, draft: f.draft ?? body.draft }
  name.value = f.name
  if (creating) emit('created', f.id)
  emit('changed')
  if (creating && f.enabled !== live.enabled) await applyInitialEnabled(f)
  return saved.value
}

/** The enabled switch chosen before the first save, applied to the new flow. */
async function applyInitialEnabled(f: Flow) {
  try {
    await setFlowEnabled(f.id, live.enabled)
    saved.value = { ...saved.value!, enabled: live.enabled }
    emit('changed')
  } catch (e) {
    live.enabled = f.enabled
    fail(e)
  }
}

async function saveDraft() {
  busy.value = 'save'
  try {
    await persist()
    host.toast(t('flows.draftSaved'), 'success')
  } catch (e) {
    fail(e)
  } finally {
    busy.value = null
  }
}

async function publish() {
  busy.value = 'publish'
  const expected = publishedVersion.value
  try {
    const id = dirty.value ? (await persist()).id : saved.value!.id
    const f = await publishFlow(id, expected)
    publishOpen.value = false
    host.toast(t('flows.publishedV', { v: f?.version || expected + 1 }), 'success')
    await refresh()
  } catch (e) {
    if (isApiError(e) && (e.status === 409 || e.code === 'version_conflict')) host.toast(t('flows.publishConflict'), 'error')
    else fail(e)
  } finally {
    busy.value = null
  }
}

async function discard() {
  const f = saved.value
  if (!f?.published) return
  const ok = await host.confirm({ title: t('flows.discard'), message: t('flows.discardConfirm', { v: f.version }), confirmText: t('flows.discard'), danger: true })
  if (!ok) return
  busy.value = 'discard'
  try {
    // The published spec carries the resolved total timeout; a version
    // published as automatic goes back as 0 so the draft keeps following
    // its auditors.
    const spec = canonicalSpec(f.published)
    if (f.published_auto_timeout) spec.total_timeout_ms = 0
    await saveFlow(f.id, flowBody(f.name, spec, f.scope))
    host.toast(t('flows.discarded', { v: f.version }), 'success')
    await refresh()
  } catch (e) {
    fail(e)
  } finally {
    busy.value = null
  }
}

/** Saves a field that applies at once; before the first save it is only kept (persist sends it). */
async function saveLive<K extends LiveField>(field: K, v: (typeof live)[K], call: (f: Flow) => Promise<unknown>) {
  const f = saved.value
  if (!f) {
    live[field] = v
    return
  }
  busy.value = field
  try {
    await call(f)
    live[field] = v
    saved.value = { ...f, [field]: v }
    host.toast(t(`flows.${field}Saved`), 'success')
    emit('changed')
  } catch (e) {
    fail(e)
  } finally {
    busy.value = null
  }
}
const setEnabled = (v: boolean) => saveLive('enabled', v, (f) => setFlowEnabled(f.id, v))
/** The scope goes with the saved name and draft: the unsaved edits of the draft stay unsaved. */
const setScope = (v: Scope) => saveLive('scope', v, (f) => saveFlow(f.id, flowBody(f.name, f.draft, v)))

function openSimulate() {
  if (dirty.value) host.toast(t('flows.simulateUnsaved'), 'warning')
  simulateOpen.value = true
}

// ---- leaving with unsaved changes

/** Route changes and page unloads ask first (new-api FormNavigationGuard). */
const guarded = computed(() => manage.value && dirty.value && !isNew.value)
let allowLeave = false

const confirmLeave = () =>
  host.confirm({ title: t('flows.leaveTitle'), message: t('flows.leaveMessage'), confirmText: t('flows.leave'), cancelText: t('flows.stay'), danger: true })

async function requestClose() {
  // the back button also asks for a new flow that already has a name
  const ask = guarded.value || (manage.value && isNew.value && !nameMissing.value)
  if (ask && !(await confirmLeave())) return
  allowLeave = true
  emit('close')
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!guarded.value) return
  e.preventDefault()
  e.returnValue = ''
}

const offGuard = host.router.beforeEach((to, from) => {
  if (allowLeave || !guarded.value) return true
  if (to.path === from.path && to.query.flow === from.query.flow) return true
  // ?flow=new → ?flow=<id> after the first save
  if (to.path === from.path && from.query.flow === 'new' && to.query.flow === String(saved.value?.id)) return true
  return confirmLeave()
})

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  offGuard()
})
</script>

<template>
  <div class="mod-editor">
    <SLink as="button" class="mod-editor-back" @click="requestClose">← {{ t('flows.back') }}</SLink>
    <div class="mod-editor-title">
      <h2>{{ saved ? saved.name : t('flows.newTitle') }}</h2>
      <SBadge v-if="saved" tone="gray" class="mod-num">#{{ saved.id }}</SBadge>
      <SBadge tone="gray">{{ publishedVersion ? t('flows.badgePublished', { v: publishedVersion }) : t('flows.unpublished') }}</SBadge>
      <SBadge v-if="!loading && (dirty || unpublished)" tone="warning">{{ t('flows.badgeChanges') }}</SBadge>
    </div>

    <SSpinner v-if="loading" block />
    <SAlert v-else-if="loadError" tone="danger">
      {{ loadError }}
      <SButton size="sm" class="mod-ml" @click="load">{{ t('retry') }}</SButton>
    </SAlert>
    <template v-else>
      <FlowConfigCard
        v-model:name="name"
        v-model:draft="draft"
        :enabled="live.enabled"
        :scope="live.scope"
        :groups="groupNames"
        :accounts="accountBindings"
        :auto-ms="autoMs"
        :is-new="isNew"
        :disabled="!manage"
        :busy="busy"
        @update:enabled="setEnabled"
        @update:scope="setScope"
        @go-list="requestClose"
      />

      <SCard :title="t('flows.stagesTitle')" :subtitle="t('flows.stagesDesc')">
        <FlowCanvas v-model:spec="draft" :auditors="auditors" :disabled="!manage" @manage="emit('manage')" />
        <ul v-if="manage && issues.length" class="mod-issues" role="alert">
          <li v-for="(i, n) in issues" :key="`${n}-${i.code}`">{{ issueText(i) }}</li>
        </ul>
      </SCard>

      <div class="mod-editor-footer">
        <p class="mod-sub mod-mr-auto">{{ t('flows.footerNote') }}</p>
        <SButton v-if="saved && manage" size="sm" icon="play" @click="openSimulate">{{ t('flows.simulate') }}</SButton>
        <SButton v-if="saved" size="sm" icon="clock" @click="versionsOpen = true">{{ t('flows.versionHistory') }}</SButton>
        <template v-if="manage">
          <SButton size="sm" :loading="busy === 'discard'" :disabled="!!busy || !saved?.published || !(dirty || unpublished)" @click="discard">{{ t('flows.discard') }}</SButton>
          <SButton size="sm" :loading="busy === 'save'" :disabled="!!busy || nameMissing || !dirty" @click="saveDraft">{{ t('flows.saveDraft') }}</SButton>
          <span :title="nameMissing ? t('flows.nameRequired') : ''">
            <SButton size="sm" variant="primary" :disabled="!!busy || nameMissing || issues.length > 0" @click="publishOpen = true">{{ t('flows.publishV', { v: publishedVersion + 1 }) }}</SButton>
          </span>
        </template>
      </div>
    </template>

    <FlowPublishDialog
      v-model:open="publishOpen"
      :name="name.trim()"
      :next-version="publishedVersion + 1"
      :enabled="live.enabled"
      :draft="draft"
      :groups="groupNames"
      :accounts="accountBindings"
      :auditors="auditors"
      :loading="busy === 'publish'"
      @confirm="publish"
    />
    <FlowVersions v-model:open="versionsOpen" :flow="saved" @rolled-back="refresh" />
    <FlowSimulate v-model:open="simulateOpen" :flow="saved" />
  </div>
</template>
