import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, ref, type Component } from 'vue'
import { i18n } from '@/i18n'
import type { Segment, SegmentRef } from '@/api/pricing'
import PersonalRemoveDialog from '@/components/pricing/PersonalRemoveDialog.vue'
import PersonalSegments from './PersonalSegments.vue'
import SegmentEditor from './SegmentEditor.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), reload: vi.fn(), useList: vi.fn(), denied: new Set<string>() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get: mocks.get } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !mocks.denied.has(key) }) }))
const items = ref<Segment[]>([])
vi.mock('@/composables/useList', () => ({
  useList: (...a: unknown[]) => (mocks.useList(...a), { items, loading: ref(false), error: ref(null), page: ref(1), pageSize: ref(20), total: ref(1), reload: mocks.reload })
}))
enableAutoUnmount(afterEach)

const origin: SegmentRef = { id: 2, kind: 'named', name: 'VIP' }
const personal = (over: Partial<Segment> = {}): Segment => ({
  id: 31,
  kind: 'personal',
  name: 'amy@x',
  user_id: 7,
  user: { id: 7, email: 'amy@x', display_name: 'Amy' },
  origin,
  description: '',
  discount: '1',
  is_default: false,
  member_count: 1,
  granted_groups: [],
  rate_override_count: 0,
  price_rule_count: 0,
  ...over
})
/** The user picker: answers with a personal segment, made now or not. */
const picker: Component = { emits: ['select'], setup: () => () => h('div', { 'data-testid': 'picker' }) }

async function render() {
  const w = mount(PersonalSegments, { props: { open: false }, global: { plugins: [i18n], stubs: { Teleport: true, SegmentEditor: true, PersonalRemoveDialog: true, PersonalSegmentPicker: picker } } })
  await w.setProps({ open: true })
  await flushPromises()
  return { w, editor: () => w.getComponent(SegmentEditor).props(), remover: () => w.getComponent(PersonalRemoveDialog).props() }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  mocks.denied.clear()
  vi.clearAllMocks()
  items.value = [personal()]
})

describe('the users priced individually', () => {
  it('lists the personal segments each time it opens', async () => {
    const { w } = await render()
    expect(mocks.useList).toHaveBeenCalledWith('/segments', { kind: 'personal' }, { immediate: false })
    expect(mocks.reload).toHaveBeenCalledTimes(1)
    expect(w.get('[data-testid="segment-row"]').text()).toContain('amy@x')
  })

  it('opens the settings of a row, and moves its user back to a user group', async () => {
    const { w, editor, remover } = await render()
    await w.get('[data-testid="personal-edit"]').trigger('click')
    expect(editor()).toMatchObject({ open: true, segment: items.value[0], readonly: false })

    await w.get('[data-testid="personal-remove"]').trigger('click')
    expect(remover()).toMatchObject({ open: true, origin, user: { id: 7, email: 'amy@x', display_name: 'Amy', segment: items.value[0] } })

    w.getComponent(PersonalRemoveDialog).vm.$emit('done')
    await flushPromises()
    expect(editor().open).toBe(false)
    expect(mocks.reload).toHaveBeenCalledTimes(2)
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('moves back a user the caller only knows by id', async () => {
    // Without user:read the segment is "#7" and carries no user.
    items.value = [personal({ name: '#7', user: undefined })]
    const { w, remover } = await render()
    expect(w.get('[data-testid="segment-row"]').text()).toContain('#7')
    await w.get('[data-testid="personal-remove"]').trigger('click')
    expect(remover().user).toEqual({ id: 7, email: '#7', display_name: '', segment: items.value[0] })
  })

  it('opens the personal segment of a user picked, and counts again when it was made now', async () => {
    mocks.get.mockResolvedValue(personal({ id: 40 }))
    const { w, editor } = await render()
    w.getComponent(picker).vm.$emit('select', { id: 40, kind: 'personal', name: 'bob@x', user_id: 8 }, true)
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/segments/40')
    expect(editor()).toMatchObject({ open: true, segment: { id: 40 } })
    expect(w.emitted('changed')).toHaveLength(1)
  })

  it('only shows them to a caller who may not manage user groups', async () => {
    mocks.denied.add('segment:manage')
    const { w, editor } = await render()
    expect(w.find('[data-testid="personal-remove"]').exists()).toBe(false)
    const view = w.get('[data-testid="personal-edit"]')
    expect(view.text()).toBe('查看')
    await view.trigger('click')
    expect(editor()).toMatchObject({ open: true, readonly: true })
  })
})
