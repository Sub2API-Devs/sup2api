import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SModal from './SModal.vue'
import SDrawer from './SDrawer.vue'
import SConfirmHost from './SConfirmHost.vue'
import { confirm } from './feedback'
import { pinViewport } from './internal/pinViewport'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

async function panelOf(compact: boolean, render: () => ReturnType<typeof h>) {
  mount(pinViewport({ compact }, render), { attachTo: document.body })
  await flushPromises()
  return document.querySelector<HTMLElement>('[role="dialog"]')!
}

describe('SModal forms', () => {
  it('stays the centered dialog on wide screens', async () => {
    const panel = await panelOf(false, () => h(SModal, { open: true, title: 'T', width: 'lg' }))
    expect(panel.classList.contains('modal-content')).toBe(true)
    expect(panel.style.maxWidth).toBe('42rem')
  })

  it('is a bottom sheet for sm / md and a full-screen page for wider dialogs on phones', async () => {
    const sheet = await panelOf(true, () => h(SModal, { open: true, title: 'T' }, { default: () => 'b', footer: () => h('button', 'ok') }))
    expect(sheet.className).toContain('s-drawer-bottom')
    expect(sheet.className).toContain('pb-[env(safe-area-inset-bottom)]')
    expect(sheet.querySelector('.rounded-full')).not.toBeNull()
    expect(sheet.lastElementChild!.textContent).toBe('ok')
    document.body.innerHTML = ''
    const page = await panelOf(true, () => h(SModal, { open: true, title: 'T', width: 'xl' }))
    expect(page.className).toContain('h-full')
    expect(page.className).not.toContain('rounded-t-panel')
    expect(page.style.maxWidth).toBe('')
    expect(page.querySelector('[data-overlay-close]')!.getAttribute('aria-label')).toBe('Close')
  })

  it('follows an explicit mobile form', async () => {
    const center = await panelOf(true, () => h(SModal, { open: true, title: 'T', width: 'xl', mobile: 'center' }))
    expect(center.classList.contains('modal-content')).toBe(true)
    document.body.innerHTML = ''
    const sheet = await panelOf(true, () => h(SModal, { open: true, title: 'T', width: '2xl', mobile: 'sheet' }))
    expect(sheet.className).toContain('s-drawer-bottom')
  })
})

describe('SDrawer on phones', () => {
  it('turns a side panel into a full-screen page sliding from the right, with a back arrow', async () => {
    const panel = await panelOf(true, () => h(SDrawer, { open: true, title: 'Details', side: 'left' }))
    expect(panel.className).toContain('s-drawer-right')
    expect(panel.className).toContain('h-full')
    const back = panel.querySelector('[data-overlay-close]')!
    expect(back.getAttribute('aria-label')).toBe('Back')
    expect(back.className).toContain('order-first')
  })
})

describe('SConfirmHost on phones', () => {
  it('stays centered with the two buttons sharing the width', async () => {
    const panel = await panelOf(true, () => h(SConfirmHost))
    expect(panel).toBeNull()
    const answer = confirm({ message: 'Sure?' })
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.classList.contains('modal-content')).toBe(true)
    expect(dialog.className).toContain('max-md:w-[calc(100vw-32px)]')
    expect(dialog.querySelector('.modal-footer')!.className).toContain('max-md:*:flex-1')
    const buttons = dialog.querySelectorAll('.modal-footer button')
    ;(buttons[1] as HTMLButtonElement).click()
    expect(await answer).toBe(true)
  })
})
