import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SInput from './SInput.vue'

const attrs = (props: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  mount(SInput, { props: { modelValue: '', ...props }, attrs: extra })
    .get('input')
    .attributes()

describe('SInput phone keyboard', () => {
  it('turns off autocapitalize, autocorrect and spellcheck for non-prose fields', () => {
    for (const props of [{ mono: true }, { type: 'url' }, { type: 'email' }, { type: 'password', revealable: true }]) {
      expect(attrs(props)).toMatchObject({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' })
    }
    const prose = attrs({})
    expect(prose.autocapitalize).toBeUndefined()
    expect(prose.spellcheck).toBeUndefined()
  })

  it('asks for the decimal pad only on number fields that cannot go negative', () => {
    expect(attrs({ type: 'number', min: 0 }).inputmode).toBe('decimal')
    expect(attrs({ type: 'number' }).inputmode).toBeUndefined()
    expect(attrs({ type: 'number', min: -5 }).inputmode).toBeUndefined()
    expect(attrs({ type: 'number', min: 0, inputmode: 'numeric' }).inputmode).toBe('numeric')
  })

  it('lets attributes passed by the page win', () => {
    expect(attrs({ mono: true }, { autocapitalize: 'characters', spellcheck: 'true' })).toMatchObject({
      autocapitalize: 'characters',
      spellcheck: 'true'
    })
  })
})
