<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SEmpty, SIcon, SSpinner, confirm, toast } from '@sub2api/ui'
import type { HostPermissionReview, PluginReview, Role } from '@/api/types'
import { lt } from '@/i18n'
import { errorMessage, notifyError } from '@/utils/errors'
import { formatBytes } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { dropReview, getReview } from './reviewCache'
import { RISK_ORDER, accountTypesOf, asArray, display, hpKey, pick, platformsOf, riskOf, type Risk } from './pluginUtil'
import PluginAvatar from './parts/PluginAvatar.vue'
import PluginGatewayDecl from './parts/PluginGatewayDecl.vue'
import RiskDot from './parts/RiskDot.vue'
import ScopeChips from './parts/ScopeChips.vue'
import TrustBadge from './parts/TrustBadge.vue'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const key = computed(() => String(route.params.key))
const version = computed(() => String(route.params.version))

const review = ref<PluginReview | null>(null)
const loading = ref(true)
const loadError = ref('')
const fromCache = ref(false)
const submitting = ref(false)
const rejecting = ref(false)
const showMissing = ref(false)

const checked = reactive<Record<string, boolean>>({})
const roles = ref<Role[]>([])
const roleKeys = ref<string[]>([])

interface HPRow extends HostPermissionReview {
  risk: Risk
  requiredPerm: string | null
  allowed: boolean
  locked: boolean
  diffTag: 'added' | 'widened' | null
}

function requiredPermOf(hp: HostPermissionReview, risk: Risk): string | null {
  if (hp.requires) return hp.requires
  if (risk === 'critical') return 'plugin:grant:critical'
  if (risk === 'high') return 'plugin:grant:high'
  return null
}

const rows = computed<HPRow[]>(() => {
  const r = review.value
  if (!r) return []
  const added = new Set(r.diff?.added || [])
  const widened = new Set(r.diff?.widened || [])
  return asArray<HostPermissionReview>(r.host_permissions)
    .map((hp) => {
      const risk = riskOf(hp.id, hp.risk)
      const requiredPerm = requiredPermOf(hp, risk)
      return {
        ...hp,
        risk,
        requiredPerm,
        allowed: !requiredPerm || auth.has(requiredPerm),
        locked: risk === 'low',
        diffTag: added.has(hp.id) ? ('added' as const) : widened.has(hp.id) ? ('widened' as const) : null
      }
    })
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || a.id.localeCompare(b.id))
})

function initChecks() {
  for (const k of Object.keys(checked)) delete checked[k]
  for (const row of rows.value) {
    if (row.locked) checked[row.id] = true
    else if (!row.allowed) checked[row.id] = false
    else if (row.risk === 'medium') checked[row.id] = !row.optional
    else checked[row.id] = false
  }
}

function toggle(row: HPRow, v: boolean) {
  if (row.locked || !row.allowed) return
  checked[row.id] = v
}

const missingRequired = computed(() => rows.value.filter((r) => !r.optional && !checked[r.id]))
const blockedByPermission = computed(() => rows.value.filter((r) => !r.optional && !r.allowed))
const signatureOk = computed(() => review.value?.signature_status === 'valid')
const canSubmit = computed(() => !!review.value && review.value.host_compat_ok !== false && blockedByPermission.value.length === 0)
const isUpgrade = computed(() => !!review.value?.diff)
const colon = computed(() => t('plugins.colon'))
const listSep = computed(() => t('plugins.listSep'))

function hpLabel(id: string): string {
  const k = `plugins.hp.${hpKey(id)}`
  return te(k) ? t(k) : id
}

function sigLabel(s: string | undefined): string {
  const v = s || 'unknown'
  return te(`plugins.signature.${v}`) ? t(`plugins.signature.${v}`) : v
}

// ------------------------------------------------------------------ "provides" formatting

function endpointText(e: Record<string, any>): string {
  const method = pick<string>(e, 'method')
  const path = pick<string>(e, 'path', 'route')
  const proto = pick<string>(e, 'protocol', 'id')
  const head = [method, path].filter(Boolean).join(' ')
  return head ? (proto ? `${head} (${proto})` : head) : display(e)
}

function hookMatch(h: Record<string, any>): string {
  const m = pick<Record<string, any>>(h, 'match') || {}
  const parts: string[] = []
  const protos = asArray<string>(m.protocols)
  const models = asArray<string>(m.models)
  const groups = asArray<string>(m.groups)
  if (protos.length) parts.push(protos.join(', '))
  parts.push(t('plugins.consent.models') + ': ' + (models.length === 0 || models.includes('*') ? t('common.all') : models.join(', ')))
  parts.push(t('plugins.consent.groups') + ': ' + (groups.length === 0 || groups.includes('*') ? t('common.all') : groups.join(', ')))
  return parts.join(' · ')
}

