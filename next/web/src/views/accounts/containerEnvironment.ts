import type { SelectOption } from '@sub2api/ui'
import supportedLocales from '../../../../plugins/ccgateway/companions/contracts/environment/locales.json'

export const containerLocales = [...supportedLocales].sort((a, b) => a.localeCompare(b, 'en'))
export const containerTimezones = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])].sort((a, b) => a.localeCompare(b, 'en'))

export function localeForCountry(country: string): string {
  if (!/^[a-z]{2}$/i.test(country)) return ''
  const region = country.toUpperCase()
  const language = new Intl.Locale(`und-${region}`).maximize().language
  const locale = `${language}-${region}`
  return containerLocales.includes(locale) ? locale : ''
}

export function environmentOptions(values: string[], current: string, displayLocale?: string): SelectOption[] {
  const names = displayLocale ? new Intl.DisplayNames([displayLocale], { type: 'language' }) : null
  return [...new Set([...values, ...(current ? [current] : [])])]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(value => {
      let label = value
      if (names) {
        try { label = `${value} · ${names.of(value) || value}` } catch { label = value }
      }
      return { value, label }
    })
}

export interface ProxyLocation {
  ip: string
  country_code: string
  timezone: string
}
