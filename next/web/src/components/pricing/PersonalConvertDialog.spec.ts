import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import type { Segment } from '@/api/pricing'
import PersonalConvertDialog from './PersonalConvertDialog.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn(), toast: vi.fn() }))
vi.mock('@sub2api/host', async (importOriginal) => ({ ...(await importOriginal<typeof import('@sub2api/host')>()), api: { post: mocks.post } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<object>()), toast: (...a: unknown[]) => mocks.toast(...a) }))

const user = { id: 7, email: 'amy@example.com', display_name: 'Amy', segment: { id: 2, kind: 'named' as const, name: 'VIP' } }
const personal: Segment = {
  id: 31,
  kind: 'personal',
  name: user.email,
  user_id: user.id,
  description: '',
  discount: '0.9',
  is_default: false,
  member_count: 1,
  granted_groups: [],
  rate_override_count: 0,
  price_rule_count: 0
}

function render() {
  return mount(PersonalConvertDialog, { props: { open: true, user }, global: { plugins: [i18n] }, attachTo: document.body })
}
const dialog = () => document.body.querySelector<HTMLElement>('[data-testid="personal-convert-dialog"]')!
const submit = () => document.body.querySelector<HTMLElement>('[data-testid="personal-convert-submit"]')!.click()

describe('personal convert dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.post.mockResolvedValue(personal)
  })

  it('names the segment the user leaves and copies its settings by default', async () => {
    const wrapper = render()
    expect(dialog().textContent).toContain('他不再属于「VIP」')
    expect(dialog().textContent).toContain('复制「VIP」现在的设置')

    submit()
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/users/7/personal-segment', { copy: true })
    expect(mocks.toast).toHaveBeenCalledWith('已把 amy@example.com 设为个人专属', 'success')
    expect(wrapper.emitted('done')).toEqual([[personal]])
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })

  it('starts from blank when asked to', async () => {
    const wrapper = render()
    const blank = dialog().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]
    blank.checked = true
    blank.dispatchEvent(new Event('change'))
    await flushPromises()

    submit()
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/users/7/personal-segment', { copy: false })
    wrapper.unmount()
  })

  it('stays open and reports the failure when the server refuses', async () => {
    mocks.post.mockRejectedValue(new ApiError(409, { code: 'conflict', message: 'already personal' }))
    const wrapper = render()
    submit()
    await flushPromises()
    expect(mocks.toast).toHaveBeenCalledWith('already personal', 'error')
    expect(wrapper.emitted('done')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    wrapper.unmount()
  })
})
