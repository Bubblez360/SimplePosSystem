// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { extractPaid, PLAN_PRICES } from '../../supabase/functions/_shared/paymongo.ts'
import { createCheckoutHandler } from '../../supabase/functions/create-checkout/handler.ts'

describe('extractPaid (webhook payloads)', () => {
  it('reads a payment.paid event', () => {
    const attrs = { type: 'payment.paid', data: { id: 'pay_1', attributes: { amount: 9900, billing: { email: ' Nena@Example.com ' } } } }
    expect(extractPaid(attrs)).toEqual({ paymentId: 'pay_1', email: 'nena@example.com', amount: 9900 })
  })

  it('reads a checkout_session.payment.paid event: email from the session billing, payment from payments[0]', () => {
    const attrs = {
      type: 'checkout_session.payment.paid',
      data: { id: 'cs_1', attributes: { billing: { email: 'Nena@Example.com' }, payments: [{ id: 'pay_9', attributes: { amount: 49900, billing: null } }], line_items: [] } },
    }
    expect(extractPaid(attrs)).toEqual({ paymentId: 'pay_9', email: 'nena@example.com', amount: 49900 })
  })

  it('falls back to the payment billing, then metadata, for the email', () => {
    const viaPayment = { type: 'checkout_session.payment.paid', data: { attributes: { billing: null, payments: [{ id: 'pay_2', attributes: { amount: 9900, billing: { email: 'a@b.co' } } }] } } }
    expect(extractPaid(viaPayment).email).toBe('a@b.co')
    const viaMeta = { type: 'payment.paid', data: { id: 'pay_3', attributes: { amount: 9900, billing: null, metadata: { email: 'M@B.co' } } } }
    expect(extractPaid(viaMeta).email).toBe('m@b.co')
  })

  it('sums line items when the payment has no amount', () => {
    const attrs = { type: 'checkout_session.payment.paid', data: { attributes: { billing: { email: 'a@b.co' }, payments: [{ id: 'pay_4', attributes: {} }], line_items: [{ amount: 9900, quantity: 2 }] } } }
    expect(extractPaid(attrs).amount).toBe(19800)
  })

  it('returns null for other event types', () => {
    expect(extractPaid({ type: 'payment.failed', data: {} })).toBeNull()
    expect(extractPaid(undefined)).toBeNull()
  })

  it('returns empty ids/emails instead of throwing on malformed payloads', () => {
    expect(extractPaid({ type: 'payment.paid', data: {} })).toMatchObject({ paymentId: '', email: '' })
  })
})

function fakeAdmin({ rateCount = 0, trialUsed = false } = {}) {
  return {
    from(table) {
      const b = {
        select: () => b, eq: () => b, gte: () => b, lt: () => b, limit: () => b, delete: () => b,
        insert: async () => ({ error: null }),
        maybeSingle: async () => ({ data: trialUsed ? { id: 1 } : null }),
        then: res => Promise.resolve(table === 'rate_limits' ? { count: rateCount } : {}).then(res),
      }
      return b
    },
  }
}

function paymongoOk(url = 'https://checkout.paymongo.com/cs_test_abc') {
  return vi.fn(async () => Response.json({ data: { id: 'cs_1', attributes: { checkout_url: url } } }))
}

function setup({ admin = fakeAdmin(), secretKey = 'sk_test_SECRET', fetchFn = paymongoOk(), methods = ['qrph', 'gcash'] } = {}) {
  const handler = createCheckoutHandler({ admin, secretKey, appUrl: 'https://app.example/', fetchFn, methods })
  const call = body => handler(new Request('https://x.test/create-checkout', {
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' }, body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
  return { call, fetchFn }
}

describe('create-checkout', () => {
  it('creates a PayMongo checkout with the buyer email, server-side price and return URLs', async () => {
    const { call, fetchFn } = setup()
    const res = await call({ email: ' Nena@Example.com ', plan: 'monthly' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ checkout_url: 'https://checkout.paymongo.com/cs_test_abc' })

    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://api.paymongo.com/v1/checkout_sessions')
    expect(init.headers.Authorization).toBe(`Basic ${btoa('sk_test_SECRET:')}`)
    const a = JSON.parse(init.body).data.attributes
    expect(a.billing.email).toBe('nena@example.com')
    expect(a.line_items[0]).toMatchObject({ currency: 'PHP', amount: PLAN_PRICES.monthly, quantity: 1 })
    expect(a.payment_method_types).toEqual(['qrph', 'gcash'])
    expect(a.success_url).toBe('https://app.example/?checkout=success')
    expect(a.cancel_url).toBe('https://app.example/?checkout=cancel')
    expect(a.metadata).toMatchObject({ email: 'nena@example.com', plan: 'monthly' })
  })

  it('ignores any price sent by the client and never leaks the secret key', async () => {
    const { call, fetchFn } = setup()
    const res = await call({ email: 'a@b.co', plan: 'annual', amount: 1, price: 1 })
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).data.attributes.line_items[0].amount).toBe(49900)
    expect(await res.text()).not.toContain('sk_test')
  })

  it('validates input', async () => {
    const { call, fetchFn } = setup()
    expect((await call('not json')).status).toBe(400)
    expect((await call({ email: 'nope', plan: 'monthly' })).status).toBe(400)
    expect((await call({ email: 'a@b.co', plan: 'platinum' })).status).toBe(400)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('refuses honestly when no PayMongo key is configured', async () => {
    const { call, fetchFn } = setup({ secretKey: '' })
    expect((await call({ email: 'a@b.co', plan: 'monthly' })).status).toBe(503)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rate limits, and allows the trial only once per email', async () => {
    expect((await setup({ admin: fakeAdmin({ rateCount: 99 }) }).call({ email: 'a@b.co', plan: 'monthly' })).status).toBe(429)
    const used = setup({ admin: fakeAdmin({ trialUsed: true }) })
    expect((await used.call({ email: 'a@b.co', plan: 'trial' })).status).toBe(409)
    expect(used.fetchFn).not.toHaveBeenCalled()
    expect((await used.call({ email: 'a@b.co', plan: 'monthly' })).status).toBe(200)
  })

  it('retries with QR Ph only when the account rejects a payment method, then gives up cleanly', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('{"errors":[{"detail":"payment_method_types invalid"}]}', { status: 400 }))
      .mockResolvedValueOnce(Response.json({ data: { attributes: { checkout_url: 'https://checkout.paymongo.com/cs_2' } } }))
    const ok = await setup({ fetchFn }).call({ email: 'a@b.co', plan: 'monthly' })
    expect(ok.status).toBe(200)
    expect(JSON.parse(fetchFn.mock.calls[1][1].body).data.attributes.payment_method_types).toEqual(['qrph'])

    const dead = setup({ fetchFn: vi.fn(async () => new Response('{"errors":[{"detail":"boom"}]}', { status: 500 })) })
    const res = await dead.call({ email: 'a@b.co', plan: 'monthly' })
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('boom')
  })

  it('rejects a checkout URL that is not https', async () => {
    const res = await setup({ fetchFn: paymongoOk('javascript:alert(1)') }).call({ email: 'a@b.co', plan: 'monthly' })
    expect(res.status).toBe(502)
  })
})
