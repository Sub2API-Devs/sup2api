import { describe, expect, it } from 'vitest'
import { ApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import { fieldErrors } from './errors'

const invalid = (fields: { field: string; code?: string; message: string }[]) => new ApiError(400, { code: 'invalid_argument', message: 'invalid argument', details: { fields } })

describe('fieldErrors', () => {
  it('translates the codes a form knows and keeps the server message otherwise', () => {
    const e = invalid([
      { field: 'values/api_key', code: 'reenter', message: 're-enter this secret to change other settings' },
      { field: 'values/url', code: 'format', message: 'must be a URL' },
      { field: 'name', message: 'required' }
    ])
    const codes = { reenter: 'plugins.settings.reenter' }
    i18n.global.locale.value = 'zh'
    expect(fieldErrors(e, undefined, codes)).toEqual({ 'values/api_key': '要修改其他设置，需要重新填写这个密钥', 'values/url': 'must be a URL', name: 'required' })
    i18n.global.locale.value = 'en'
    expect(fieldErrors(e, 'values/', codes)).toEqual({ api_key: 'Re-enter this secret to change other settings', url: 'must be a URL' })
    expect(fieldErrors(e)).toEqual({ 'values/api_key': 're-enter this secret to change other settings', 'values/url': 'must be a URL', name: 'required' })
  })

  it('maps the notification test codes in both languages, falling back for the old "invalid"', () => {
    const codes = {
      unknown_channel: 'settings.notifications.errors.unknown_channel',
      recipients_count: 'settings.notifications.errors.recipients_count',
      invalid_recipient: 'settings.notifications.errors.invalid_recipient'
    }
    const e = invalid([
      { field: 'channel', code: 'unknown_channel', message: 'unknown notification channel' },
      { field: 'recipients', code: 'invalid_recipient', message: 'invalid recipient x' }
    ])
    i18n.global.locale.value = 'zh'
    expect(fieldErrors(e, undefined, codes)).toEqual({ channel: '没有这个通知渠道，可能提供它的插件已停用', recipients: '收件人格式不符合该渠道的要求' })
    i18n.global.locale.value = 'en'
    expect(fieldErrors(invalid([{ field: 'recipients', code: 'recipients_count', message: 'between 1 and 20 recipients' }]), undefined, codes)).toEqual({ recipients: 'Give 1-20 recipients' })
    expect(fieldErrors(invalid([{ field: 'recipients', code: 'invalid', message: 'between 1 and 20 recipients' }]), undefined, codes)).toEqual({ recipients: 'between 1 and 20 recipients' })
  })
})
