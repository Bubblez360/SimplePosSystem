import { describe, it, expect } from 'vitest'
import { isIos, isInstalledApp, shouldShowIosHint } from './platform'

const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 }
const IPAD_AS_MAC = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 }
const MAC = { ...IPAD_AS_MAC, maxTouchPoints: 0 }
const ANDROID = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 }

describe('isIos', () => {
  it('detects iPhone and iPad (including iPadOS posing as a Mac)', () => {
    expect(isIos(IPHONE)).toBe(true)
    expect(isIos(IPAD_AS_MAC)).toBe(true)
  })
  it('does not treat a desktop Mac or Android as iOS', () => {
    expect(isIos(MAC)).toBe(false)
    expect(isIos(ANDROID)).toBe(false)
    expect(isIos()).toBe(false)
  })
})

describe('shouldShowIosHint', () => {
  it('shows in iOS Safari when not installed', () => {
    expect(shouldShowIosHint({ ...IPHONE })).toBe(true)
  })
  it('hides once running from the Home Screen or inside the wrapper', () => {
    expect(shouldShowIosHint({ ...IPHONE, standalone: true })).toBe(false)
    expect(shouldShowIosHint({ ...IPHONE, displayStandalone: true })).toBe(false)
    expect(shouldShowIosHint({ ...IPHONE, isNative: true })).toBe(false)
    expect(isInstalledApp({})).toBe(false)
  })
  it('never shows on Android or desktop', () => {
    expect(shouldShowIosHint(ANDROID)).toBe(false)
    expect(shouldShowIosHint(MAC)).toBe(false)
  })
})
