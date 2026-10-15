import { describe, expect, it } from 'vitest'
import * as ui from './index'
import { HOST_UI_VERSION, satisfiesRange } from '@sub2api/host'

describe('host UI 2 contract', () => {
  it('exposes the content-owning tab layout without the removed tab bar', () => {
    expect(ui.STabLayout).toBeDefined()
    expect('STabs' in ui).toBe(false)
    expect('TabBar' in ui).toBe(false)
  })
  it('rejects unported UI 1 plugins and accepts the migrated compatibility range', () => {
    expect(HOST_UI_VERSION).toBe('2.0.0')
    expect(satisfiesRange(HOST_UI_VERSION, '^1.0')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '>=1.0.0 <3.0.0')).toBe(true)
  })
})
