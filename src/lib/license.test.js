import { beforeEach, describe, it, expect, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: (...a) => invoke(...a) } } }))

import {
  getCachedLicense, needsRevalidation, refreshLicense, retrieveLicenseByEmail, validateLicense, createCheckout,
  REVALIDATE_AFTER_MS, GRACE_MS,
} from './license'

const HOUR = 3600_000
const DAY = 24 * HOUR
const iso = ms => new Date(ms).toISOString()

function seedCache(over = {}) {
  const cache = { key: 'AAAA-BBBB-CCCC-DDDD', plan: 'monthly', expires_at: iso(Date.now() + 20 * DAY), cachedAt: Date.now(), ...over }
  localStorage.setItem('licenseCache', JSON.stringify(cache))
  return cache
}

beforeEach(() => {
  localStorage.clear()
  invoke.mockReset()
})

describe('getCachedLicense', () => {
  it('keeps Premium for days offline — a 24h-old cache is still usable (the old bug)', () => {
    seedCache({ cachedAt: Date.now() - 5 * DAY })
    expect(getCachedLicense()).toMatchObject({ key: 'AAAA-BBBB-CCCC-DDDD' })
  })

  it('is unusable once the license has expired', () => {
    seedCache({ expires_at: iso(Date.now() - 1000) })
    expect(getCachedLicense()).toBeNull()
  })

  it('is unusable after the offline grace window with no successful re-check', () => {
    seedCache({ cachedAt: Date.now() - GRACE_MS - HOUR })
    expect(getCachedLicense()).toBeNull()
  })

  it('treats a missing or corrupt cache as no license', () => {
    expect(getCachedLicense()).toBeNull()
    localStorage.setItem('licenseCache', '{nope')
    expect(getCachedLicense()).toBeNull()
  })

  it('supports a license with no expiry date', () => {
    seedCache({ expires_at: null })
    expect(getCachedLicense()).not.toBeNull()
  })
})

describe('needsRevalidation', () => {
  it('is due only after the revalidation interval', () => {
    expect(needsRevalidation({ cachedAt: Date.now() - HOUR })).toBe(false)
    expect(needsRevalidation({ cachedAt: Date.now() - REVALIDATE_AFTER_MS - HOUR })).toBe(true)
    expect(needsRevalidation(null)).toBe(true)
  })
})

