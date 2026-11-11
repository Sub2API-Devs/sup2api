import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, type Component, type SetupContext } from 'vue'
import { i18n } from '@/i18n'
import type { Segment } from '@/api/pricing'
import SegmentEditor from './SegmentEditor.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), toast: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { post: mocks.post, patch: mocks.patch } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), toast: (...a: unknown[]) => mocks.toast(...a) }))
enableAutoUnmount(afterEach)

/** What ran, in order: the segment's own request and the save of its groups. */
const calls: string[] = []
/** What the groups editor has to save, and what saving it answers. */
const groups = { dirty: false, saved: true }
const groupsEditor: Component = {
  props: { segmentId: Number, editable: Boolean, discount: String },
  setup(props: { editable?: boolean }, { expose }: SetupContext) {
    const save = async () => (calls.push('groups'), groups.saved)
    expose({ save, get dirty() { return groups.dirty } })
    return () => h('div', { 'data-testid': 'groups', 'data-editable': String(props.editable) })
  }
}

const segment = (over: Partial<Segment> = {}): Segment => ({ id: 2, kind: 'named', name: 'VIP', description: '', discount: '0.9', is_default: false, member_count: 3, granted_groups: [], rate_override_count: 0, price_rule_count: 0, ...over })
const solo = segment({ id: 104, kind: 'personal', name: 'a@b.c', user_id: 9, user: { id: 9, email: 'a@b.c', display_name: '' } })

async function render(of: Segment | null, props: { readonly?: boolean } = {}) {
  const w = mount(SegmentEditor, {
    props: { open: true, segment: of, ...props },
    attachTo: document.body,
    global: { plugins: [i18n], stubs: { Teleport: true, SegmentGroupsEditor: groupsEditor, SegmentMembers: true } }
  })
  await flushPromises()
  const tabs = () => w.findAll('[role="tab"]').map((t) => t.text())
  const selected = () => w.get('[role="tab"][aria-selected="true"]').text()
  const submit = async () => {
    await w.get('[data-testid="segment-editor-submit"]').trigger('click')
    await flushPromises()
  }
  return { w, tabs, selected, submit }
}

beforeEach(() => {
  i18n.global.locale.value = 'zh'
  calls.length = 0
  Object.assign(groups, { dirty: false, saved: true })
  mocks.toast.mockReset()
  mocks.patch.mockReset().mockImplementation(async (path: string, body: Partial<Segment>) => (calls.push(`PATCH ${path}`), segment(body)))
  mocks.post.mockReset().mockImplementation(async (path: string, body: Partial<Segment>) => (calls.push(`POST ${path}`), segment({ id: 9, ...body })))
})

describe('segment editor', () => {
  it('saves the form, then the groups, and closes', async () => {
    const { w, submit } = await render(segment())
    await w.get('[data-testid="segment-discount"]').setValue('0.8')
    await submit()
    expect(calls).toEqual(['PATCH /segments/2', 'groups'])
    expect(mocks.patch.mock.calls[0][1]).toEqual({ name: 'VIP', description: '', discount: '0.8' })
    expect(w.emitted('changed')).toHaveLength(1)
    expect(w.emitted('update:open')).toEqual([[false]])
  })

  it('marks the tabs with unsaved changes', async () => {
    groups.dirty = true
    const { w, tabs } = await render(segment())
    expect(tabs()).toEqual(['基本信息', '分组与倍率 •', '成员'])
    await w.get('[data-testid="segment-name"]').setValue('Gold')
    expect(tabs()).toEqual(['基本信息 •', '分组与倍率 •', '成员'])
  })

  it('stays open on the tab that could not be saved', async () => {
    const { w, selected, submit } = await render(segment())
    await w.get('[data-testid="segment-discount"]').setValue('0')
    await w.findAll('[role="tab"]')[1].trigger('click')
    await submit()
    // Nothing is sent while the form is wrong.
    expect(calls).toEqual([])
    expect(selected()).toBe('基本信息 •')

    await w.get('[data-testid="segment-discount"]').setValue('0.8')
    groups.saved = false
    await submit()
    expect(calls).toEqual(['PATCH /segments/2', 'groups'])
    expect(selected()).toBe('分组与倍率')
    // The list is out of date all the same: the form was saved.
    expect(w.emitted('changed')).toHaveLength(1)
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('keeps a new segment open on its groups', async () => {
    const { w, selected, submit } = await render(null)
    await w.get('[data-testid="segment-name"]').setValue('Corp')
    await submit()
    expect(calls).toEqual(['POST /segments', 'groups'])
    expect(selected()).toBe('分组与倍率')
    expect(w.text()).toContain('编辑用户组 Corp')
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('edits only the discount of a personal segment, above its groups', async () => {
    const { w, tabs, submit } = await render(solo)
    // A single tab shows no tab bar.
    expect(tabs()).toEqual([])
    expect(w.get('[data-testid="segment-name"]').isVisible()).toBe(false)
    expect(w.get('[data-testid="groups"]').isVisible()).toBe(true)
    await w.get('[data-testid="segment-discount"]').setValue('0.5')
    await submit()
    expect(mocks.patch).toHaveBeenCalledWith('/segments/104', { discount: '0.5' })
  })

  it('only shows the segment to a caller who may not change it', async () => {
    const { w } = await render(segment(), { readonly: true })
    expect(w.text()).toContain('用户组 VIP')
    expect(w.text()).not.toContain('编辑用户组')
    expect(w.get('[data-testid="segment-name"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="segment-discount"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="groups"]').attributes('data-editable')).toBe('false')
    expect(w.find('[data-testid="segment-editor-submit"]').exists()).toBe(false)
    await w.get('[data-testid="segment-editor-close"]').trigger('click')
    expect(w.emitted('update:open')).toEqual([[false]])
  })
})
