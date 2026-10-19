import { describe, expect, it } from 'vitest'
import { subscriptionLabel } from './subscription'

describe('subscriptionLabel', () => {
  it('names the Claude plans and keeps other values', () => {
    expect(subscriptionLabel('max')).toBe('Max')
    expect(subscriptionLabel('pro')).toBe('Pro')
    expect(subscriptionLabel('enterprise')).toBe('Enterprise')
    expect(subscriptionLabel('plus')).toBe('plus')
    expect(subscriptionLabel(null)).toBe('')
  })
})
