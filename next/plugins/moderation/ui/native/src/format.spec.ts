import { describe, expect, it } from 'vitest'
import { mib } from './format'

describe('mib', () => {
  it('shows bytes as mebibytes with one decimal', () => {
    expect(mib(0)).toBe('0.0 MiB')
    expect(mib(1 << 20)).toBe('1.0 MiB')
    expect(mib(13_107_200)).toBe('12.5 MiB')
    expect(mib(undefined)).toBe('0.0 MiB')
  })
})
