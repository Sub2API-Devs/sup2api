<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { isFeatureCatalog, type FeatureCatalog, type FeatureStatus } from './featureCatalog'
import WorkerCapabilities from './WorkerCapabilities.vue'

const props = withDefaults(defineProps<{ scope?: 'api' | 'cc' }>(), { scope: 'api' })
const emit = defineEmits<{ cc: [] }>()
const { t } = useI18n()
const catalog = ref<FeatureCatalog | null>(null)
const loading = ref(false), failed = ref(false), query = ref(''), status = ref(''), page = ref(1), expanded = ref('')
const pageSize = 8
// CC features are few and shown in full: no pages, every detail open.
const flat = computed(() => props.scope === 'cc')
// Fully supported features are documented in the Worker's catalog only; the
// page lists what is limited, unsupported or unverified.
const statuses: FeatureStatus[] = ['partial', 'unsupported', 'unverified']
const filtered = computed(() => (catalog.value?.features || []).filter(feature => feature.scope === props.scope && feature.status !== 'supported' &&
  (!status.value || feature.status === status.value) &&
  [feature.title, feature.id, feature.reason, ...feature.body_paths, ...feature.beta_headers].join(' ').toLowerCase().includes(query.value.trim().toLowerCase())))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visible = computed(() => flat.value ? filtered.value : filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const isOpen = (id: string) => flat.value || expanded.value === id
watch([query, status], () => { page.value = 1; expanded.value = '' })
async function load() {
  if (loading.value) return
  loading.value = true; failed.value = false
  try {
    const response = await api.get<unknown>('/system/ccgateway/features')
    if (!isFeatureCatalog(response)) throw new Error('unsupported feature catalog')
    catalog.value = response
    page.value = 1
  } catch { catalog.value = null; failed.value = true }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="space-y-3" data-testid="feature-support">
    <!-- The CC catalog sits under the CC features heading, which already explains it. -->
    <div v-if="!flat">
      <h4 class="font-semibold">{{ t('ccgateway.features.title') }}</h4>
      <p class="mt-1 text-xs text-gray-500">{{ t('ccgateway.features.baseline') }}</p>
    </div>
    <p v-if="loading" role="status" class="text-sm text-gray-500">{{ t('ccgateway.features.loading') }}</p>
    <div v-else-if="failed" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
      <p>{{ t('ccgateway.features.loadFailed') }}</p>
      <button type="button" class="btn btn-secondary btn-sm mt-2" @click="load">{{ t('ccgateway.features.retry') }}</button>
    </div>
    <template v-else-if="catalog">
      <div class="flex flex-wrap gap-2">
        <input v-model="query" type="search" class="input min-w-40 flex-1" :aria-label="t('ccgateway.features.search')" :placeholder="t('ccgateway.features.search')" data-testid="feature-search" />
        <select v-model="status" class="input w-auto" :aria-label="t('ccgateway.features.filter')" data-testid="feature-filter">
          <option value="">{{ t('ccgateway.features.all') }}</option>
          <option v-for="value in statuses" :key="value" :value="value">{{ t('ccgateway.features.status.' + value) }}</option>
        </select>
      </div>
      <div class="divide-y rounded-lg border border-gray-200 dark:divide-dark-700 dark:border-dark-700">
        <div v-for="feature in visible" :key="feature.id" :data-testid="'feature-' + feature.id">
          <div v-if="flat" class="flex w-full items-center justify-between gap-3 p-3 text-left text-sm">
            <span class="min-w-0"><span class="font-medium">{{ feature.title }}</span><code class="ml-2 break-all text-xs text-gray-500">{{ feature.id }}</code></span>
            <span class="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-dark-700">{{ t('ccgateway.features.status.' + feature.status) }}</span>
          </div>
          <button v-else type="button" class="flex w-full items-center justify-between gap-3 p-3 text-left text-sm" :aria-expanded="expanded === feature.id" :aria-controls="'feature-detail-' + feature.id" @click="expanded = expanded === feature.id ? '' : feature.id">
            <span class="min-w-0"><span class="font-medium">{{ feature.title }}</span><code class="ml-2 break-all text-xs text-gray-500">{{ feature.id }}</code></span>
            <span class="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-dark-700">{{ t('ccgateway.features.status.' + feature.status) }}</span>
          </button>
          <div v-if="isOpen(feature.id)" :id="'feature-detail-' + feature.id" class="space-y-3 px-3 pb-3 text-sm">
            <p>{{ feature.reason }}</p>
            <WorkerCapabilities :feature-id="feature.id" />
            <dl class="grid gap-2 text-xs sm:grid-cols-2">
              <div><dt class="font-medium">{{ t('ccgateway.features.body') }}</dt><dd class="mt-1 break-all font-mono text-gray-500">{{ feature.body_paths.join(', ') || '—' }}</dd></div>
              <div><dt class="font-medium">anthropic-beta</dt><dd class="mt-1 break-all font-mono text-gray-500">{{ feature.beta_headers.join(', ') || '—' }}</dd></div>
            </dl>
            <p v-if="feature.requirements?.length" class="text-xs text-amber-700 dark:text-amber-400">{{ t('ccgateway.features.requirements') }}{{ feature.requirements.join(' · ') }}</p>
            <div v-if="flat" class="text-xs text-gray-500"><p class="font-medium">{{ t('ccgateway.features.mechanisms') }}</p><p class="mt-1 break-all">{{ feature.mechanisms.join(' · ') || '—' }}</p><p v-if="feature.evidence?.length" class="mt-2 break-all">{{ feature.evidence.join(' · ') }}</p></div>
            <details v-else class="text-xs text-gray-500"><summary class="cursor-pointer">{{ t('ccgateway.features.implementation') }}</summary><p class="mt-2 break-all">{{ feature.mechanisms.join(' · ') || '—' }}</p><p v-if="feature.evidence?.length" class="mt-2 break-all">{{ feature.evidence.join(' · ') }}</p></details>
            <button v-if="feature.id === 'F-TOOL-SEARCH'" type="button" class="text-xs text-teal-600" @click="emit('cc')">{{ t('ccgateway.features.ccSettings') }}</button>
          </div>
        </div>
        <p v-if="!filtered.length" class="p-3 text-sm text-gray-500">{{ t('ccgateway.features.empty') }}</p>
      </div>
      <div class="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{{ t('ccgateway.features.version', { version: catalog.catalog_version }) }}</span>
        <span v-if="!flat" class="flex items-center gap-2"><button type="button" class="btn btn-secondary btn-sm" :disabled="page === 1" @click="page--; expanded = ''">{{ t('ccgateway.features.previous') }}</button>{{ page }} / {{ pages }}<button type="button" class="btn btn-secondary btn-sm" :disabled="page === pages" @click="page++; expanded = ''">{{ t('ccgateway.features.next') }}</button></span>
      </div>
    </template>
  </div>
</template>
