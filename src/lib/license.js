import { supabase } from './supabase'
import {
  readCache, writeCache, clearCache, getCachedLicense, needsRevalidation,
  REVALIDATE_AFTER_MS, GRACE_MS,
} from './licenseCache'

export { getCachedLicense, needsRevalidation, REVALIDATE_AFTER_MS, GRACE_MS }

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // cheap: each tick is a no-op until the cache is stale

// supabase.functions.invoke() turns every non-2xx into an opaque error whose
// `context` is the Response. Pull out the status and the server's own message.
const isNetworkFailure = error => error?.name === 'FunctionsFetchError'

async function readFunctionError(error) {
  let status = error?.context?.status ?? null
  let message = error?.message ?? null
  try {
    const body = await error?.context?.json?.()
    message = body?.error ?? message
  } catch { /* body wasn't JSON */ }
  return { status, message }
}

// `definitive` is true ONLY when the server answered 200 and said "not valid".
// Network failures, rate limits and server errors are not a verdict on the key.
export async function validateLicense(key) {
  if (!key?.trim()) return { valid: false, definitive: true, error: 'No key' }
  if (!supabase) return { valid: false, definitive: false, error: 'Supabase not configured' }

  let data, error
  try {
    ({ data, error } = await supabase.functions.invoke('validate-license', { body: { key: key.trim() } }))
  } catch (err) {
    return { valid: false, definitive: false, network: true, error: err?.message ?? 'Network error' }
  }

  if (error) {
    const { message } = await readFunctionError(error)
    return { valid: false, definitive: false, network: isNetworkFailure(error), error: message ?? 'Validation failed' }
  }
  if (!data?.valid) return { valid: false, definitive: true, error: data?.error ?? 'Invalid license key' }

  const cache = { key: key.trim(), expires_at: data.expires_at, plan: data.plan, cachedAt: Date.now() }
  writeCache(cache)
  return { valid: true, ...cache }
}

export function clearLicense() {
  clearCache()
  localStorage.removeItem('tindapos_trial_used')
}

// Re-check the license against the server when the cache is stale, and report
// whether Premium should be on. Never downgrades on a transient failure.
//   none        no license on this device
//   fresh       cache is recent enough, nothing to do
//   offline     can't reach the server; keep whatever the cache says
//   valid       server confirmed (cache refreshed — picks up renewals too)
//   invalid     server rejected the key (expired / deactivated / unknown)
//   unavailable server busy or erroring; keep whatever the cache says
export async function refreshLicense({ force = false } = {}) {
  const cache = readCache()
  const key = cache?.key || localStorage.getItem('licenseKey')
  if (!key) return { status: 'none', premium: false, license: null }

  const usable = getCachedLicense()
  if (!force && usable && !needsRevalidation(cache)) return { status: 'fresh', premium: true, license: usable }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline', premium: !!usable, license: usable }
  }

  const result = await validateLicense(key)
  if (result.valid) return { status: 'valid', premium: true, license: getCachedLicense() }
  if (result.definitive) {
    clearCache()
    return { status: 'invalid', premium: false, license: null, error: result.error }
  }
  return { status: 'unavailable', premium: !!usable, license: usable }
}

// Keep Premium state correct without the vendor opening Settings: check at
// startup, when the connection returns, when the app regains focus, and hourly.
export function initLicenseRefresh(onResult, { intervalMs = CHECK_INTERVAL_MS } = {}) {
  let running = false
  async function run() {
    if (running) return
    running = true
    try {
      const result = await refreshLicense()
      if (result.status !== 'none') onResult(result)
    } finally {
      running = false
    }
  }
  const onVisible = () => { if (document.visibilityState === 'visible') run() }

  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  const timer = setInterval(run, intervalMs)
  run()

  return () => {
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(timer)
  }
}

// Asks the server to EMAIL the key to the address on file. The key itself is
// never returned to the app, so knowing someone's email no longer gets you
// their license.
export async function retrieveLicenseByEmail(email) {
  if (!email?.trim() || !supabase) return { sent: false, error: 'Invalid email' }

  let data, error
  try {
    ({ data, error } = await supabase.functions.invoke('retrieve-license', { body: { email: email.trim() } }))
  } catch (err) {
    return { sent: false, network: true, error: err?.message ?? 'Network error' }
  }

  if (error) {
    const { message } = await readFunctionError(error)
    return { sent: false, network: isNetworkFailure(error), error: message ?? 'Request failed' }
  }
  if (data?.sent !== true) return { sent: false, error: data?.error ?? 'Could not send the key' }
  return { sent: true }
}
