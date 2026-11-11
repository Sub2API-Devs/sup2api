import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { i18n } from '@/i18n'
import type { Segment } from '@/api/pricing'
import UserCreateDialog from './UserCreateDialog.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn(), denied: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { post: mocks.post } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !mocks.denied.has(key) }) }))
const segments = ref([{ id: 1, name: 'Default', is_default: true, discount: '1' }, { id: 2, name: 'VIP', is_default: false, discount: '0.9' }] as Segment[])
vi.mock('@/components/pricing/segmentLookup', () => ({ useSegmentsLookup: () => ({ segments }) }))
enableAutoUnmount(afterEach)

async function render() {
  const w = mount(UserCreateDialog, { props: { open: false, roles: [] }, global: { plugins: [i18n], stubs: { Teleport: true } } })
  await w.setProps({ open: true })
  await w.get('input[type="email"]').setValue(' amy@example.com ')
  await w.get('input[type="password"]').setValue('password1')
  const submit = async () => {
    await w.get('[data-testid="user-create-submit"]').trigger('click')
    await flushPromises()
  }
  return { w, submit }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  mocks.denied.clear()
  mocks.post.mockReset().mockResolvedValue({ id: 9 })
})

describe('user create dialog', () => {
  it('creates the user in the segment chosen, in the one request', async () => {
    const { w, submit } = await render()
    const select = w.get('[data-testid="user-create-segment"]')
    // The default segment is where a new user goes unless told otherwise.
    expect((select.element as HTMLSelectElement).selectedOptions[0].text).toContain('Default')
    // Option values are positions in the list.
    await select.setValue('1')
    await submit()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/users', { email: 'amy@example.com', display_name: '', password: 'password1', role_keys: ['user'], segment_id: 2 })
    expect(w.emitted('created')).toHaveLength(1)
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('leaves the segment to the server for a caller who may not manage segments', async () => {
    mocks.denied.add('segment:manage')
    const { w, submit } = await render()
    expect(w.find('[data-testid="user-create-segment"]').exists()).toBe(false)
    await submit()
    expect(mocks.post.mock.calls[0][1].segment_id).toBeUndefined()
  })
})
