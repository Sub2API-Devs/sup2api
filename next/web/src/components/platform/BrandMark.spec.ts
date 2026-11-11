import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandMark from './BrandMark.vue'
import { brand } from './brands'

const render = (id: string, label: string, decorative = false) => mount(BrandMark, { props: { brand: brand(id), label, decorative } })

describe('brand mark', () => {
  it('draws a known vendor as its mark in the brand colours, named by the label', () => {
    const w = render('gemini', 'Gemini')
    expect(w.element.tagName).toBe('svg')
    expect(w.findAll('path')).toHaveLength(brand('gemini').mark!.length)
    expect(w.attributes()).toMatchObject({ role: 'img', 'aria-label': 'Gemini', 'data-brand': 'gemini' })
    expect(w.get('title').text()).toBe('Gemini')
    expect(w.attributes('style')).toContain('--brand: #4285F4')
    expect(w.attributes('style')).toContain('--brand-dark: #7BAAF7')
  })

  it('draws an unknown vendor as the first letter of the label on its stand-in colour', () => {
    const w = render('myvideo', 'myVideo 视频')
    expect(w.element.tagName).toBe('SPAN')
    expect(w.text()).toBe('M')
    expect(w.attributes()).toMatchObject({ role: 'img', 'aria-label': 'myVideo 视频', title: 'myVideo 视频', 'data-brand': 'myvideo' })
    expect((w.element as HTMLElement).style.backgroundColor).not.toBe('')
    expect(render('myvideo', '视频生成').text()).toBe('视')
    // By code point: an emoji is not cut in half; no label, no letter.
    expect(render('myvideo', '🎬 studio').text()).toBe('🎬')
    expect(render('myvideo', '').text()).toBe('')
  })

  it('is hidden from assistive technology where its label stands beside it', () => {
    for (const id of ['gemini', 'myvideo']) {
      const w = render(id, 'Label', true)
      expect(w.attributes('aria-hidden')).toBe('true')
      expect(w.attributes('role')).toBeUndefined()
      expect(w.attributes('aria-label')).toBeUndefined()
      expect(w.attributes('title')).toBeUndefined()
      expect(w.find('title').exists()).toBe(false)
    }
  })
})
