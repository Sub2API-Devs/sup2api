import { describe, expect, it } from 'vitest'
import { isSchedulingField, sectionOfErrors } from './editorErrors'

describe('sectionOfErrors', () => {
  it('sends request forwarding errors (header passthrough, environment) to the advanced section, scheduling errors first', () => {
    expect(sectionOfErrors({ header_passthrough: 'blocked' }, {})).toBe('advanced')
    expect(sectionOfErrors({ header_passthrough: 'blocked', rpm_limit: 'invalid' }, {})).toBe('scheduling')
    expect(sectionOfErrors({ name: 'required', header_passthrough: 'blocked' }, {})).toBe('connection')
    expect(sectionOfErrors({ 'environment.relay_timeout_seconds': 'invalid' }, {})).toBe('advanced')
    expect(sectionOfErrors({ param_override: 'invalid' }, {})).toBe('advanced')
    expect(sectionOfErrors({ conversion_loss_policy: 'invalid' }, {})).toBe('advanced')
  })

  it("counts a fixed control and a model list's limit as scheduling fields", () => {
    expect(isSchedulingField('schedulable')).toBe(true)
    expect(isSchedulingField('model_limits[0].rpm_limit')).toBe(true)
    expect(isSchedulingField('spm_window_seconds')).toBe(true)
    expect(isSchedulingField('models')).toBe(false)
    expect(sectionOfErrors({ header_passthrough: 'blocked', 'model_limits[0].models': 'invalid' }, {})).toBe('scheduling')
  })
})
