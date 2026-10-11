import { describe, expect, it } from 'vitest'
import { containerLocales, containerTimezones, environmentOptions, localeForCountry } from './containerEnvironment'

describe('container environment options', () => {
  it.each([['US', 'en-US'], ['CN', 'zh-CN'], ['JP', 'ja-JP'], ['DE', 'de-DE'], ['gb', 'en-GB'], ['TW', 'zh-TW']])('maps %s to %s', (country, expected) => {
    expect(localeForCountry(country)).toBe(expected)
    expect(containerLocales).toContain(expected)
  })

  it('does not guess a locale for unknown countries', () => {
    expect(localeForCountry('')).toBe('')
    expect(localeForCountry('ZZ')).toBe('')
    expect(localeForCountry('invalid')).toBe('')
    expect(localeForCountry('AQ')).toBe('')
    expect(containerLocales).not.toContain('en-AQ')
  })

  it('keeps lists unique, alphabetized and includes UTC', () => {
    for (const values of [containerLocales, containerTimezones]) {
      expect(values).toEqual([...new Set(values)].sort((a, b) => a.localeCompare(b, 'en')))
      expect(values.length).toBeGreaterThan(100)
    }
    expect(containerTimezones).toContain('UTC')
    expect(containerTimezones).toContain('America/New_York')
  })

  it('keeps existing values and timezone aliases selectable without duplicating them', () => {
    const options = environmentOptions(containerTimezones, 'Asia/Kolkata')
    expect(options.filter(o => o.value === 'Asia/Kolkata')).toHaveLength(1)
    expect(environmentOptions(['en-US'], 'en-US', 'zh')[0].label).toContain('英语')
    expect(environmentOptions(['en-US'], 'legacy_locale', 'zh').map(o => o.value)).toContain('legacy_locale')
  })
})
