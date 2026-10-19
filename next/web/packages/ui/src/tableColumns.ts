import { computed, inject, onScopeDispose, ref, toValue, watch, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import type { TableColumn } from './types'

/** The console supplies its current user ID; standalone previews use "standalone". */
export const TABLE_COLUMN_SCOPE_KEY: InjectionKey<MaybeRefOrGetter<string | number | null>> = Symbol('table-column-scope')

/** Storage-shaped adapter; implementations may call their own authenticated APIs. */
export interface TableColumnStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

/** One user's preferences, keyed by developer-defined table names. */
export type TableColumnPreferences = Record<string, Record<string, boolean>>

// Tables sharing a backend also share the read/merge/write queue for each
// user's document. Separate component instances must not overwrite siblings.
const storageWrites = new WeakMap<TableColumnStorage, Map<string, Promise<void>>>()
function pendingWrite(storage: TableColumnStorage, key: string) {
  return storageWrites.get(storage)?.get(key) ?? Promise.resolve()
}
function queueWrite(storage: TableColumnStorage, key: string, action: () => Promise<void>) {
  let pending = storageWrites.get(storage)
  if (!pending) {
    pending = new Map()
    storageWrites.set(storage, pending)
  }
  const result = pendingWrite(storage, key).then(action)
  const settled = result.catch(() => {})
  pending.set(key, settled)
  void settled.then(() => {
    if (pending.get(key) === settled) pending.delete(key)
  })
  return result
}

/**
 * Column visibility for tables and alternate layouts. Only explicit choices
 * are stored, so newly declared columns retain their own defaults.
 */
export function useTableColumns(
  source: MaybeRefOrGetter<readonly TableColumn[]>,
  preferenceKey: MaybeRefOrGetter<string | undefined> = undefined,
  storage: MaybeRefOrGetter<TableColumnStorage | undefined> = undefined
) {
  const scope = inject(TABLE_COLUMN_SCOPE_KEY, 'standalone')
  const columns = computed(() => toValue(source))
  const choices = ref<Record<string, boolean>>({})
  const adapter = computed(() => toValue(storage))
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<unknown>(null)
  const failed = ref<'load' | 'save' | 'reset' | null>(null)
  let generation = 0
  let context = 0
  let writeSequence = 0
  const tableName = computed(() => toValue(preferenceKey))
  const storageKey = computed(() => {
    const user = toValue(scope)
    return tableName.value && user != null ? `s2a.table-columns.v1:${encodeURIComponent(String(user))}` : undefined
  })

  function decode(raw: string | null): TableColumnPreferences {
    const saved: unknown = JSON.parse(raw || '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? Object.fromEntries(Object.entries(saved)
          .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
          .map(([name, value]) => [name, Object.fromEntries(
            Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
          )]))
      : {}
  }
  function readTable(raw: string | null, name: string) {
    const preferences = decode(raw)
    return Object.hasOwn(preferences, name) ? preferences[name] : {}
  }
  function reload() {
    const current = ++generation
    const key = storageKey.value
    const name = tableName.value
    const backend = adapter.value
    choices.value = {}
    loading.value = saving.value = false
    error.value = failed.value = null
    if (!key || !name) return
    if (backend) {
      loading.value = true
      // Wait for earlier saves before reloading this preference.
      return pendingWrite(backend, key).then(() => current === generation ? backend.getItem(key) : null).then(raw => {
        if (current === generation) choices.value = readTable(raw, name)
      }).catch(cause => {
        if (current === generation) {
          error.value = cause
          failed.value = 'load'
        }
      }).finally(() => {
        if (current === generation) loading.value = false
      })
    }
    try {
      choices.value = readTable(localStorage.getItem(key), name)
    } catch {
      // Unavailable storage or an invalid preference must not break a table.
    }
  }
  watch([storageKey, tableName, adapter], () => {
    context++
    return reload()
  }, { immediate: true, flush: 'sync' })

  function persist(operation: 'save' | 'reset') {
    const key = storageKey.value
    const name = tableName.value
    if (!key || !name) return
    const backend = adapter.value
    const value = { ...choices.value }
    const merge = (raw: string | null) => {
      const preferences = decode(raw)
      if (operation === 'reset') {
        delete preferences[name]
        return preferences
      }
      return { ...preferences, [name]: value }
    }
    if (!backend) {
      try {
        const preferences = merge(localStorage.getItem(key))
        if (Object.keys(preferences).length) localStorage.setItem(key, JSON.stringify(preferences))
        else localStorage.removeItem(key)
        error.value = failed.value = null
      } catch (cause) {
        error.value = cause
        failed.value = operation
      }
      return
    }
    const current = generation
    const owner = context
    const sequence = ++writeSequence
    saving.value = true
    // Serialize writes so a slower previous selection cannot overwrite the
    // latest one. Capture the payload, and never send queued work for a new user.
    return queueWrite(backend, key, async () => {
      const stale = () => owner !== context || key !== storageKey.value || backend !== adapter.value
      if (stale()) return
      const raw = await backend.getItem(key)
      if (stale()) return
      const preferences = merge(raw)
      if (Object.keys(preferences).length) await backend.setItem(key, JSON.stringify(preferences))
      else await backend.removeItem(key)
    }).then(() => {
      if (current === generation && sequence === writeSequence) error.value = failed.value = null
    }).catch(cause => {
      if (current === generation && sequence === writeSequence) {
        error.value = cause
        failed.value = operation
      }
    }).finally(() => {
      if (current === generation && sequence === writeSequence) saving.value = false
    })
  }

  const visibleColumns = computed(() => {
    const visible = columns.value.filter(column =>
      column.hideable === false || (Object.hasOwn(choices.value, column.key) ? choices.value[column.key] : !column.defaultHidden)
    )
    // An old preference must not blank a table after its schema changes.
    return visible.length ? visible : columns.value.slice(0, 1)
  })
  const isVisible = (key: string) => visibleColumns.value.some(column => column.key === key)
  const canToggle = (key: string) => {
    const column = columns.value.find(column => column.key === key)
    return !loading.value && !(adapter.value && failed.value === 'load') &&
      !!column && column.hideable !== false && (!isVisible(key) || visibleColumns.value.length > 1)
  }
  function setVisible(key: string, visible: boolean) {
    if (!canToggle(key)) return
    choices.value = { ...choices.value, [key]: visible }
    return persist('save')
  }
  function reset() {
    // An explicit reset supersedes a pending load.
    generation++
    loading.value = false
    choices.value = {}
    return persist('reset')
  }
  const retry = () => failed.value === 'load' ? reload() : persist(failed.value === 'reset' ? 'reset' : 'save')
  if (typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (!adapter.value && (event.key === null || event.key === storageKey.value)) reload()
    }
    window.addEventListener('storage', onStorage)
    onScopeDispose(() => window.removeEventListener('storage', onStorage))
  }
  return { columns, visibleColumns, isVisible, canToggle, setVisible, reset, loading, saving, error, reload, retry }
}

export type TableColumnState = ReturnType<typeof useTableColumns>
