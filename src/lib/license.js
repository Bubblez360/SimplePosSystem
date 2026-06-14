import { supabase } from './supabase'

const CACHE_KEY = 'licenseCache'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

export async function validateLicense(key) {
  if (!key?.trim()) return { valid: false, error: 'No key' }
  if (!supabase) return { valid: false, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('licenses')
    .select('license_key, active, expires_at')
    .eq('license_key', key.trim())
    .single()

  if (error || !data) return { valid: false, error: 'Invalid license key' }
  if (!data.active) return { valid: false, error: 'License deactivated' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'License expired' }
  }

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

  const { data, error } = await supabase
    .from('licenses')
    .select('license_key, active, expires_at')
    .eq('email', email.toLowerCase().trim())
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return { key: null, error: 'No license found for that email' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { key: null, error: 'License expired' }
  }
  return { key: data.license_key }
}
