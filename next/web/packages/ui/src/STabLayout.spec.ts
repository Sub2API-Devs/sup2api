import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import STabLayout from './STabLayout.vue'
import SSettingsGroup from './SSettingsGroup.vue'
import SPageHeader from './SPageHeader.vue'
import SSectionTitle from './SSectionTitle.vue'
import SModal from './SModal.vue'
import SDrawer from './SDrawer.vue'
import SchemaForm from './schema/SchemaForm.vue'

enableAutoUnmount(afterEach)
const tabs = [{ key: 'billing', label: '计费' }, { key: 'other', label: '其他' }]

describe('platform tab title ownership', () => {
  it('hides matching titles but keeps controls, description, distinct sections and panel labels', () => {
    const wrapper = mount(STabLayout, { props: { tabs, modelValue: 'billing', idPrefix: 'settings' }, slots: { default: () => [
      h(SPageHeader, { title: '计费' }),
      h(SSectionTitle, { title: '计费' }),
      h(SSettingsGroup, { title: '计费', description: '计费说明' }, { default: () => '内容', actions: () => h('button', '保存') }),
      h(SSettingsGroup, { title: '价格' }, () => '价格设置')
    ] } })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('h3').exists()).toBe(false)
    expect(wrapper.findAll('h5').map(el => el.text())).toEqual(['价格'])
    expect(wrapper.text()).toContain('计费说明')
    expect(wrapper.findAll('button').some(el => el.text() === '保存')).toBe(true)
    expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe('settings-tab-billing')
    expect(wrapper.get('#settings-tab-billing').attributes('aria-controls')).toBe('settings-panel-billing')
  })

  it('removes empty title bars and follows locale and tab changes reactively', async () => {
    const wrapper = mount(STabLayout, { props: { tabs, modelValue: 'billing' }, slots: { default: () => h(SSettingsGroup, { title: '计费' }, () => '内容') } })
    expect(wrapper.find('header').exists()).toBe(false)
    await wrapper.setProps({ modelValue: 'other' })
    expect(wrapper.get('h5').text()).toBe('计费')
    await wrapper.setProps({ modelValue: 'billing', tabs: [{ key: 'billing', label: 'Billing' }, tabs[1]!] })
    expect(wrapper.get('h5').text()).toBe('计费')
    await wrapper.setProps({ tabs })
    expect(wrapper.find('header').exists()).toBe(false)
  })

  it('retains titles when a single tab is not displayed and when standalone', () => {
    const wrapper = mount(STabLayout, { props: { tabs: [tabs[0]!], modelValue: 'billing' }, slots: { default: () => h(SSettingsGroup, { title: '计费' }) } })
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.get('h5').text()).toBe('计费')
    expect(mount(SPageHeader, { props: { title: '计费' } }).get('h1').text()).toBe('计费')
  })

  it('keeps collapse actions and custom title slots intact', async () => {
    const wrapper = mount(STabLayout, { props: { tabs, modelValue: 'billing' }, slots: { default: () => [
      h(SSettingsGroup, { title: '计费', collapsible: true }, () => '可折叠内容'),
      h(SSettingsGroup, { title: '计费' }, { title: () => h('strong', '自定义标题和状态') })
    ] } })
    expect(wrapper.get('h5').text()).toBe('计费')
    const toggle = wrapper.get('button[aria-expanded]')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).toContain('自定义标题和状态')
  })

  it('isolates nested tabs and dialogs from outer titles', () => {
    const wrapper = mount(STabLayout, { props: { tabs, modelValue: 'billing' }, global: { stubs: { teleport: true } }, slots: { default: () => [
      h(STabLayout, { tabs, modelValue: 'other' }, () => h(SSettingsGroup, { title: '计费' })),
      h(SModal, { open: true, title: '计费' }, () => h(SSectionTitle, { title: '计费' })),
      h(SDrawer, { open: true, title: '计费' }, () => h(SPageHeader, { title: '计费' }))
    ] } })
    expect(wrapper.get('h5').text()).toBe('计费')
    expect(wrapper.findComponent(SModal).findAll('h3')).toHaveLength(2)
    expect(wrapper.findComponent(SDrawer).get('h1').text()).toBe('计费')
  })

  it('applies the same default to plugin schema settings without altering data', () => {
    const values = { enabled: true }
    const wrapper = mount(STabLayout, { props: { tabs, modelValue: 'billing' }, slots: { default: () => h(SchemaForm, {
      layout: 'settings', modelValue: values,
      schema: { type: 'object', properties: { enabled: { type: 'boolean', title: '启用' } } },
      uiSchema: { enabled: { 'ui:section': { title: '计费' } } }
    }) } })
    expect(wrapper.find('h5').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(true)
    expect(values).toEqual({ enabled: true })
  })
})
