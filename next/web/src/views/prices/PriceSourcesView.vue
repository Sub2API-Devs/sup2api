<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@sub2api/host'
import { SBadge, SButton, SDropdown, SIcon, SPageHeader, SSwitch, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { PriceSource } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { notifyError } from '@/utils/errors'
import { formatDateTime, formatRelative } from '@/utils/format'
import PriceSourceModal from './PriceSourceModal.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const canManage = computed(() => auth.has('price:manage'))

const sources = ref<PriceSource[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const r = await api.get<PriceSource[]>('/price-sources')
    sources.value = Array.isArray(r) ? r : []
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'name', label: t('common.name') },
    { key: 'kind', label: t('prices.sources.kindCol'), width: '130px' },
    { key: 'url', label: t('prices.sources.url') },
    { key: 'enabled', label: t('common.enabled'), width: '90px' },
    { key: 'last_synced_at', label: t('prices.sources.lastSynced'), width: '140px' },
    { key: 'last_error', label: t('prices.sources.lastError') },
    { key: 'price_count', label: t('prices.sources.priceCount'), align: 'right', width: '90px' }
  ]
  if (canManage.value) cols.push({ key: 'actions', label: t('common.actions'), align: 'right', width: '170px' })
  return cols
})

function kindTone(k: string) {
  return k === 'sup2api' ? 'purple' : k === 'models_dev' ? 'success' : 'primary'
}

function optionText(s: PriceSource): string {
  if (s.kind === 'sup2api') return s.options?.apply_multiplier === false ? t('prices.sources.multiplierOff') : t('prices.sources.multiplierOn')
  const p = Array.isArray(s.options?.providers) ? s.options.providers : []
  return p.join(', ')
}

// ------------------------------------------------------------------ edit

const modalOpen = ref(false)
const editing = ref<PriceSource | null>(null)

function openCreate() {
  editing.value = null
  modalOpen.value = true
}

function openEdit(s: PriceSource) {
  editing.value = s
  modalOpen.value = true
}

const toggling = ref(new Set<number>())

async function toggle(s: PriceSource, v: boolean) {
  const prev = s.enabled
  s.enabled = v
  toggling.value = new Set(toggling.value).add(s.id)
  try {
    await api.patch(`/price-sources/${s.id}`, { enabled: v })
  } catch (e) {
    s.enabled = prev
    notifyError(e)
  } finally {
    const n = new Set(toggling.value)
    n.delete(s.id)
    toggling.value = n
  }
}

async function remove(s: PriceSource) {
  const ok = await confirm({
    title: t('common.delete'),
    message: t('prices.sources.deleteConfirm', { name: s.name, n: s.price_count || 0 }),
    danger: true
  })
  if (!ok) return
  try {
    await api.del(`/price-sources/${s.id}`)
    toast(t('common.deleted'), 'success')
    load()
  } catch (e) {
    notifyError(e)
  }
}

function onAction(s: PriceSource, key: string) {
  if (key === 'edit') openEdit(s)
  else if (key === 'prices') viewPrices(s)
  else if (key === 'delete') remove(s)
}

function preview(s: PriceSource) {
  router.push(`/prices/sources/${s.id}/sync`)
}

function viewPrices(s: PriceSource) {
  router.push({ path: '/prices', query: { source: 'sync', sync_source_id: String(s.id) } })
}
</script>

<template>
  <div>
    <SPageHeader :title="t('prices.sources.title')" :description="t('prices.sources.description')">
      <template #before>
        <button class="btn btn-ghost btn-sm !px-1.5" :title="t('prices.sources.back')" @click="router.push('/prices')">
          <SIcon name="arrow-left" class="h-4 w-4" />
        </button>
      </template>
      <template #actions>
        <SButton variant="ghost" :loading="loading" @click="load">{{ t('common.refresh') }}</SButton>
        <SButton v-if="canManage" variant="primary" data-testid="price-source-new" @click="openCreate">+ {{ t('prices.sources.create') }}</SButton>
      </template>
    </SPageHeader>

    <div class="card overflow-hidden">
      <STable :columns="columns" :rows="sources" :loading="loading" :empty-text="t('prices.sources.empty')">
        <template #cell-name="{ row }">
          <span class="whitespace-nowrap font-medium text-gray-900 dark:text-white" data-testid="price-source-name">{{ row.name }}</span>
          <p v-if="optionText(row)" class="muted max-w-[11rem] truncate text-xs" :title="optionText(row)">{{ optionText(row) }}</p>
        </template>
        <template #cell-kind="{ row }">
          <SBadge :tone="kindTone(row.kind)">{{ t(`prices.sources.kind.${row.kind}`) }}</SBadge>
        </template>
        <template #cell-url="{ row }">
          <code class="block max-w-[13rem] truncate font-mono text-xs" :title="row.url">{{ row.url }}</code>
          <span v-if="row.kind === 'sup2api'" class="muted text-xs">
            <template v-if="row.has_api_key">{{ t('prices.sources.hasKey') }} ••••</template>
            <span v-else class="text-red-600 dark:text-red-400">{{ t('prices.sources.apiKeyRequired') }}</span>
          </span>
        </template>
        <template #cell-enabled="{ row }">
          <SSwitch :model-value="row.enabled" :disabled="!canManage || toggling.has(row.id)" @update:model-value="toggle(row, $event)" />
        </template>
        <template #cell-last_synced_at="{ row }">
          <span v-if="row.last_synced_at" class="text-xs" :title="formatDateTime(row.last_synced_at)">{{ formatRelative(row.last_synced_at, t) }}</span>
          <span v-else class="muted text-xs">{{ t('prices.sources.never') }}</span>
        </template>
        <template #cell-last_error="{ row }">
          <span v-if="row.last_error" class="block max-w-[11rem] truncate text-xs text-red-600 dark:text-red-400" :title="row.last_error" data-testid="price-source-error">
            {{ row.last_error }}
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template #cell-price_count="{ row }">
          <button v-if="row.price_count" class="link text-sm" :title="t('prices.sources.viewPrices')" @click="viewPrices(row)">{{ row.price_count }}</button>
          <span v-else class="muted">0</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <SButton size="sm" variant="ghost" data-testid="price-source-preview" @click="preview(row)">{{ t('prices.sources.preview') }}</SButton>
            <SDropdown
              :actions="[
                { key: 'edit', label: t('common.edit') },
                { key: 'prices', label: t('prices.sources.viewPrices'), hidden: !row.price_count },
                { key: 'delete', label: t('common.delete'), danger: true }
              ]"
              @select="onAction(row, $event)"
            />
          </div>
        </template>
      </STable>
    </div>

    <PriceSourceModal v-model:open="modalOpen" :source="editing" @saved="load" />
  </div>
</template>
