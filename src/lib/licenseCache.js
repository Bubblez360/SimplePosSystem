// Local license cache. No network or Supabase imports, so the store and sync
// code can read it cheaply.
//
// Premium is decided by the license's own expiry date, NOT by how recently the
// app phoned home. (It used to lapse 24h after the last check, so a vendor who
// stayed offline a day lost Premium and had to re-enter the key.)
//
//   usable          = expires_at in the future AND last successful server check
//                     within GRACE_MS (so a deactivated/refunded key can't work
//                     offline forever)
//   needsRevalidation = last check older than REVALIDATE_AFTER_MS

export const CACHE_KEY = 'licenseCache'
export const REVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000
export const GRACE_MS = 14 * 24 * 60 * 60 * 1000

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache = raw ? JSON.parse(raw) : null
    return cache && typeof cache === 'object' && cache.key ? cache : null
  } catch {
    return null
  }
}

export function writeCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
}

export function getCachedLicense(now = Date.now()) {
  const cache = readCache()
  if (!cache) return null
  if (cache.expires_at && new Date(cache.expires_at).getTime() <= now) return null
  if (now - (cache.cachedAt ?? 0) > GRACE_MS) return null
  return cache
}

export function needsRevalidation(cache, now = Date.now()) {
  if (!cache) return true
  return now - (cache.cachedAt ?? 0) > REVALIDATE_AFTER_MS
}
