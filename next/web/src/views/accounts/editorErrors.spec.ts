import { describe, expect, it } from 'vitest'
import { sectionOfErrors } from './editorErrors'

describe('sectionOfErrors', () => {
  it('sends header passthrough errors to the advanced section, scheduling errors first', () => {
    expect(sectionOfErrors({ header_passthrough: 'blocked' }, {})).toBe('advanced')
    expect(sectionOfErrors({ header_passthrough: 'blocked', rpm_limit: 'invalid' }, {})).toBe('scheduling')
    expect(sectionOfErrors({ name: 'required', header_passthrough: 'blocked' }, {})).toBe('connection')
  })
})