function hookNeeds(h: Record<string, any>): string[] {
  return asArray<string>(pick(h, 'needs', 'fields'))
}

function fieldLabel(f: string): string {
  const k = `plugins.fields.${hpKey(f)}`
  return te(k) ? t(k) : f
}

function hookFailure(h: Record<string, any>): string {
  const f = pick<string>(h, 'failure')
  if (!f) return ''
  return f === 'closed' ? t('plugins.consent.failClosed') : t('plugins.consent.failOpen')
}

function eventNames(list: unknown[]): string[] {
  const out: string[] = []
  for (const e of list) {
    if (typeof e === 'string') out.push(e)
    else if (e && typeof e === 'object') {
      const sub = (e as any).subscribe
      if (Array.isArray(sub)) out.push(...sub.map(String))
      else out.push(String(pick(e, 'type', 'name', 'id') ?? display(e)))
    }
  }
  return out
}

function routeText(r: Record<string, any>): string {
  return [pick(r, 'method'), pick(r, 'path')].filter(Boolean).join(' ') || display(r)
}

function menuText(m: Record<string, any>): string {
  const label = lt(pick(m, 'label', 'title')) || String(pick(m, 'id') ?? '')
  const type = pick<string>(m, 'type', 'page_type')
  return type ? `${label} (${type})` : label
}

const resourceItems = computed(() => {
  const r = review.value?.resources
  if (!r) return []
  const out: Array<{ label: string; value: string }> = []
  const mem = pick<number>(r, 'memoryMB', 'memory_mb')
  const cpu = pick<number>(r, 'cpu')
  const threads = pick<number>(r, 'maxProcs', 'max_threads', 'maxThreads')
  const files = pick<number>(r, 'maxOpenFiles', 'max_open_files')
  if (mem !== undefined) out.push({ label: t('plugins.resources.memory'), value: formatBytes(Number(mem) * 1024 * 1024) })
  if (cpu !== undefined) out.push({ label: t('plugins.resources.cpu'), value: t('plugins.resources.cores', { n: cpu }) })
  if (threads !== undefined) out.push({ label: t('plugins.resources.threads'), value: String(threads) })
  if (files !== undefined) out.push({ label: t('plugins.resources.files'), value: String(files) })
  return out
})

const capabilityIds = computed(() => asArray(review.value?.capabilities).map((c) => (typeof c === 'string' ? c : String((c as any)?.id ?? display(c)))))
const reviewAccountTypes = computed(() => accountTypesOf(review.value))
const reviewPlatforms = computed(() => platformsOf(review.value))

const hasProvides = computed(() => {
  const r = review.value
  if (!r) return false
  return (
    asArray(r.gateway_endpoints).length > 0 ||
    reviewPlatforms.value.length > 0 ||
    reviewAccountTypes.value.length > 0 ||
    asArray(r.hooks).length > 0 ||
    asArray(r.events).length > 0 ||
    asArray(r.jobs).length > 0 ||
    asArray(r.routes).length > 0 ||
    asArray(r.menus).length > 0 ||
    asArray(r.user_permissions).length > 0 ||
    !!r.database ||
    resourceItems.value.length > 0 ||
    asArray(r.external_services).length > 0
  )
})

// ------------------------------------------------------------------ load / submit

