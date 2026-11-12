import { describe, expect, expectTypeOf, it } from 'vitest'
import * as ui from './index'
import { HOST_COMPONENT_NAMES, HOST_UI_VERSION, MAX_ACCOUNT_BATCH, satisfiesRange } from '@sub2api/host'
import { HOST_UI_VERSION as PRESET_UI_VERSION } from '@sub2api/vite-preset'
import hostPackage from '../../host/package.json'
import presetPackage from '../../vite-preset/package.json'
import uiPackage from '../package.json'

describe('host UI 3 contract', () => {
  it('exposes only enhanced STabs without layout aliases', () => {
    expect(ui.STabs).toBeDefined()
    expect('STabLayout' in ui).toBe(false)
    expect('TabBar' in ui).toBe(false)
  })
  it('rejects unported UI 1 plugins and accepts the migrated compatibility range', () => {
    expect(HOST_UI_VERSION).toBe('3.13.0')
    expect(satisfiesRange(HOST_UI_VERSION, '^1.0')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^2.0')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.0')).toBe(true)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.1')).toBe(true)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.2')).toBe(true)
    expect(satisfiesRange('3.1.0', '^3.2')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.3')).toBe(true)
    expect(satisfiesRange('3.2.0', '^3.3')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.4')).toBe(true)
    expect(satisfiesRange('3.3.0', '^3.4')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.5')).toBe(true)
    expect(satisfiesRange('3.4.0', '^3.5')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.6')).toBe(true)
    expect(satisfiesRange('3.5.0', '^3.6')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.7')).toBe(true)
    expect(satisfiesRange('3.6.0', '^3.7')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.8')).toBe(true)
    expect(satisfiesRange('3.7.0', '^3.8')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.9')).toBe(true)
    expect(satisfiesRange('3.8.0', '^3.9')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.10')).toBe(true)
    expect(satisfiesRange('3.9.0', '^3.10')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.11')).toBe(true)
    expect(satisfiesRange('3.10.0', '^3.11')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.12')).toBe(true)
    expect(satisfiesRange('3.11.0', '^3.12')).toBe(false)
    expect(satisfiesRange(HOST_UI_VERSION, '^3.13')).toBe(true)
    expect(satisfiesRange('3.12.0', '^3.13')).toBe(false)
  })
  it('keeps the plugin preset and the shared packages on the host UI version', () => {
    expect(PRESET_UI_VERSION).toBe(HOST_UI_VERSION)
    expect([hostPackage.version, uiPackage.version, presetPackage.version]).toEqual([HOST_UI_VERSION, HOST_UI_VERSION, HOST_UI_VERSION])
  })
  it('exports more filters, applied filter chips and one-line chip lists (UI 3.10)', () => {
    expect(ui.SFilterChips).toBeDefined()
    expect(ui.SChipList).toBeDefined()
    expect(ui.ICON_NAMES).toContain('image')
    expectTypeOf<ui.FilterChipItem>().toEqualTypeOf<{ key: string; label: string; value: string }>()
    expectTypeOf<ui.TableColumn['grow']>().toEqualTypeOf<boolean | undefined>()
  })
  it('names the core editors (UI 3.7) and the entity pickers (UI 3.11, the multiple one 3.12) handed to plugins', () => {
    expect(HOST_COMPONENT_NAMES).toEqual([
      'ParamOverrideEditor',
      'RateLimitEditor',
      'ModelLimitsEditor',
      'HeaderPassthroughEditor',
      'ProxyPicker',
      'ModelMappingEditor',
      'UpstreamEditor',
      'EntityPicker',
      'EntityMultiPicker'
    ])
  })
  it('locks the account batch size shared with the core (UI 3.6)', () => {
    expect(MAX_ACCOUNT_BATCH).toBe(500)
  })
  it('exports the phone forms (UI 3.5), keeping the media queries internal', () => {
    expect(ui.useViewport).toBeTypeOf('function')
    expect(ui.provideViewport).toBeTypeOf('function')
    expect(ui.dismissTopLayer).toBeTypeOf('function')
    expectTypeOf<ui.Viewport['compact']['value']>().toEqualTypeOf<boolean>()
    expectTypeOf<ui.ModalMobile>().toEqualTypeOf<'auto' | 'sheet' | 'fullscreen' | 'center'>()
    expect('WIDE_QUERY' in ui).toBe(false)
    expect('TOUCH_QUERY' in ui).toBe(false)
  })
  it('exports the shared page building blocks (UI 3.4)', () => {
    for (const name of [
      'SStatusBadge',
      'statusTone',
      'SFormModal',
      'SFilterBar',
      'SAutoRefresh',
      'useAutoRefresh',
      'useNow',
      'lazyPage'
    ] as const) {
      expect(ui[name]).toBeDefined()
    }
  })
  it('exports listAll from the host (UI 3.3)', async () => {
    expect((await import('@sub2api/host')).listAll).toBeTypeOf('function')
  })
  it('exports the bulk selection bar (UI 3.2)', () => {
    expect(ui.SBulkBar).toBeDefined()
  })
  it('exports column preferences for native plugins and custom layouts', () => {
    expect(ui.SIPAddress).toBeDefined()
    expect(ui.STableColumnSettings).toBeDefined()
    expect(ui.useTableColumns).toBeTypeOf('function')
    expect(ui.TABLE_COLUMN_SCOPE_KEY).toBeTypeOf('symbol')
  })
})
