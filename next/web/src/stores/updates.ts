import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@sub2api/host'
import { errorMessage } from '@/utils/errors'

export interface UpdateCheck {
  repository: string
  current_version: string
  latest_version?: string
  has_update: boolean
  compatible: boolean
  reason?: string
  tag?: string
  release_url?: string
  published_at?: string
  notes?: string
  manifest_asset?: string
  cached?: boolean
  checked_at?: string
}

export const useUpdatesStore = defineStore('updates', () => {
  const result = ref<UpdateCheck | null>(null)
  const busy = ref(false)
  const error = ref('')
  let generation = 0
  async function check(force = false) {
    if (busy.value) return
    busy.value = true
    error.value = ''
    const request = ++generation
    try {
      const response = await api.get<UpdateCheck>(`/system/update-check${force ? '?force=true' : ''}`)
      if (request === generation) result.value = response
    } catch (e) {
      if (request === generation) error.value = errorMessage(e)
    } finally {
      if (request === generation) busy.value = false
    }
  }
  function invalidate() { generation++; result.value = null; error.value = ''; busy.value = false }
  return { result, busy, error, check, invalidate }
})