async function loadRoles() {
  if (!auth.has('role:read') || asArray(review.value?.user_permissions).length === 0) return
  try {
    const r = await api.list<Role>('/roles', { page_size: 200 })
    roles.value = r.items
    roleKeys.value = r.items.some((x) => x.key === 'admin') ? ['admin'] : []
  } catch {
    roles.value = []
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  fromCache.value = false
  try {
    review.value = await api.get<PluginReview>(
      `/plugins/${encodeURIComponent(key.value)}/versions/${encodeURIComponent(version.value)}/review`
    )
  } catch (e) {
    const cached = getReview(key.value, version.value)
    if (cached) {
      review.value = cached
      fromCache.value = true
    } else {
      review.value = null
      loadError.value = errorMessage(e)
    }
  } finally {
    loading.value = false
  }
  if (review.value) {
    initChecks()
    loadRoles()
  }
}

function toggleRole(k: string, v: boolean) {
  roleKeys.value = v ? [...new Set([...roleKeys.value, k])] : roleKeys.value.filter((x) => x !== k)
}

async function submit() {
  const r = review.value
  if (!r || !canSubmit.value) return
  if (missingRequired.value.length) {
    showMissing.value = true
    toast(t('plugins.consent.missingRequired', { list: missingRequired.value.map((x) => hpLabel(x.id)).join(', ') }), 'error')
    return
  }
  const grants = rows.value.filter((x) => checked[x.id]).map((x) => (x.scope ? { permission: x.id, scope: x.scope } : { permission: x.id }))
  const denied = rows.value.filter((x) => !checked[x.id]).map((x) => x.id)
  submitting.value = true
  try {
    await api.post(`/plugins/${encodeURIComponent(key.value)}/versions/${encodeURIComponent(version.value)}/consent`, {
      grants,
      denied,
      role_keys_for_new_permissions: roleKeys.value
    })
    dropReview(key.value, version.value)
    toast(t('plugins.consent.approved', { name: lt(r.name) || r.plugin_key, version: r.version }), 'success')
    router.push({ path: `/plugins/${encodeURIComponent(key.value)}`, query: { consented: version.value } })
  } catch (e) {
    notifyError(e)
  } finally {
    submitting.value = false
  }
}

async function reject() {
  const ok = await confirm({
    title: t('plugins.consent.rejectTitle'),
    message: t('plugins.consent.rejectConfirm', { name: lt(review.value?.name) || key.value, version: version.value }),
    danger: true,
    confirmText: t('plugins.consent.reject')
  })
  if (!ok) return
  rejecting.value = true
  try {
    await api.post(`/plugins/${encodeURIComponent(key.value)}/versions/${encodeURIComponent(version.value)}/reject`)
    dropReview(key.value, version.value)
    toast(t('plugins.consent.rejected'), 'success')
    router.push('/plugins')
  } catch (e) {
    notifyError(e)
  } finally {
    rejecting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl pb-24">
    <div class="mb-4">
      <RouterLink to="/plugins" class="link inline-flex items-center gap-1 text-sm">
        <SIcon name="arrow-left" class="h-4 w-4" />{{ t('plugins.list.title') }}
      </RouterLink>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><SSpinner size="lg" /></div>

    <SCard v-else-if="!review">
      <SEmpty icon="warning" :text="t('plugins.consent.notFound')">
        <p v-if="loadError" class="text-xs text-red-500">{{ loadError }}</p>
        <SButton size="sm" @click="load">{{ t('common.refresh') }}</SButton>
      </SEmpty>
    </SCard>

    <template v-else>
      <!-- header -->
      <SCard>
        <div class="flex flex-wrap items-start gap-4">
          <PluginAvatar :name="lt(review.name)" :plugin-key="review.plugin_key" size="lg" />
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ isUpgrade ? t('plugins.consent.titleUpgrade') : t('plugins.consent.titleInstall') }}{{ colon }}{{ lt(review.name) || review.plugin_key }}
              <span class="font-mono text-base text-gray-500">v{{ review.version }}</span>
            </h1>
            <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span class="inline-flex items-center gap-2">
                <span class="muted">{{ t('plugins.publisher') }}</span>
                <span class="font-medium">{{ review.publisher || '—' }}</span>
                <TrustBadge :trust="review.trust" />
              </span>
              <span class="inline-flex items-center gap-1.5">
                <SIcon :name="signatureOk ? 'check' : 'warning'" class="h-4 w-4" :class="signatureOk ? 'text-emerald-500' : 'text-red-500'" />
                <span :class="signatureOk ? '' : 'font-medium text-red-600 dark:text-red-400'">{{ t('plugins.consent.signature') }}{{ colon }}{{ sigLabel(review.signature_status) }}</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <SIcon :name="review.host_compat_ok ? 'check' : 'x'" class="h-4 w-4" :class="review.host_compat_ok ? 'text-emerald-500' : 'text-red-500'" />
                <span>{{ t('plugins.consent.hostCompat') }} <code class="font-mono text-xs">{{ review.host_compat || '—' }}</code></span>
              </span>
            </div>
            <div v-if="capabilityIds.length" class="mt-2 flex flex-wrap gap-1">
              <SBadge v-for="c in capabilityIds" :key="c" tone="gray">{{ c }}</SBadge>
            </div>
            <p v-if="fromCache" class="mt-2 text-xs muted">{{ t('plugins.consent.fromCache') }}</p>
          </div>
        </div>
      </SCard>

      <!-- warnings -->
      <div
        v-if="!review.host_compat_ok"
        class="mt-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
      >
        <SIcon name="x" class="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div class="font-semibold">{{ t('plugins.consent.incompatibleTitle') }}</div>
          <div>{{ t('plugins.consent.incompatibleBody', { range: review.host_compat || '—' }) }}</div>
        </div>
      </div>
      <div
        v-if="!signatureOk"
        class="mt-4 flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200"
      >
        <SIcon name="warning" class="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div class="font-semibold">{{ t('plugins.consent.signatureWarnTitle', { status: sigLabel(review.signature_status) }) }}</div>
          <div>{{ t('plugins.consent.signatureWarnBody') }}</div>
        </div>
      </div>

      <!-- upgrade diff -->
      <SCard v-if="review.diff" :title="t('plugins.consent.diffTitle')" class="mt-4">
        <div class="space-y-2 text-sm">
          <div v-if="review.diff.added?.length" class="flex flex-wrap items-center gap-1.5">
            <span class="w-24 shrink-0 font-medium text-red-600 dark:text-red-400">+ {{ t('plugins.consent.diffAdded') }}</span>
            <SBadge v-for="p in review.diff.added" :key="p" tone="danger">{{ hpLabel(p) }}</SBadge>
          </div>
          <div v-if="review.diff.widened?.length" class="flex flex-wrap items-center gap-1.5">
            <span class="w-24 shrink-0 font-medium text-orange-600 dark:text-orange-400">↑ {{ t('plugins.consent.diffWidened') }}</span>
            <SBadge v-for="p in review.diff.widened" :key="p" tone="warning">{{ hpLabel(p) }}</SBadge>
          </div>
          <div v-if="review.diff.removed?.length" class="flex flex-wrap items-center gap-1.5">
            <span class="w-24 shrink-0 font-medium muted">− {{ t('plugins.consent.diffRemoved') }}</span>
            <SBadge v-for="p in review.diff.removed" :key="p" tone="gray"><span class="line-through">{{ hpLabel(p) }}</span></SBadge>
          </div>
          <p v-if="!review.diff.added?.length && !review.diff.widened?.length && !review.diff.removed?.length" class="muted">
            {{ t('plugins.consent.diffNone') }}
          </p>
        </div>
      </SCard>

      <!-- what the plugin provides -->
      <SCard v-if="hasProvides" :title="t('plugins.consent.provides')" class="mt-4">
        <ul class="space-y-4 text-sm">
          <li v-if="reviewPlatforms.length">
            <div class="font-medium">{{ t('plugins.consent.platforms') }}</div>
            <div class="mt-1 pl-4">
              <PluginGatewayDecl :platforms="reviewPlatforms" :account-types="[]" section="platforms" />
            </div>
          </li>
          <li v-else-if="review.gateway_endpoints?.length">
            <div class="font-medium">{{ t('plugins.consent.gatewayEndpoints') }}</div>
            <ul class="mt-1 space-y-0.5 pl-4">
              <li v-for="(e, i) in review.gateway_endpoints" :key="i" class="font-mono text-xs">{{ endpointText(e) }}</li>
            </ul>
          </li>

          <li v-if="reviewAccountTypes.length">
            <div class="font-medium">{{ t('plugins.consent.accountTypes') }}</div>
            <div class="mt-1 pl-4" data-testid="review-account-types">
              <PluginGatewayDecl :platforms="reviewPlatforms" :account-types="reviewAccountTypes" section="account_types" />
            </div>
          </li>

          <li v-if="review.hooks?.length">
            <div class="font-medium">{{ t('plugins.consent.hooks') }}</div>
            <ul class="mt-1 space-y-2 pl-4">
              <li v-for="(h, i) in review.hooks" :key="i" class="text-xs">
                <div>
                  <span class="font-mono font-medium">{{ h.point }}</span>
                  <span v-if="h.id" class="muted"> #{{ h.id }}</span>
                  <span class="muted"> — {{ hookMatch(h) }}</span>
                </div>
                <div class="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span v-if="hookNeeds(h).length">
                    <span class="muted">{{ t('plugins.consent.reads') }}{{ colon }}</span>{{ hookNeeds(h).map(fieldLabel).join(listSep) }}
                  </span>
                  <span v-if="pick(h, 'maxPromptBytes', 'max_prompt_bytes')">
                    <span class="muted">{{ t('plugins.consent.maxPrompt') }}{{ colon }}</span>{{ formatBytes(Number(pick(h, 'maxPromptBytes', 'max_prompt_bytes'))) }}
                  </span>
                  <span v-if="pick(h, 'timeoutMs', 'timeout_ms')">
                    <span class="muted">{{ t('plugins.consent.timeout') }}{{ colon }}</span>{{ pick(h, 'timeoutMs', 'timeout_ms') }}ms
                  </span>
                  <span v-if="hookFailure(h)">
                    <span class="muted">{{ t('plugins.consent.onFailure') }}{{ colon }}</span>
                    <span :class="h.failure === 'closed' ? 'text-red-600 dark:text-red-400' : ''">{{ hookFailure(h) }}</span>
                  </span>
                </div>
              </li>
            </ul>
          </li>

          <li v-if="review.events?.length">
            <span class="font-medium">{{ t('plugins.consent.events') }}{{ colon }}</span>
            <span class="font-mono text-xs">{{ eventNames(review.events).join(', ') }}</span>
          </li>

          <li v-if="review.jobs?.length">
            <span class="font-medium">{{ t('plugins.consent.jobs') }}{{ colon }}</span>
            <span v-for="(j, i) in review.jobs" :key="i" class="mr-3 text-xs">
              <span class="font-mono">{{ j.id }}</span>
              <span class="muted"> ({{ j.schedule }})</span>
            </span>
          </li>

          <li v-if="review.routes?.length">
            <div class="font-medium">{{ t('plugins.consent.routes') }}</div>
            <ul class="mt-1 space-y-0.5 pl-4">
              <li v-for="(r, i) in review.routes" :key="i" class="text-xs">
                <span class="font-mono">{{ routeText(r) }}</span>
                <SBadge v-if="r.scope" class="ml-2" :tone="r.scope === 'public' || r.scope === 'webhook' ? 'warning' : 'gray'">{{ r.scope }}</SBadge>
                <span v-if="r.permission" class="ml-2 muted">{{ r.permission }}</span>
              </li>
            </ul>
          </li>

          <li v-if="review.menus?.length">
            <span class="font-medium">{{ t('plugins.consent.menus') }}{{ colon }}</span>
            <span class="text-xs">{{ review.menus.map(menuText).join(listSep) }}</span>
          </li>

          <li v-if="review.user_permissions?.length">
            <div class="font-medium">{{ t('plugins.consent.userPermissions') }}</div>
            <ul class="mt-1 flex flex-wrap gap-1.5 pl-4">
              <li v-for="p in review.user_permissions" :key="p.key">
                <SBadge :tone="p.sensitive ? 'warning' : 'gray'" :title="lt(p.description)">
                  {{ lt(p.label) || p.key }}
                  <span class="font-mono opacity-70">({{ p.key }})</span>
                  <SIcon v-if="p.sensitive" name="lock" class="h-3 w-3" />
                </SBadge>
              </li>
            </ul>
            <div v-if="roles.length" class="mt-2 pl-4">
              <div class="text-xs muted">{{ t('plugins.consent.grantToRoles') }}</div>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <label v-for="r in roles" :key="r.key" class="inline-flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    class="checkbox"
                    :checked="roleKeys.includes(r.key)"
                    @change="toggleRole(r.key, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ lt(r.name) || r.key }}
                </label>
              </div>
            </div>
          </li>

          <li v-if="review.database">
            <span class="font-medium">{{ t('plugins.consent.database') }}{{ colon }}</span>
            <span class="text-xs">
              schema <code class="font-mono">{{ review.database.schema }}</code>{{ listSep }}{{ t('plugins.consent.migrations', { n: review.database.migrations?.length || 0 }) }}
            </span>
            <details v-if="review.database.migrations?.length" class="mt-1 pl-4 text-xs">
              <summary class="cursor-pointer muted">{{ t('plugins.consent.showMigrations') }}</summary>
              <ul class="mt-1 font-mono">
                <li v-for="m in review.database.migrations" :key="m">{{ m }}</li>
              </ul>
            </details>
          </li>

          <li v-if="resourceItems.length">
            <span class="font-medium">{{ t('plugins.consent.resources') }}{{ colon }}</span>
            <span class="text-xs">{{ resourceItems.map((x) => `${x.label} ${x.value}`).join(listSep) }}</span>
          </li>

          <li v-if="review.external_services?.length">
            <span class="font-medium">{{ t('plugins.consent.externalServices') }}{{ colon }}</span>
            <code v-for="s in review.external_services" :key="s" class="mr-2 font-mono text-xs">{{ s }}</code>
          </li>
        </ul>
      </SCard>

      <!-- host permissions -->
      <SCard :title="t('plugins.consent.hostPermissions')" :subtitle="t('plugins.consent.hostPermissionsHint')" class="mt-4">
        <SEmpty v-if="rows.length === 0" :text="t('plugins.consent.noHostPermissions')" />
        <ul v-else class="divide-y divide-gray-100 dark:divide-dark-700">
          <li
            v-for="row in rows"
            :key="row.id"
            class="flex items-start gap-3 py-3"
            :class="[
              !row.allowed ? 'opacity-60' : '',
              showMissing && !row.optional && !checked[row.id] ? '-mx-2 rounded-lg bg-red-50 px-2 dark:bg-red-950/30' : '',
              row.diffTag ? 'border-l-4 border-l-orange-400 pl-2' : ''
            ]"
          >
            <RiskDot :risk="row.risk" class="mt-1" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ hpLabel(row.id) }}</span>
                <code class="font-mono text-xs muted">{{ row.id }}</code>
                <SBadge :tone="row.risk === 'critical' ? 'danger' : row.risk === 'high' ? 'warning' : row.risk === 'medium' ? 'warning' : 'success'">
                  {{ t(`plugins.risk.${row.risk}`) }}
                </SBadge>
                <SBadge v-if="row.optional" tone="gray">{{ t('common.optional') }}</SBadge>
                <SBadge v-if="row.diffTag === 'added'" tone="danger">{{ t('plugins.consent.diffAdded') }}</SBadge>
                <SBadge v-if="row.diffTag === 'widened'" tone="warning">{{ t('plugins.consent.diffWidened') }}</SBadge>
              </div>
              <p v-if="te(`plugins.hpDesc.${hpKey(row.id)}`)" class="mt-0.5 text-xs muted" :data-hp-desc="row.id">{{ t(`plugins.hpDesc.${hpKey(row.id)}`) }}</p>
              <p v-if="row.reason" class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ lt(row.reason) }}</p>
              <p v-if="row.risk === 'critical'" class="mt-0.5 text-xs text-red-600 dark:text-red-400">
                {{ te(`plugins.hpWarn.${hpKey(row.id)}`) ? t(`plugins.hpWarn.${hpKey(row.id)}`) : t('plugins.consent.criticalWarn') }}
              </p>
              <ScopeChips :scope="row.scope" class="mt-1" />
              <p v-if="!row.allowed" class="mt-1 flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                <SIcon name="lock" class="h-3.5 w-3.5" />
                {{ t('plugins.consent.needPermission', { perm: row.requiredPerm }) }}
              </p>
            </div>
            <div class="shrink-0 pt-0.5">
              <span v-if="row.locked" class="text-xs muted">{{ t('plugins.consent.auto') }}</span>
              <input
                v-else
                type="checkbox"
                class="checkbox h-5 w-5"
                :checked="!!checked[row.id]"
                :disabled="!row.allowed"
                @change="toggle(row, ($event.target as HTMLInputElement).checked)"
              />
            </div>
          </li>
        </ul>
      </SCard>

      <!-- footer -->
      <div
        class="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-dark-700 dark:bg-dark-800/95"
      >
        <div class="min-w-0 text-sm">
          <p v-if="!review.host_compat_ok" class="text-red-600 dark:text-red-400">{{ t('plugins.consent.incompatibleTitle') }}</p>
          <p v-else-if="blockedByPermission.length" class="text-orange-700 dark:text-orange-300">
            {{ t('plugins.consent.blockedByPermission', { list: blockedByPermission.map((x) => hpLabel(x.id)).join(', ') }) }}
          </p>
          <p v-else-if="missingRequired.length" class="text-gray-600 dark:text-gray-300">
            {{ t('plugins.consent.stillRequired', { n: missingRequired.length }) }}
          </p>
          <p v-else class="muted">{{ t('plugins.consent.stepUpHint') }}</p>
        </div>
        <div class="flex gap-2">
          <SButton variant="danger" :loading="rejecting" :disabled="submitting" @click="reject">{{ t('plugins.consent.reject') }}</SButton>
          <SButton variant="primary" :loading="submitting" :disabled="!canSubmit || rejecting" @click="submit">
            <SIcon name="shield" class="h-4 w-4" />{{ isUpgrade ? t('plugins.consent.approveUpgrade') : t('plugins.consent.approve') }}
          </SButton>
        </div>
      </div>
    </template>
  </div>
</template>
