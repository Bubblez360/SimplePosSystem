import { supabase } from './supabase'

const CACHE_KEY = 'licenseCache'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

export async function validateLicense(key) {
  if (!key?.trim()) return { valid: false, error: 'No key' }
  if (!supabase) return { valid: false, error: 'Supabase not configured' }

  const { data, error } = await supabase.functions.invoke('validate-license', {
    body: { key: key.trim() },
  })

  if (error) return { valid: false, error: error.message ?? 'Validation failed' }
  if (!data?.valid) return { valid: false, error: data?.error ?? 'Invalid license key' }

  const cache = { key, expires_at: data.expires_at, cachedAt: Date.now() }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  return { valid: true, ...cache }
}

export function getCachedLicense() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw)
    if (Date.now() - cache.cachedAt > CACHE_TTL) return null
    // H1 fix: expired license must not grant premium even within 24h cache window
    if (cache.expires_at && new Date(cache.expires_at) < new Date()) return null
    return cache
  } catch {
    return null
  }
}

export function clearLicense() {
  localStorage.removeItem(CACHE_KEY)
}

export async function retrieveLicenseByEmail(email) {
  if (!email?.trim() || !supabase) return { key: null, error: 'Invalid email' }

  const { data, error } = await supabase.functions.invoke('retrieve-license', {
    body: { email: email.trim() },
  })

  if (error) return { key: null, error: error.message ?? 'Lookup failed' }
  if (!data?.key) return { key: null, error: data?.error ?? 'No license found for that email' }
  return { key: data.key }
}
