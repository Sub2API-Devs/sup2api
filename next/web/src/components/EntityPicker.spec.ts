import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ApiError, type Query } from '@sub2api/host'
import { SField, uiMessages } from '@sub2api/ui'
import entity from '@/i18n/locales/en/entity'
import EntityPicker from './EntityPicker.vue'
import { resetEntityLookups, type EntityItem } from './entity/lookup'

const mocks = vi.hoisted(() => ({ get: vi.fn(), denied: [] as string[] }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get: mocks.get } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ has: (perm: string[]) => !perm.length || perm.some((p) => !mocks.denied.includes(p)) })
}))

enableAutoUnmount(afterEach)
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: { entity, ui: uiMessages.en } } })

const USERS: EntityItem[] = [
  { id: 7, name: 'zhangsan@example.com', hint: 'Zhang San', status: 'active' },
  { id: 12, name: 'lisi@example.com', status: 'disabled' },
  { id: 31, name: 'takeout@example.net', hint: 'Takeout', status: 'active' }
]
/** The lookup over USERS as the core answers it: ids alone, else name contains or the id, an id match first. */
function answer(_path: string, query: Query = {}) {
  const ids = typeof query.ids === 'string' ? query.ids.split(',') : null
  if (ids) return { items: USERS.filter((u) => ids.includes(String(u.id))), more: false }
  const q = String(query.q ?? '').toLowerCase()
  const items = USERS.filter((u) => !q || String(u.id) === q || u.name.includes(q))
  return { items: items.sort((a, b) => Number(String(b.id) === q) - Number(String(a.id) === q)), more: false }
}
/** [path, the parameters that were set] of every lookup so far. */
const lookups = () =>
  mocks.get.mock.calls.map(([path, query]) => [path, Object.fromEntries(Object.entries(query as Query).filter(([, v]) => v !== undefined))])

