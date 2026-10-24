<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SEmpty, SHint, SIcon, SLink, SSpinner, confirm, toast } from '@sub2api/ui'
import type { HostPermissionReview, PluginReview, Role } from '@/api/types'
import { lt } from '@/i18n'
import { errorMessage, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { dropReview, getReview } from './reviewCache'
import { RISK_ORDER, asArray, capabilityIdsOf, riskOf, type Risk } from './pluginUtil'
import PluginAvatar from './parts/PluginAvatar.vue'
import TrustBadge from './parts/TrustBadge.vue'
import ProvidesSummary from './consent/ProvidesSummary.vue'
import HostPermissionTable from './consent/HostPermissionTable.vue'
import type { HPRow } from './consent/hostPermission'
import { useConsentLabels } from './consent/hostPermission'
import { useOptionalT } from '@/composables/optionalText'
import { fetchFirstPage } from '@/composables/lookups'

const { t } = useI18n()
const tr = useOptionalT()
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
const { colon, hpLabel } = useConsentLabels()

function sigLabel(s: string | undefined): string {
  const v = s || 'unknown'
  return tr(`plugins.signature.${v}`, undefined, v)
}

// ------------------------------------------------------------------ "provides" formatting

const capabilityIds = computed(() => capabilityIdsOf(review.value?.capabilities))

// ------------------------------------------------------------------ load / submit

async function loadRoles() {
  if (!auth.has('role:read') || asArray(review.value?.user_permissions).length === 0) return
  try {
    const items = await fetchFirstPage<Role>('/roles')
    roles.value = items
    roleKeys.value = items.some((x) => x.key === 'admin') ? ['admin'] : []
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
      <SLink to="/plugins" class="inline-flex items-center gap-1 text-sm">
        <SIcon name="arrow-left" class="h-4 w-4" />{{ t('plugins.list.title') }}
      </SLink>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><SSpinner size="lg" /></div>

    <SCard v-else-if="!review">
      <SEmpty icon="warning" :text="t('plugins.consent.notFound')">
        <SHint v-if="loadError" size="xs" tone="danger">{{ loadError }}</SHint>
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
                <SHint inline>{{ t('plugins.publisher') }}</SHint>
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
            <SHint v-if="fromCache" size="xs" class="mt-2">{{ t('plugins.consent.fromCache') }}</SHint>
          </div>
        </div>
      </SCard>

      <!-- warnings -->
      <SAlert v-if="!review.host_compat_ok" tone="danger" icon="x" :title="t('plugins.consent.incompatibleTitle')" class="mt-4">
        {{ t('plugins.consent.incompatibleBody', { range: review.host_compat || '—' }) }}
      </SAlert>
      <SAlert v-if="!signatureOk" tone="warning" :title="t('plugins.consent.signatureWarnTitle', { status: sigLabel(review.signature_status) })" class="mt-4">
        {{ t('plugins.consent.signatureWarnBody') }}
      </SAlert>

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
            <SHint inline class="w-24 shrink-0 font-medium">− {{ t('plugins.consent.diffRemoved') }}</SHint>
            <SBadge v-for="p in review.diff.removed" :key="p" tone="gray"><span class="line-through">{{ hpLabel(p) }}</span></SBadge>
          </div>
          <SHint v-if="!review.diff.added?.length && !review.diff.widened?.length && !review.diff.removed?.length">
            {{ t('plugins.consent.diffNone') }}
          </SHint>
        </div>
      </SCard>

      <!-- what the plugin provides -->
      <ProvidesSummary :review="review" :roles="roles" :role-keys="roleKeys" @toggle-role="toggleRole" />

      <!-- host permissions -->
      <HostPermissionTable :rows="rows" :checked="checked" :show-missing="showMissing" @toggle="toggle" />

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
        </div>
        <div class="flex gap-2">
          <SButton variant="danger" :loading="rejecting" :disabled="submitting" @click="reject">{{ t('plugins.consent.reject') }}</SButton>
          <SButton variant="primary" :loading="submitting" :disabled="!canSubmit || rejecting" icon="shield" data-testid="consent-approve" @click="submit">
            {{ isUpgrade ? t('plugins.consent.approveUpgrade') : t('plugins.consent.approve') }}
          </SButton>
        </div>
      </div>
    </template>
  </div>
</template>
