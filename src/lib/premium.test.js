import { describe, it, expect } from 'vitest'
import { isPeriodLocked, canExportCsv } from './premium'

describe('premium gating', () => {
  it('keeps Today and This Week free', () => {
    expect(isPeriodLocked('today', false)).toBe(false)
    expect(isPeriodLocked('week', false)).toBe(false)
  })

  it('locks the year-to-date report for free vendors only', () => {
    expect(isPeriodLocked('month', false)).toBe(true)
    expect(isPeriodLocked('month', true)).toBe(false)
  })

  it('allows CSV export only with Premium', () => {
    expect(canExportCsv(false)).toBe(false)
    expect(canExportCsv(undefined)).toBe(false)
    expect(canExportCsv(true)).toBe(true)
  })
})
