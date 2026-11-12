import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import RolesView from './RolesView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(async () => []), post: vi.fn(async () => ({ id: 1 })) }))
vi.mock('@sub2api/host', async (original) => ({ ...await original<typeof import('@sub2api/host')>(), api: mocks }))
vi.mock('@/composables/lookups', async (original) => ({ ...await original<object>(), fetchFirstPage: async () => [] }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true, me: null }) }))
enableAutoUnmount(afterEach)

const SFormModal = { props: ['open'], emits: ['submit'], template: '<form v-if="open" @submit.prevent="$emit(\'submit\')"><slot /></form>' }

async function create(key: string) {
  const w = mount(RolesView, { global: { plugins: [i18n, createPinia()], stubs: { SFormModal, teleport: true }, directives: { permission: {} } } })
  await flushPromises()
  await w.find('button').trigger('click')
  await w.find('input[placeholder="auditor"]').setValue(key)
  await w.find('input[placeholder="Auditor"]').setValue('Role')
  await w.find('form').trigger('submit')
  await flushPromises()
  return w
}

describe('RolesView role key', () => {
  it('accepts the server limit of 50 characters', async () => {
    mocks.post.mockClear()
    const key = 'a' + 'b'.repeat(49)
    await create(key)
    expect(mocks.post).toHaveBeenCalledWith('/roles', expect.objectContaining({ key }))
  })

  it('rejects longer, one-letter or non-letter-leading keys before posting', async () => {
    for (const key of ['a' + 'b'.repeat(50), 'a', '1ab', 'Ab']) {
      mocks.post.mockClear()
      const w = await create(key)
      expect(mocks.post).not.toHaveBeenCalled()
      expect(w.text()).toContain(i18n.global.t('roles.keyInvalid'))
    }
  })
})
