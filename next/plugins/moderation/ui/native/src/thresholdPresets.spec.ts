import { describe, expect, it } from 'vitest'
import { JEV_DEFAULT_THRESHOLD, thresholdOverrides, YES_NO_THRESHOLD } from './thresholdPresets'

describe('thresholdOverrides', () => {
  it('drops cleared inputs instead of sending 0', () => {
    expect(thresholdOverrides({ hate: null, sexual: '', violence: ' ', harassment: '0.4', illicit: 0.7, x: undefined })).toEqual({ harassment: 0.4, illicit: 0.7 })
  })
})

describe('question thresholds', () => {
  it('are within the range the backend takes (0 < threshold ≤ 1)', () => {
    for (const v of [JEV_DEFAULT_THRESHOLD, YES_NO_THRESHOLD]) expect(v > 0 && v <= 1).toBe(true)
    // a "yes" scores 1: only a threshold of 1 makes exactly the yes answers hits
    expect(YES_NO_THRESHOLD).toBe(1)
  })
})
