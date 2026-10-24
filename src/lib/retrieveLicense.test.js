// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { createRetrieveHandler } from '../../supabase/functions/retrieve-license/handler.ts'

const FUTURE = new Date(Date.now() + 10 * 86400_000).toISOString()
const PAST = new Date(Date.now() - 86400_000).toISOString()

// Minimal chainable stand-in for the Supabase admin client.
function fakeAdmin({ licenses = [], rateCount = 0 } = {}) {
  return {
    from(table) {
      const filters = {}
      const b = {
        select: () => b,
        eq: (k, v) => { filters[k] = v; return b },
        gte: () => b,
        lt: () => b,
        order: () => b,
        limit: () => b,
        delete: () => b,
        insert: async () => ({ error: null }),
        maybeSingle: async () => {
          const row = licenses.find(l => Object.entries(filters).every(([k, v]) => l[k] === v))
          return { data: row ?? null, error: null }
        },
        then: res => Promise.resolve(table === 'rate_limits' ? { count: rateCount } : {}).then(res),
      }
      return b
    },
  }
}

function setup({ admin = fakeAdmin(), emailConfigured = true, sendEmail = vi.fn(async () => true) } = {}) {
  const handler = createRetrieveHandler({ admin, sendEmail, emailConfigured })
  const call = body => handler(new Request('https://example.test/retrieve', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
  return { call, sendEmail }
}

const license = (over = {}) => ({ license_key: 'AAAA-BBBB-CCCC-DDDD', email: 'nena@example.com', active: true, expires_at: FUTURE, plan: 'monthly', ...over })

describe('retrieve-license', () => {
  it('EMAILS the key and never returns it in the response', async () => {
    const { call, sendEmail } = setup({ admin: fakeAdmin({ licenses: [license()] }) })
    const res = await call({ email: ' Nena@Example.com ' })
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(JSON.parse(text)).toEqual({ sent: true })
    expect(text).not.toContain('AAAA-BBBB-CCCC-DDDD')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'nena@example.com', licenseKey: 'AAAA-BBBB-CCCC-DDDD', plan: 'monthly',
    }))
  })

  it('gives the same answer for unknown, inactive and expired emails (no account probing)', async () => {
    const admin = fakeAdmin({ licenses: [license({ email: 'old@example.com', expires_at: PAST }), license({ email: 'off@example.com', active: false })] })
    const { call, sendEmail } = setup({ admin })
    for (const email of ['nobody@example.com', 'old@example.com', 'off@example.com']) {
      const res = await call({ email })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ sent: true })
    }
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('refuses honestly when email delivery is not configured', async () => {
    const { call, sendEmail } = setup({ admin: fakeAdmin({ licenses: [license()] }), emailConfigured: false })
    const res = await call({ email: 'nena@example.com' })
    expect(res.status).toBe(503)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('surfaces a delivery failure instead of pretending it was sent', async () => {
    const { call } = setup({ admin: fakeAdmin({ licenses: [license()] }), sendEmail: vi.fn(async () => false) })
    expect((await call({ email: 'nena@example.com' })).status).toBe(502)
  })

  it('rate limits repeated requests', async () => {
    const { call, sendEmail } = setup({ admin: fakeAdmin({ licenses: [license()], rateCount: 99 }) })
    expect((await call({ email: 'nena@example.com' })).status).toBe(429)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('validates input', async () => {
    const { call } = setup()
    expect((await call('not json')).status).toBe(400)
    expect((await call({ email: '' })).status).toBe(400)
    expect((await call({ email: 'not-an-email' })).status).toBe(400)
  })
})
