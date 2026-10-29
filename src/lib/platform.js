// iOS has no "install" event: the only way onto the Home Screen is Share ->
// Add to Home Screen, and users don't know it. This decides when to show a hint.

// iPadOS 13+ reports itself as a Mac, so a Mac with a touchscreen is an iPad.
export function isIos({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return platform === 'MacIntel' && maxTouchPoints > 1
}

// True when the app is already running from the Home Screen (iOS "standalone"
// or any installed-PWA display mode) or inside the Android/iOS wrapper.
export function isInstalledApp({ standalone = false, displayStandalone = false, isNative = false } = {}) {
  return !!(standalone || displayStandalone || isNative)
}

export function shouldShowIosHint(env) {
  return isIos(env) && !isInstalledApp(env)
}

export function readEnv() {
  if (typeof window === 'undefined') return {}
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: navigator.standalone === true,
    displayStandalone: !!window.matchMedia?.('(display-mode: standalone)').matches,
    isNative: !!window.Capacitor?.isNativePlatform?.(),
  }
}