function picker(props: Record<string, unknown>) {
  return mount(EntityPicker, { props: { kind: 'user', ...props }, global: { plugins: [i18n] } })
}
/** Past the pause before a typed search, and its answer. */
async function settle(ms = 250) {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}
async function open(w: VueWrapper) {
  await w.get('input').trigger('focus')
  await settle(0)
}
async function type(w: VueWrapper, text: string) {
  await w.get('input').setValue(text)
  await settle()
}
const rows = (w: VueWrapper) => w.findAll('[role="option"]').map((o) => o.text())
const shown = (w: VueWrapper) => (w.get('input').element as HTMLInputElement).value
/** The last value of each model event. */
const model = (w: VueWrapper) => ({ id: w.emitted('update:id')?.at(-1)?.[0], text: w.emitted('update:text')?.at(-1)?.[0] })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  resetEntityLookups()
  mocks.denied = []
  mocks.get.mockReset().mockImplementation(async (path: string, query?: Query) => answer(path, query))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('EntityPicker list', () => {
  it('lists the first candidates on opening: name, #id, hint and a tag on the inactive ones', async () => {
    const w = picker({})
    expect(mocks.get).not.toHaveBeenCalled()
    await open(w)
    expect(lookups()).toEqual([['/lookup/users', {}]])
    expect(rows(w)).toEqual(['zhangsan@example.com#7Zhang San', 'lisi@example.comDisabled#12', 'takeout@example.net#31Takeout'])
    expect(w.get('input').attributes('placeholder')).toBe('User')
    expect(w.get('input').attributes('aria-label')).toBe('User')
  })

  it('searches typed text after a pause and drops an answer a later search overtook', async () => {
    let slow: (v: unknown) => void = () => undefined
    mocks.get.mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
    const w = picker({})
    await open(w)
    await w.get('input').setValue('take')
    await settle(249)
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(w.get('[role="listbox"]').text()).toBe('Searching…')
    await settle(1)
    expect(lookups()[1]).toEqual(['/lookup/users', { q: 'take' }])
    expect(rows(w)).toEqual(['takeout@example.net#31Takeout'])
    // The first page comes back late: the list stays what the typed text found.
    slow({ items: USERS, more: false })
    await flushPromises()
    expect(rows(w)).toEqual(['takeout@example.net#31Takeout'])
  })

  it('picking an entity sends its id and clears the text', async () => {
    const w = picker({ id: '', text: 'zhang' })
    await open(w)
    await w.findAll('[role="option"]')[0].trigger('click')
    expect(model(w)).toEqual({ id: '7', text: '' })
    expect(w.emitted('change')).toEqual([[{ id: '7', text: '' }]])
  })

  it('offers "Name contains" first, only when text is bound', async () => {
    const bound = picker({ text: '' })
    await open(bound)
    expect(rows(bound)[0]).toBe('zhangsan@example.com#7Zhang San')
    await type(bound, 'example')
    expect(rows(bound)[0]).toBe('Name contains “example”Partial match')
    expect(rows(bound)).toHaveLength(4)
    await bound.get('input').trigger('keydown', { key: 'Enter' })
    expect(model(bound)).toEqual({ id: '', text: 'example' })

    const idOnly = picker({})
    await open(idOnly)
    await type(idOnly, 'example')
    expect(rows(idOnly)).toEqual(['zhangsan@example.com#7Zhang San', 'lisi@example.comDisabled#12', 'takeout@example.net#31Takeout'])
  })

  it('reads digits as an id: the entity that has it first, else "Use ID"', async () => {
    const w = picker({ text: '' })
    await open(w)
    await type(w, '12')
    expect(rows(w)).toEqual(['lisi@example.comDisabled#12', 'Name contains “12”Partial match'])
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(model(w)).toEqual({ id: '12', text: '' })

    await w.get('input').trigger('focus')
    await w.get('input').setValue('999')
    // Offered before the answer, so digits + Enter never wait; the list says what it knows once settled.
    expect(rows(w)).toEqual(['Use ID #999', 'Name contains “999”Partial match'])
    await settle()
    expect(rows(w)[0]).toBe('Use ID #999This ID is not in the list (it may have been deleted); you can still use it')
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(model(w)).toEqual({ id: '999', text: '' })
  })

  it('passes mine and the scope, names the scope and merges the page candidates', async () => {
    mocks.get.mockImplementation(async (path: string, query: Query = {}) => {
      if (path === '/lookup/users') return answer(path, query)
      return query.q ? { items: [], more: false } : { items: [{ id: 101, name: 'takeout-key', hint: 'takeout@example.net' }], more: true }
    })
    const w = picker({ kind: 'api_key', mine: true, scope: { user_id: '31' }, extra: [{ id: 205, name: 'legacy-key' }, { id: 101, name: 'stale name' }] })
    await open(w)
    expect(lookups()).toContainEqual(['/lookup/api-keys', { mine: true, user_id: '31' }])
    // The page's own candidates first; an id both know shows the lookup's row.
    expect(rows(w)).toEqual(['legacy-key#205', 'takeout-key#101takeout@example.net'])
    expect(w.get('[role="listbox"]').text()).toContain('Showing the first 1. Type to narrow the list.')
    // The scope's user is looked up in its own kind, not as the caller's own.
    expect(lookups()).toContainEqual(['/lookup/users', { ids: '31' }])
    expect(w.get('[role="listbox"]').text()).toContain('Only the keys of takeout@example.net')
    await type(w, 'legacy')
    expect(rows(w)).toEqual(['legacy-key#205'])
  })

  it('a model is its name: no #id, digits are text', async () => {
    mocks.get.mockResolvedValue({ items: [{ id: 'gpt-4o', name: 'gpt-4o' }], more: false })
    const w = picker({ kind: 'model', id: 'claude-opus-5', text: '' })
    expect(shown(w)).toBe('claude-opus-5')
    await open(w)
    expect(lookups()).toEqual([['/lookup/models', {}]])
    await type(w, '4')
    expect(rows(w)).toEqual(['Name contains “4”Partial match', 'gpt-4o'])
    await w.findAll('[role="option"]')[1].trigger('click')
    expect(model(w)).toEqual({ id: 'gpt-4o', text: '' })
  })

  it('a model picked by id alone also takes a typed name the list does not have, after the matches', async () => {
    mocks.get.mockImplementation(async (_path: string, query: Query = {}) => ({ items: 'gpt-4o'.includes(String(query.q ?? '')) ? [{ id: 'gpt-4o', name: 'gpt-4o' }] : [], more: false }))
    const w = picker({ kind: 'model' })
    await open(w)
    await w.get('input').setValue('4o')
    // Not while the search runs: Enter must not take a fragment for the name.
    expect(rows(w)).toEqual([])
    await settle()
    expect(rows(w)).toEqual(['gpt-4o', 'Use “4o”This name is not in the list; you can still use it'])
    await type(w, 'gpt-4o')
    expect(rows(w)).toEqual(['gpt-4o'])
    await type(w, 'my-unpriced-model')
    expect(rows(w)).toEqual(['Use “my-unpriced-model”This name is not in the list; you can still use it'])
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(model(w)).toEqual({ id: 'my-unpriced-model', text: '' })
  })

  it('a typed id of a page candidate is the first row before the search answers and after: Enter picks the same either way', async () => {
    mocks.get.mockResolvedValue({ items: [{ id: 'gpt-4o', name: 'gpt-4o' }, { id: 'gpt-4o-mini', name: 'gpt-4o-mini' }], more: false })
    const w = picker({ kind: 'model', text: '', extra: [{ id: 'gpt-4o', name: 'gpt-4o' }] })
    await open(w)
    await w.get('input').setValue('gpt-4o')
    expect(rows(w)).toEqual(['gpt-4o', 'Name contains “gpt-4o”Partial match'])
    await settle()
    expect(rows(w)).toEqual(['gpt-4o', 'Name contains “gpt-4o”Partial match', 'gpt-4o-mini'])
    await w.get('input').setValue('gpt-4o-mini')
    // Not the page's own: text until the list has it, and "Name contains" keeps Enter.
    expect(rows(w)).toEqual(['Name contains “gpt-4o-mini”Partial match'])
    await w.get('input').setValue('gpt-4o')
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(model(w)).toEqual({ id: 'gpt-4o', text: '' })
  })

  it('leaves the excluded ids out of the list, asks for as many rows more and does not offer them by id', async () => {
    const w = picker({ exclude: [7, '31'], extra: [{ id: 31, name: 'takeout (page)' }, { id: 40, name: 'page-only' }] })
    await open(w)
    expect(lookups()).toEqual([['/lookup/users', { limit: 22 }]])
    expect(rows(w)).toEqual(['page-only#40', 'lisi@example.comDisabled#12'])
    // Typed, an excluded id is no row either: neither the entity nor "Use ID".
    await w.get('input').setValue('7')
    expect(rows(w)).toEqual([])
    await settle()
    expect(rows(w)).toEqual([])
    expect(w.get('[role="listbox"]').text()).toBe('No matching User')
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:id')).toBeUndefined()
    // An id that is not excluded is offered as before.
    await type(w, '999')
    expect(rows(w)[0]).toContain('Use ID #999')
  })

  it('counts the rows it lists in the footer and never asks for more rows than the lookup gives', async () => {
    mocks.get.mockResolvedValue({ items: USERS, more: true })
    const w = picker({ exclude: [12, ...Array.from({ length: 40 }, (_, i) => 1000 + i)] })
    await open(w)
    expect(lookups()).toEqual([['/lookup/users', { limit: 50 }]])
    expect(w.get('[role="listbox"]').text()).toContain('Showing the first 2. Type to narrow the list.')
  })

  it('says that more match, not "no match", when every row the lookup gave is excluded', async () => {
    mocks.get.mockResolvedValue({ items: USERS, more: true })
    const w = picker({ exclude: USERS.map((u) => u.id) })
    await open(w)
    expect(w.get('[role="listbox"]').text()).toBe('More match than the list shows. Type to narrow the list.')
  })

  it('an empty list names the entity, whatever field the placeholder names', async () => {
    mocks.get.mockResolvedValue({ items: [], more: false })
    const w = picker({ kind: 'proxy', placeholder: 'No proxy' })
    await open(w)
    expect(w.get('[role="listbox"]').text()).toBe('No matching Proxy')
  })

  it('shows a picked id that is excluded like any other', async () => {
    const w = picker({ id: '7', exclude: ['7'] })
    await flushPromises()
    expect(shown(w)).toBe('zhangsan@example.com')
    expect(w.text()).toContain('#7')
  })

  it('says so when the list cannot be loaded', async () => {
    mocks.get.mockRejectedValue(new ApiError(500, { code: 'internal', message: 'boom' }))
    const w = picker({})
    await open(w)
    expect(w.get('[role="listbox"]').text()).toBe('Could not load the list')
    expect(w.find('[role="combobox"]').exists()).toBe(true)
  })
})

