// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, it, expect, vi } from 'vitest'
import {
  verifyPaymongoSignature, timingSafeEqualHex, planForAmount,
} from '../../supabase/functions/_shared/paymongo.ts'
import { createWebhookHandler } from '../../supabase/functions/paymongo-webhook/handler.ts'

const SECRET = 'whsk_test_secret'
const T = '1760000000'

const sign = (body, secret = SECRET, t = T) =>
  createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')

// PayMongo fills ONE of te/li and leaves the other empty.
const liveHeader = body => `t=${T},te=,li=${sign(body)}`
const testHeader = body => `t=${T},te=${sign(body)},li=`

const event = (over = {}) => JSON.stringify({
  data: {
    attributes: {
      type: 'payment.paid',
      livemode: true,
      data: {
        id: 'pay_123',
        attributes: { amount: 9900, billing: { email: 'Aling.Nena@Example.com ' } },
      },
      ...over,
    },
  },
})

describe('timingSafeEqualHex', () => {
  it('matches equal strings and rejects different ones, including different lengths', () => {
    expect(timingSafeEqualHex('abc123', 'abc123')).toBe(true)
    expect(timingSafeEqualHex('abc123', 'abc124')).toBe(false)
    expect(timingSafeEqualHex('abc', 'abc123')).toBe(false)
    expect(timingSafeEqualHex('', '')).toBe(true)
  })
})

describe('verifyPaymongoSignature', () => {
  const body = event()

  it('accepts a live-mode signature (li) when te is empty', async () => {
    expect(await verifyPaymongoSignature(SECRET, body, liveHeader(body))).toBe(true)
  })

  it('accepts a test-mode signature (te) when li is empty', async () => {
    expect(await verifyPaymongoSignature(SECRET, body, testHeader(body))).toBe(true)
  })

  it('rejects a wrong secret, tampered body, missing header and empty signatures', async () => {
    expect(await verifyPaymongoSignature('other', body, liveHeader(body))).toBe(false)
    expect(await verifyPaymongoSignature(SECRET, body + ' ', liveHeader(body))).toBe(false)
    expect(await verifyPaymongoSignature(SECRET, body, '')).toBe(false)
    expect(await verifyPaymongoSignature(SECRET, body, `t=${T},te=,li=`)).toBe(false)
    expect(await verifyPaymongoSignature(SECRET, body, `te=${sign(body)}`)).toBe(false)
  })

  it('never accepts anything when the secret is empty', async () => {
    const forged = createHmac('sha256', '').update(`${T}.${body}`).digest('hex')
    expect(await verifyPaymongoSignature('', body, `t=${T},te=,li=${forged}`)).toBe(false)
  })
})

describe('planForAmount', () => {
  it('maps the three price points (centavos) and refuses anything below the trial', () => {
    expect(planForAmount(4900)).toEqual({ plan: 'trial', days: 7 })
    expect(planForAmount(9900)).toEqual({ plan: 'monthly', days: 30 })
    expect(planForAmount(49900)).toEqual({ plan: 'annual', days: 365 })
    expect(planForAmount(120000)).toEqual({ plan: 'annual', days: 365 })
    expect(planForAmount(4899)).toBeNull()
    expect(planForAmount(0)).toBeNull()
    expect(planForAmount(undefined)).toBeNull()
    expect(planForAmount(Number.NaN)).toBeNull()
  })
})

function fakeSupabase({ existing = null, insertError = null } = {}) {
  const inserted = []
  return {
    inserted,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }),
      insert: async row => {
        if (insertError) return { error: insertError }
        inserted.push(row)
        return { error: null }
      },
    }),
  }
}

function setup({ secret = SECRET, supabase = fakeSupabase(), sendEmail = vi.fn(async () => true) } = {}) {
  const handler = createWebhookHandler({ secret, supabase, sendEmail, now: () => new Date('2026-10-24T00:00:00Z') })
  const post = (body, headers = {}) =>
    handler(new Request('https://example.test/hook', { method: 'POST', body, headers }))
  return { handler, post, supabase, sendEmail }
}

describe('paymongo webhook handler', () => {
  it('FAILS CLOSED when no webhook secret is configured', async () => {
    const body = event()
    const { post, supabase, sendEmail } = setup({ secret: '' })
    // even a "validly signed" (with an empty key) or completely unsigned request must not mint a license
    const forged = createHmac('sha256', '').update(`${T}.${body}`).digest('hex')
    for (const headers of [{}, { 'paymongo-signature': `t=${T},te=,li=${forged}` }]) {
      const res = await post(body, headers)
      expect(res.status).toBe(500)
    }
    expect(supabase.inserted).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects an unsigned or badly signed request', async () => {
    const body = event()
    const { post, supabase } = setup()
    expect((await post(body)).status).toBe(401)
    expect((await post(body, { 'paymongo-signature': `t=${T},te=,li=deadbeef` })).status).toBe(401)
    expect(supabase.inserted).toHaveLength(0)
  })

  it('issues a license for a validly signed live payment and emails it', async () => {
    const body = event()
    const { post, supabase, sendEmail } = setup()
    const res = await post(body, { 'paymongo-signature': liveHeader(body) })
    expect(res.status).toBe(200)
    expect(supabase.inserted).toHaveLength(1)
    const row = supabase.inserted[0]
    expect(row).toMatchObject({ active: true, email: 'aling.nena@example.com', payment_id: 'pay_123', plan: 'monthly' })
    expect(row.license_key).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/)
    expect(row.expires_at).toBe('2026-11-23T00:00:00.000Z')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'aling.nena@example.com', licenseKey: row.license_key, plan: 'monthly' }))
  })

  it('also accepts a test-mode signature (te)', async () => {
    const body = event({ livemode: false })
    const { post, supabase } = setup()
    const res = await post(body, { 'paymongo-signature': testHeader(body) })
    expect(res.status).toBe(200)
    expect(supabase.inserted).toHaveLength(1)
  })

  it('is idempotent on re-delivery of the same payment', async () => {
    const body = event()
    const { post, supabase, sendEmail } = setup({ supabase: fakeSupabase({ existing: { license_key: 'AAAA-BBBB-CCCC-DDDD' } }) })
    const res = await post(body, { 'paymongo-signature': liveHeader(body) })
    expect(res.status).toBe(200)
    expect(supabase.inserted).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('ignores other event types and amounts below the cheapest plan', async () => {
    const other = event({ type: 'payment.failed' })
    const tiny = JSON.stringify(JSON.parse(event()))
      .replace('"amount":9900', '"amount":1000')
    const { post, supabase } = setup()
    expect((await post(other, { 'paymongo-signature': liveHeader(other) })).status).toBe(200)
    expect((await post(tiny, { 'paymongo-signature': liveHeader(tiny) })).status).toBe(200)
    expect(supabase.inserted).toHaveLength(0)
  })

  it('answers 400 when the payer email is missing and 500 on a database error', async () => {
    const noEmail = event({ data: { id: 'pay_9', attributes: { amount: 9900, billing: {} } } })
    expect((await setup().post(noEmail, { 'paymongo-signature': liveHeader(noEmail) })).status).toBe(400)

    const body = event()
    const failing = setup({ supabase: fakeSupabase({ insertError: { message: 'boom' } }) })
    expect((await failing.post(body, { 'paymongo-signature': liveHeader(body) })).status).toBe(500)
  })

  it('rejects non-POST methods', async () => {
    const { handler } = setup()
    expect((await handler(new Request('https://example.test/hook', { method: 'GET' }))).status).toBe(405)
  })
})
