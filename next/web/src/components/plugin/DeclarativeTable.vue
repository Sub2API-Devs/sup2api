<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SIcon, SInput, SPagination, STable, type TableColumn } from '@sub2api/ui'
import type { UIPlugin, UIPluginPage } from '@/api/types'
import { lt } from '@/i18n'
import { notifyError } from '@/utils/errors'
import { badgeTone, formatCell, parseRouteRef } from './declarative'

// Declarative plugin table page: rows from the plugin route in page.source.
//
// The search box is rendered only when the page declares which query
// parameter its route honours (manifest Page.search). What it replaces was a
// box that was always there and searched whatever it could reach: rows already
// on screen when the data fitted in one page, nothing at all once it did not,
// and on two of the three pages that exist the route dropped the parameter and
// returned the full list, which then looked like a search result. Now the box
// exists exactly where a route has said it can search, and it always searches
// on the server.
const props = defineProps<{ plugin: UIPlugin; page: UIPluginPage }>()
const { t } = useI18n()

const rows = ref<Record<string, any>[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
// Whether the route paginates server-side. This is read off the response
// (@sub2api/host sets ListResult.paged when the body carried its own `page`
// object), not guessed from `total > items.length`: that comparison answers
// "is there more than one page of data right now", so the same route counted
// as client-paged while it was small and flipped to server-paged the moment it
// grew past one page — with the pagination controls changing behaviour under
// the user without anything having changed on the server.
const serverPaged = ref(false)

/** Query parameter the route searches on, or '' when it cannot search. */
const searchParam = computed(() => props.page.search || '')
const q = ref('')

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

// Requests are sequenced: a debounced search fires several loads and the
// answers can arrive out of order, which would leave the table showing rows
// for a query the user has already replaced.
let seq = 0

async function load() {
  const target = parseRouteRef(props.page.source)
  if (!target) return
  const my = ++seq
  loading.value = true
  try {
    const query: Record<string, any> = { page: page.value, page_size: pageSize.value }
    const term = q.value.trim()
    if (searchParam.value && term) query[searchParam.value] = term
    const res = await api.list<Record<string, any>>(`/p/${props.plugin.key}${target.path}`, query)
    if (my !== seq) return
    serverPaged.value = res.paged
    rows.value = res.items
    total.value = res.page.total
  } catch (e) {
    if (my !== seq) return
    notifyError(e)
  } finally {
    if (my === seq) loading.value = false
  }
}

watch([page, pageSize], () => serverPaged.value && load())

// Typing reloads after a pause and goes back to the first page: keeping the
// page number would ask the route for page 4 of a result set the new term may
// not have, and the table would come back empty for no visible reason. When
// resetting the page is itself what triggers the reload the call is left to
// that watcher, so one keystroke never costs two requests; a route that
// honours its search parameter without paginating has no such watcher and is
// reloaded here.
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const pageWatcherWillReload = serverPaged.value && page.value !== 1
    page.value = 1
    if (!pageWatcherWillReload) load()
  }, 250)
})
onBeforeUnmount(() => clearTimeout(timer))

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-2">
      <SInput
        v-if="searchParam"
        v-model="q"
        type="search"
        size="sm"
        class="max-w-xs"
        :placeholder="t('common.searchPlaceholder')"
        :aria-label="t('common.search')"
      />
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