describe('EntityPicker value', () => {
  it('looks the names of given ids up in one request a kind and shows "name #id"', async () => {
    const a = picker({ id: '7' })
    const b = picker({ id: '12' })
    const gone = picker({ id: '404' })
    expect(shown(a)).toBe('#7')
    await flushPromises()
    expect(lookups()).toEqual([['/lookup/users', { ids: '7,12,404' }]])
    expect([shown(a), a.get('.input-group').text()]).toEqual(['zhangsan@example.com', '#7'])
    expect([shown(b), b.get('.input-group').text()]).toEqual(['lisi@example.com', '#12'])
    // The lookup does not know it: the bare id, and it is not asked again.
    expect([shown(gone), gone.get('.input-group').text()]).toEqual(['#404', ''])
    picker({ id: '404' })
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('shows and picks a candidate of the page whose id the lookup cannot hold (0), without asking for its name', async () => {
    const extra = [{ id: 0, name: 'Default group' }]
    const w = picker({ kind: 'group', id: '0', extra })
    await flushPromises()
    expect([shown(w), w.get('.input-group').text()]).toEqual(['Default group', '#0'])
    expect(mocks.get).not.toHaveBeenCalled()
    const empty = picker({ kind: 'group', extra })
    await open(empty)
    await empty.get('[role="option"]').trigger('click')
    expect(model(empty)).toEqual({ id: '0', text: '' })
  })

  it('asks for the caller\'s own names with mine', async () => {
    const w = picker({ kind: 'api_key', id: '5', mine: true })
    await flushPromises()
    expect(lookups()).toEqual([['/lookup/api-keys', { ids: '5', mine: true }]])
    expect(shown(w)).toBe('#5')
  })

  it('leaves its name to the label of a form item around: no aria-label of the placeholder over it', async () => {
    const field = (props: Record<string, unknown>, label?: string) =>
      mount(SField, { props: { label }, slots: { default: () => h(EntityPicker, { kind: 'proxy', placeholder: 'No proxy', ...props }) }, global: { plugins: [i18n] } })
    const select = field({}, 'Probe proxy')
    await flushPromises()
    expect(select.get('input').attributes()).toMatchObject({ id: select.get('label').attributes('for'), placeholder: 'No proxy' })
    expect(select.get('input').attributes('aria-label')).toBeUndefined()
    // A form item without a label names nothing.
    expect(field({}).get('input').attributes('aria-label')).toBe('No proxy')
    // The text box of a caller without the lookup likewise.
    mocks.denied = ['proxy:read', 'proxy:own:read']
    const box = field({}, 'Probe proxy')
    await flushPromises()
    expect(box.get('input').attributes()).toMatchObject({ id: box.get('label').attributes('for'), placeholder: 'No proxy (Proxy ID)' })
    expect(box.get('input').attributes('aria-label')).toBeUndefined()
  })

  it('shows a name search, and clear empties both', async () => {
    const w = picker({ id: '', text: 'opus' })
    expect(shown(w)).toBe('Name contains “opus”')
    await w.get('button[aria-label="Clear User"]').trigger('click')
    expect(model(w)).toEqual({ id: '', text: '' })
    expect(w.emitted('change')).toEqual([[{ id: '', text: '' }]])
    expect(mocks.get).not.toHaveBeenCalled()
  })
})

describe('EntityPicker without the lookup', () => {
  const box = (w: VueWrapper) => w.get('input')
  /** setValue fires input and change; the box takes the text on change. */
  const commit = (w: VueWrapper, text: string) => box(w).setValue(text)

  it.each([403, 404])('becomes a text box after a %i and does not ask again', async (status) => {
    mocks.get.mockRejectedValue(new ApiError(status, { code: 'refused', message: 'refused' }))
    const w = picker({ id: '', text: '' })
    await open(w)
    expect(w.find('[role="combobox"]').exists()).toBe(false)
    expect(box(w).attributes('placeholder')).toBe('User ID or name')
    await commit(w, '42')
    expect(model(w)).toEqual({ id: '42', text: '' })
    await commit(w, 'ann@')
    expect(model(w)).toEqual({ id: '', text: 'ann@' })
    await commit(w, '')
    expect(model(w)).toEqual({ id: '', text: '' })
    // Another picker of the kind starts as the text box; its id is not looked up.
    const other = picker({ id: '7' })
    await flushPromises()
    expect(other.find('[role="combobox"]').exists()).toBe(false)
    expect((box(other).element as HTMLInputElement).value).toBe('7')
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('is a text box from the start without the permission, taking only an id when text is not bound', async () => {
    mocks.denied = ['user:read']
    const w = picker({ id: '7' })
    await flushPromises()
    expect(mocks.get).not.toHaveBeenCalled()
    expect(box(w).attributes('placeholder')).toBe('User ID')
    // A placeholder of the page names the field: what to type follows it.
    expect(box(picker({ placeholder: 'Created by' })).attributes('placeholder')).toBe('Created by (User ID)')
    await commit(w, '9')
    expect(model(w)).toEqual({ id: '9', text: '' })
    await commit(w, 'ann@')
    expect(model(w)).toEqual({ id: '', text: '' })
  })

  it('text that is no id clears the id picked before: a form does not submit what was typed over', async () => {
    mocks.denied = ['user:read']
    const w = picker({ id: '54', 'onUpdate:id': (id: string) => w.setProps({ id }) })
    await flushPromises()
    expect(shown(w)).toBe('54')
    await commit(w, 'xyz')
    expect(w.emitted('update:id')).toEqual([['']])
    expect(w.emitted('change')).toEqual([[{ id: '', text: '' }]])
    await flushPromises()
    // The id the form reads is empty, and so is the box: the old id does not come back.
    expect(w.props('id')).toBe('')
    expect(shown(w)).toBe('')
  })

  it('with text bound, text that is no id stays the name search', async () => {
    mocks.denied = ['user:read']
    const w = picker({ id: '54', text: '' })
    await commit(w, 'xyz')
    expect(model(w)).toEqual({ id: '', text: 'xyz' })
  })

  it('the text box takes the id of a page candidate the lookup does not have', async () => {
    mocks.denied = ['group:read', 'account:group:bind']
    const w = picker({ kind: 'group', extra: [{ id: 0, name: 'Default group' }] })
    await commit(w, '0')
    expect(model(w)).toEqual({ id: '0', text: '' })
  })

  it('the text box does not take an excluded id, and shows the value in effect once the text is handed over', async () => {
    mocks.denied = ['user:read']
    const w = picker({ id: '', exclude: [7] })
    await commit(w, '7')
    expect(model(w)).toEqual({ id: '', text: '' })
    await flushPromises()
    expect((box(w).element as HTMLInputElement).value).toBe('')
    // A page that keeps the id elsewhere (a list of ids) leaves `id` empty: the box is ready for the next one.
    await commit(w, '9')
    expect(model(w)).toEqual({ id: '9', text: '' })
    await flushPromises()
    expect((box(w).element as HTMLInputElement).value).toBe('')
  })

  it('asks the permission of a mine lookup, which every signed-in user has for groups', async () => {
    mocks.denied = ['group:read', 'account:group:bind', 'usage:all:read']
    expect(picker({ kind: 'group' }).find('[role="combobox"]').exists()).toBe(false)
    expect(picker({ kind: 'group', mine: true }).find('[role="combobox"]').exists()).toBe(true)
    expect(picker({ kind: 'api_key' }).find('[role="combobox"]').exists()).toBe(false)
    expect(picker({ kind: 'api_key', mine: true }).find('[role="combobox"]').exists()).toBe(true)
  })
})
