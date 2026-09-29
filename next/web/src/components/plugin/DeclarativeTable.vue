<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SIcon, SPagination, STable, type TableColumn } from '@sub2api/ui'
import type { UIPlugin, UIPluginPage } from '@/api/types'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { badgeTone, formatCell, parseRouteRef } from './declarative'

// Declarative plugin table page: rows from the plugin route in page.source.
//
// No search box: manifest.Page cannot say whether its source route honours a
// query parameter, and most do not (anthropic's GET /models takes ?q=,
// volcengine's GET /assets and GET /asset-groups ignore it). A box that
// filters only the rows already on screen, or that silently returns the whole
// list from a route that drops ?q=, lies about having searched. Bring it back
// when Page declares its search parameter.
const props = defineProps<{ plugin: UIPlugin; page: UIPluginPage }>()
const { t } = useI18n()

const rows = ref<Record<string, any>[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const serverPaged = ref(false)

const columns = computed<TableColumn[]>(() =>
  (props.page.columns || []).map((c) => ({
    key: c.key,
    label: lt(c.label) || c.key,
    align: c.format === 'number' || c.format === 'currency' ? 'right' : 'left'
  }))
)
const formats = computed(() => Object.fromEntries((props.page.columns || []).map((c) => [c.key, c.format || 'text'])))

const visible = computed(() => (serverPaged.value ? rows.value : rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)))
const shownTotal = computed(() => (serverPaged.value ? total.value : rows.value.length))

async function load() {
  const ref = parseRouteRef(props.page.source)
  if (!ref) return
  loading.value = true
  try {
    const res = await api.list<Record<string, any>>(`/p/${props.plugin.key}${ref.path}`, { page: page.value, page_size: pageSize.value })
    serverPaged.value = res.page.total > res.items.length
    rows.value = res.items
    total.value = res.page.total
  } catch (e) {
    notifyError(e)
  } finally {
    loading.value = false
  }
}

watch([page, pageSize], () => serverPaged.value && load())
onMounted(load)
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-2">
      <SButton size="sm" :loading="loading" @click="load"><SIcon name="refresh" class="h-4 w-4" />{{ t('common.refresh') }}</SButton>
    </div>
    <STable :columns="columns" :rows="visible" :loading="loading">
      <template v-for="c in columns" :key="c.key" #[`cell-${c.key}`]="{ value }">
        <SBadge v-if="formats[c.key] === 'badge'" :tone="badgeTone(value)">{{ formatCell(value) }}</SBadge>
        <span v-else :class="formats[c.key] === 'number' || formats[c.key] === 'currency' ? 'tabular-nums' : ''">{{ formatCell(value, formats[c.key]) }}</span>
      </template>
    </STable>
    <SPagination v-model:page="page" v-model:page-size="pageSize" :total="shownTotal" />
  </div>
</template>
