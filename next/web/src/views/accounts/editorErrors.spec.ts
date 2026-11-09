import { describe, expect, it } from 'vitest'
import { sectionOfErrors } from './editorErrors'

describe('sectionOfErrors', () => {
  it('sends request forwarding errors (header passthrough, environment) to the advanced section, scheduling errors first', () => {
    expect(sectionOfErrors({ header_passthrough: 'blocked' }, {})).toBe('advanced')
    expect(sectionOfErrors({ header_passthrough: 'blocked', rpm_limit: 'invalid' }, {})).toBe('scheduling')
    expect(sectionOfErrors({ name: 'required', header_passthrough: 'blocked' }, {})).toBe('connection')
    expect(sectionOfErrors({ 'environment.relay_timeout_seconds': 'invalid' }, {})).toBe('advanced')
    expect(sectionOfErrors({ param_override: 'invalid' }, {})).toBe('advanced')
    expect(sectionOfErrors({ conversion_loss_policy: 'invalid' }, {})).toBe('advanced')
  })
})
