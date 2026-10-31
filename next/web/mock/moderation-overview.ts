import { fail, nextId, now, on, paginate } from './router'

// Extra moderation mock routes of the overview area (new routes only; the
// shared data and the existing routes live in moderation.ts).
void [fail, nextId, now, on, paginate]

// Plugin settings of the moderation settings tab (core GET / PUT
// /plugins/:key/settings, CONTRACTS §72.14.7). Registered before the
// generic plugins.ts route, which has no moderation plugin.
const settings: Record<string, unknown> = {
  mode: 'observe',
  exempt_user_ids: ['1'],
  block_status: 403,
  block_message: '',
  auto_watch: true,
  watch_days: 30,
  analysis_every_violations: 30,
  ban_threshold: 0,
  analysis_channel_id: 4,
  analysis_guidelines: '',
  record_pass: false,
  store_text: true,
  error_rate_alert_percent: 5,
  stats_retention_days: 90,
  notify_webhook_url: '',
  jev_default_set: null,
  api_key: '******'
}

on('GET', '/plugins/moderation/settings', () => ({ mode: 'schema', schema: null, ui_schema: null, values: settings, secret_fields: ['api_key'] }))
on('PUT', '/plugins/moderation/settings', (req) => {
  const values = { ...(req.body?.values || {}) }
  const status = Number(values.block_status)
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    return fail(400, 'invalid_argument', 'invalid settings', { fields: [{ field: 'values.block_status', code: 'range', message: 'must be between 400 and 599' }] })
  }
  if (values.api_key === '******' || values.api_key === undefined) values.api_key = settings.api_key
  for (const k of Object.keys(settings)) delete settings[k]
  Object.assign(settings, values)
  return { mode: 'schema', schema: null, ui_schema: null, values: settings, secret_fields: ['api_key'] }
})