describe('refreshLicense', () => {
  it('does nothing when there is no license at all', async () => {
    expect(await refreshLicense()).toMatchObject({ status: 'none', premium: false })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('skips the network while the cache is fresh', async () => {
    seedCache()
    expect(await refreshLicense()).toMatchObject({ status: 'fresh', premium: true })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('renews the cache (new expiry after a renewal payment) when the server says valid', async () => {
    seedCache({ cachedAt: Date.now() - 2 * DAY })
    const newExpiry = iso(Date.now() + 365 * DAY)
    invoke.mockResolvedValue({ data: { valid: true, expires_at: newExpiry, plan: 'annual' }, error: null })

    const res = await refreshLicense()

    expect(res).toMatchObject({ status: 'valid', premium: true })
    expect(invoke).toHaveBeenCalledWith('validate-license', { body: { key: 'AAAA-BBBB-CCCC-DDDD' } })
    expect(getCachedLicense()).toMatchObject({ plan: 'annual', expires_at: newExpiry })
    expect(Date.now() - getCachedLicense().cachedAt).toBeLessThan(5000)
  })

  it('drops Premium only when the server definitively rejects the key', async () => {
    seedCache({ cachedAt: Date.now() - 2 * DAY })
    invoke.mockResolvedValue({ data: { valid: false, error: 'License deactivated' }, error: null })

    expect(await refreshLicense()).toMatchObject({ status: 'invalid', premium: false })
    expect(getCachedLicense()).toBeNull()
  })

  it('keeps Premium when the network fails', async () => {
    seedCache({ cachedAt: Date.now() - 2 * DAY })
    invoke.mockRejectedValue(new Error('Failed to fetch'))
    expect(await refreshLicense()).toMatchObject({ status: 'unavailable', premium: true })
    expect(getCachedLicense()).not.toBeNull()
  })

  it('keeps Premium when the server is rate limiting or erroring', async () => {
    seedCache({ cachedAt: Date.now() - 2 * DAY })
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'non-2xx', context: { status: 429, json: async () => ({ valid: false, error: 'Too many attempts. Try again later.' }) } },
    })
    expect(await refreshLicense()).toMatchObject({ status: 'unavailable', premium: true })
    expect(getCachedLicense()).not.toBeNull()
  })

  it('can revive Premium after the grace window once the server confirms the key', async () => {
    seedCache({ cachedAt: Date.now() - GRACE_MS - 3 * DAY })
    expect(getCachedLicense()).toBeNull()
    invoke.mockResolvedValue({ data: { valid: true, expires_at: iso(Date.now() + 5 * DAY), plan: 'monthly' }, error: null })

    expect(await refreshLicense()).toMatchObject({ status: 'valid', premium: true })
    expect(getCachedLicense()).not.toBeNull()
  })

  it('does not call the network while offline and keeps what it has', async () => {
    seedCache({ cachedAt: Date.now() - 2 * DAY })
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(await refreshLicense()).toMatchObject({ status: 'offline', premium: true })
    expect(invoke).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('falls back to the stored license key when the cache is gone', async () => {
    localStorage.setItem('licenseKey', 'ZZZZ-1111-2222-3333')
    invoke.mockResolvedValue({ data: { valid: true, expires_at: iso(Date.now() + DAY), plan: 'trial' }, error: null })
    expect(await refreshLicense()).toMatchObject({ status: 'valid', premium: true })
    expect(invoke).toHaveBeenCalledWith('validate-license', { body: { key: 'ZZZZ-1111-2222-3333' } })
  })
})

describe('validateLicense', () => {
  it('marks only a 200 "valid:false" answer as definitive', async () => {
    invoke.mockResolvedValue({ data: { valid: false, error: 'Invalid license key' }, error: null })
    expect(await validateLicense('x')).toMatchObject({ valid: false, definitive: true, error: 'Invalid license key' })

    invoke.mockRejectedValue(new Error('offline'))
    expect(await validateLicense('x')).toMatchObject({ valid: false, definitive: false })
  })
})

describe('retrieveLicenseByEmail', () => {
  it('reports that the key was emailed and never exposes a key', async () => {
    invoke.mockResolvedValue({ data: { sent: true }, error: null })
    const res = await retrieveLicenseByEmail('nena@example.com')
    expect(res).toEqual({ sent: true })
    expect(res.key).toBeUndefined()
  })

  it('ignores a key returned by an old, unpatched server', async () => {
    invoke.mockResolvedValue({ data: { key: 'AAAA-BBBB-CCCC-DDDD' }, error: null })
    const res = await retrieveLicenseByEmail('nena@example.com')
    expect(res.sent).toBe(false)
    expect(JSON.stringify(res)).not.toContain('AAAA-BBBB')
  })

  it('returns the server message on errors such as rate limiting', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'non-2xx', context: { status: 429, json: async () => ({ error: 'Too many attempts. Try again later.' }) } },
    })
    expect(await retrieveLicenseByEmail('nena@example.com')).toMatchObject({ sent: false, network: false, error: 'Too many attempts. Try again later.' })
  })

  it('flags network failures so the UI can show a friendly message', async () => {
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } })
    expect(await retrieveLicenseByEmail('nena@example.com')).toMatchObject({ sent: false, network: true })
    expect(await validateLicense('KEY')).toMatchObject({ valid: false, definitive: false, network: true })
  })

  it('rejects an empty email without calling the server', async () => {
    expect((await retrieveLicenseByEmail('  ')).sent).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('createCheckout', () => {
  it('sends only the email and plan (never a price) and returns the https checkout url', async () => {
    invoke.mockResolvedValue({ data: { checkout_url: 'https://checkout.paymongo.com/cs_1' }, error: null })
    expect(await createCheckout(' nena@example.com ', 'monthly')).toEqual({ url: 'https://checkout.paymongo.com/cs_1' })
    expect(invoke).toHaveBeenCalledWith('create-checkout', { body: { email: 'nena@example.com', plan: 'monthly' } })
  })

  it('refuses a non-https or missing url', async () => {
    invoke.mockResolvedValue({ data: { checkout_url: 'javascript:alert(1)' }, error: null })
    expect((await createCheckout('a@b.co', 'monthly')).url).toBeNull()
    invoke.mockResolvedValue({ data: {}, error: null })
    expect((await createCheckout('a@b.co', 'monthly')).url).toBeNull()
  })

  it('passes the server message through and flags network failures', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'non-2xx', context: { status: 409, json: async () => ({ error: 'This email already used the trial.' }) } } })
    expect(await createCheckout('a@b.co', 'trial')).toMatchObject({ url: null, error: 'This email already used the trial.', network: false })
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', message: 'x' } })
    expect(await createCheckout('a@b.co', 'monthly')).toMatchObject({ network: true })
    expect((await createCheckout('  ', 'monthly')).url).toBeNull()
  })
})
