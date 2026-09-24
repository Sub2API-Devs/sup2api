<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, isApiError } from '@sub2api/host'
import { SBadge, SButton, SCard, SEmpty, SIcon, SSpinner, confirm, toast } from '@sub2api/ui'
import type { Rollout, RolloutNode } from '@/api/types'
import { lt } from '@/i18n'
import { errorMessage, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import { ROLLOUT_RUNNING, asArray, display, formatDuration, pick, statusTone, type PluginDetail } from './pluginUtil'
import StatusBadge from './parts/StatusBadge.vue'

type StepState = 'waiting' | 'running' | 'done' | 'failed' | 'skipped' | 'cancelled'

const POLL_MS = 1500

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const key = computed(() => String(route.params.key))
const rollout = ref<Rollout | null>(null)
const detail = ref<PluginDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const cancelling = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let stopped = false
let shellRefreshedFor: number | null = null

const phase = computed(() => rollout.value?.phase || '')
const running = computed(() => ROLLOUT_RUNNING.has(phase.value))
const nodes = computed<RolloutNode[]>(() => rollout.value?.nodes || [])
const name = computed(() => (detail.value ? lt(detail.value.name) || detail.value.key : key.value))
const migrations = computed(() => asArray<Record<string, any>>(pick(rollout.value, 'migrations')))

const migrationStep = computed<StepState>(() => {
  const r = rollout.value
  if (!r) return 'waiting'
  if (r.action === 'disable') return 'skipped'
  const anyProgress = nodes.value.some((n) => n.state !== 'pending')
  if (phase.value === 'preparing') return anyProgress ? 'done' : 'running'
  if (phase.value === 'failed' || phase.value === 'rolled_back') return anyProgress || migrations.value.length ? 'done' : 'failed'
  if (phase.value === 'cancelled') return anyProgress ? 'done' : 'cancelled'
  return 'done'
})

const prepareStep = computed<StepState>(() => {
  if (!rollout.value) return 'waiting'
  if (nodes.value.some((n) => n.state === 'failed')) return 'failed'
  if (nodes.value.length && nodes.value.every((n) => n.state === 'ready' || n.state === 'active')) return 'done'
  if (phase.value === 'activating' || phase.value === 'active') return 'done'
  if (phase.value === 'cancelled') return 'cancelled'
  if (phase.value === 'failed' || phase.value === 'rolled_back') return 'failed'
  return migrationStep.value === 'running' ? 'waiting' : 'running'
})

const activateStep = computed<StepState>(() => {
  switch (phase.value) {
    case 'active':
      return 'done'
    case 'activating':
      return 'running'
    case 'failed':
    case 'rolled_back':
      return prepareStep.value === 'done' ? 'failed' : 'waiting'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'waiting'
  }
})

function stepIcon(s: StepState) {
  return s === 'done' ? 'check' : s === 'failed' ? 'x' : s === 'cancelled' ? 'stop' : s === 'skipped' ? 'chevron-right' : 'clock'
}

function stepCls(s: StepState) {
  switch (s) {
    case 'done':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'failed':
      return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    case 'running':
      return 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300'
    default:
      return 'bg-gray-100 text-gray-400 dark:bg-dark-700 dark:text-dark-400'
  }
}

function nodeIcon(n: RolloutNode) {
  return n.state === 'ready' || n.state === 'active' ? '✓' : n.state === 'failed' ? '✗' : '⏳'
}

async function loadDetail() {
  try {
    detail.value = await api.get<PluginDetail>(`/plugins/${encodeURIComponent(key.value)}`)
  } catch {
    /* header falls back to the key */
  }
}

async function refreshShell() {
  try {
    await usePluginStore().refresh()
    await useAppStore().loadMenus()
  } catch {
    /* best effort */
  }
}

async function poll() {
  clearTimeout(timer)
  try {
    const r = await api.get<Rollout | null>(`/plugins/${encodeURIComponent(key.value)}/rollouts/current`)
    const wasRunning = running.value
    rollout.value = r && typeof r === 'object' && 'phase' in r ? r : null
    loadError.value = ''
    if (rollout.value && !ROLLOUT_RUNNING.has(rollout.value.phase)) {
      if (wasRunning || !detail.value) await loadDetail()
      if (rollout.value.phase === 'active' && shellRefreshedFor !== rollout.value.id) {
        shellRefreshedFor = rollout.value.id
        await refreshShell()
      }
    }
  } catch (e) {
    if (isApiError(e) && e.status === 404) {
      rollout.value = null
      loadError.value = ''
    } else loadError.value = errorMessage(e)
  } finally {
    loading.value = false
  }
  if (!stopped && (running.value || (loadError.value && !rollout.value))) timer = setTimeout(poll, POLL_MS)
}

async function cancel() {
  const r = rollout.value
  if (!r) return
  const ok = await confirm({
    title: t('plugins.rollout.cancelTitle'),
    message: t('plugins.rollout.cancelConfirm'),
    danger: true,
    confirmText: t('plugins.rollout.cancel')
  })
  if (!ok) return
  cancelling.value = true
  try {
    await api.post(`/plugins/${encodeURIComponent(key.value)}/rollouts/${r.id}/cancel`)
    toast(t('plugins.rollout.cancelRequested'), 'success')
    await poll()
  } catch (e) {
    notifyError(e)
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  loadDetail()
  poll()
})
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(timer)
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-4">
      <RouterLink :to="`/plugins/${encodeURIComponent(key)}`" class="link inline-flex items-center gap-1 text-sm">
        <SIcon name="arrow-left" class="h-4 w-4" />{{ name }}
      </RouterLink>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><SSpinner size="lg" /></div>

    <SCard v-else-if="!rollout">
      <SEmpty icon="info" :text="loadError || t('plugins.rollout.none')">
        <RouterLink :to="`/plugins/${encodeURIComponent(key)}`" class="btn btn-secondary btn-sm">{{ t('plugins.rollout.backToDetail') }}</RouterLink>
      </SEmpty>
    </SCard>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ name }}
          <span class="mx-1 text-gray-400">·</span>
          <span class="text-base font-normal">{{ t(`plugins.rollout.actions.${rollout.action}`) }}</span>
          <span class="ml-2 font-mono text-base font-normal text-gray-500">
            <template v-if="rollout.from_version">v{{ rollout.from_version }} → </template>v{{ rollout.target_version }}
          </span>
        </h1>
        <div class="flex items-center gap-2 text-sm">
          <span class="muted">{{ t('plugins.rollout.phase') }}</span>
          <StatusBadge :status="rollout.phase" />
          <SSpinner v-if="running" size="sm" class="text-primary-500" />
        </div>
      </div>

      <!-- result banners -->
      <div
        v-if="phase === 'active'"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <span class="inline-flex items-center gap-2 font-medium">
          <SIcon name="check" class="h-5 w-5" />{{ t(`plugins.rollout.success.${rollout.action}`, { version: rollout.target_version }) }}
        </span>
        <RouterLink :to="`/plugins/${encodeURIComponent(key)}`" class="btn btn-primary btn-sm">{{ t('plugins.rollout.backToDetail') }}</RouterLink>
      </div>
      <div
        v-else-if="!running"
        class="mb-4 rounded-xl border p-4 text-sm"
        :class="
          phase === 'cancelled'
            ? 'border-gray-300 bg-gray-50 text-gray-800 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200'
            : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
        "
      >
        <div class="flex items-center gap-2 font-medium">
          <SIcon :name="phase === 'cancelled' ? 'stop' : 'warning'" class="h-5 w-5" />
          {{ t(`plugins.rollout.ended.${phase}`, { version: detail?.active_version || rollout.from_version || '—' }) }}
        </div>
        <pre v-if="rollout.error" class="mt-2 whitespace-pre-wrap break-all font-mono text-xs">{{ rollout.error }}</pre>
        <RouterLink :to="`/plugins/${encodeURIComponent(key)}`" class="btn btn-secondary btn-sm mt-3">{{ t('plugins.rollout.backToDetail') }}</RouterLink>
      </div>

      <SCard>
        <ol class="space-y-6">
          <!-- ① migrations -->
          <li class="flex gap-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="stepCls(migrationStep)">
              <SSpinner v-if="migrationStep === 'running'" size="sm" />
              <SIcon v-else :name="stepIcon(migrationStep)" class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium">① {{ t('plugins.rollout.steps.migrate') }}</div>
              <p class="text-sm muted">{{ t(`plugins.rollout.stepState.${migrationStep}`) }}</p>
              <ul v-if="migrations.length" class="mt-1 space-y-0.5 text-xs">
                <li v-for="(m, i) in migrations" :key="i" class="font-mono">
                  ✓ {{ display(pick(m, 'id', 'name', 'migration_id') ?? m) }}
                  <span v-if="pick(m, 'node_id')" class="muted"> ({{ pick(m, 'node_id') }}, {{ formatDuration(pick(m, 'duration_ms')) }})</span>
                </li>
              </ul>
            </div>
          </li>

          <!-- ② prepare -->
          <li class="flex gap-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="stepCls(prepareStep)">
              <SSpinner v-if="prepareStep === 'running'" size="sm" />
              <SIcon v-else :name="stepIcon(prepareStep)" class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium">② {{ t('plugins.rollout.steps.prepare') }}</div>
              <p v-if="!nodes.length" class="text-sm muted">{{ t('plugins.rollout.noNodes') }}</p>
              <ul v-else class="mt-2 space-y-1.5">
                <li v-for="n in nodes" :key="n.node_id + n.boot_id" class="flex flex-wrap items-center gap-2 text-sm">
                  <span class="w-5 text-center">{{ nodeIcon(n) }}</span>
                  <span class="font-medium">{{ n.node_id }}</span>
                  <SBadge :tone="statusTone(n.state)">{{ t(`plugins.status.${n.state}`) }}</SBadge>
                  <SBadge v-if="n.node_id === rollout.coordinator" tone="purple">{{ t('plugins.rollout.coordinator') }}</SBadge>
                  <span v-if="n.error" class="w-full pl-7 font-mono text-xs text-red-600 dark:text-red-400">{{ n.error }}</span>
                </li>
              </ul>
            </div>
          </li>

          <!-- ③ activate -->
          <li class="flex gap-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="stepCls(activateStep)">
              <SSpinner v-if="activateStep === 'running'" size="sm" />
              <SIcon v-else :name="stepIcon(activateStep)" class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium">③ {{ t('plugins.rollout.steps.activate') }}</div>
              <p class="text-sm muted">
                {{ activateStep === 'waiting' && running ? t('plugins.rollout.waitingAllReady') : t(`plugins.rollout.stepState.${activateStep}`) }}
              </p>
            </div>
          </li>
        </ol>

        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm dark:border-dark-700">
          <span>
            <span class="muted">{{ t('plugins.rollout.liveVersion') }}</span>
            <span class="ml-2 font-mono">{{ detail?.active_version ? 'v' + detail.active_version : '—' }}</span>
            <span v-if="rollout.coordinator" class="ml-4 muted">{{ t('plugins.rollout.coordinator') }}: {{ rollout.coordinator }}</span>
          </span>
          <SButton v-if="phase === 'preparing' && auth.has('plugin:manage')" variant="danger" :loading="cancelling" @click="cancel">
            <SIcon name="stop" class="h-4 w-4" />{{ t('plugins.rollout.cancel') }}
          </SButton>
        </div>
      </SCard>
    </template>
  </div>
</template>
