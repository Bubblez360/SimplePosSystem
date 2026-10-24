// Starts a PayMongo hosted checkout for a TindaPOS plan.
//
// Why this exists: the old plain payment links never told us WHO paid (QR Ph
// payments carry no email), so the webhook could not issue a license. Here the
// app asks for the buyer's email first and attaches it to the checkout, so the
// resulting payment event identifies the buyer.
//
// The price comes from this file, never from the client, and the PayMongo
// secret key stays on the server.
import { checkRateLimit, type Admin } from '../_shared/ratelimit.ts'
import { PLAN_PRICES, type Plan } from '../_shared/paymongo.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const API = 'https://api.paymongo.com/v1/checkout_sessions'

const PLAN_LABELS: Record<Plan, string> = {
  trial: 'TindaPOS Premium - 7-day trial',
  monthly: 'TindaPOS Premium - 1 month',
  annual: 'TindaPOS Premium - 1 year',
}

export interface CheckoutDeps {
  admin: Admin
  secretKey: string
  /** Where PayMongo sends the buyer back to (must end with "/"). */
  appUrl: string
  /** Payment methods to offer, in order. If PayMongo rejects the list we retry with QR Ph only. */
  methods: string[]
  fetchFn?: typeof fetch
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export function createCheckoutHandler({ admin, secretKey, appUrl, methods, fetchFn = fetch }: CheckoutDeps) {
  const base = appUrl.endsWith('/') ? appUrl : `${appUrl}/`

  async function createSession(email: string, plan: Plan, methodList: string[]) {
    const reference = `TP-${plan}-${Date.now().toString(36)}`
    return fetchFn(API, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${secretKey}:`)}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: { email, name: email.split('@')[0] },
            line_items: [{ currency: 'PHP', amount: PLAN_PRICES[plan], name: PLAN_LABELS[plan], quantity: 1 }],
            payment_method_types: methodList,
            description: PLAN_LABELS[plan],
            reference_number: reference,
            send_email_receipt: false,
            success_url: `${base}?checkout=success`,
            cancel_url: `${base}?checkout=cancel`,
            metadata: { app: 'tindapos', email, plan },
          },
        },
      }),
    })
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    let email: string
    let plan: string
    try {
      const body = await req.json()
      email = String(body?.email ?? '').toLowerCase().trim()
      plan = String(body?.plan ?? '')
    } catch {
      return json({ error: 'Invalid request' }, 400)
    }
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return json({ error: 'Please enter a valid email address' }, 400)
    }
    if (!Object.hasOwn(PLAN_PRICES, plan)) return json({ error: 'Unknown plan' }, 400)
    const chosen = plan as Plan

    if (!secretKey) {
      console.error('PAYMONGO_SECRET_KEY is not set — cannot create checkouts')
      return json({ error: 'Payments are not available right now. Please try again later.' }, 503)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const emailOk = await checkRateLimit(admin, `email:${email}`, 'checkout', 5, 60)
    const ipOk = emailOk && await checkRateLimit(admin, `ip:${ip}`, 'checkout', 10, 60)
    if (!emailOk || !ipOk) return json({ error: 'Too many attempts. Try again later.' }, 429)

    if (chosen === 'trial') {
      const { data } = await admin.from('licenses').select('id').eq('email', email).eq('plan', 'trial').limit(1).maybeSingle()
      if (data) return json({ error: 'This email already used the trial. Please pick a monthly or annual plan.' }, 409)
    }

    let res = await createSession(email, chosen, methods)
    if (res.status === 400 && methods.length > 1) {
      console.error('PayMongo rejected the payment methods; retrying with QR Ph only')
      res = await createSession(email, chosen, ['qrph'])
    }
    if (!res.ok) {
      console.error('PayMongo checkout error:', res.status, (await res.text()).slice(0, 300))
      return json({ error: 'Could not start the payment. Please try again.' }, 502)
    }

    const url = (await res.json())?.data?.attributes?.checkout_url
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      console.error('PayMongo returned no usable checkout_url')
      return json({ error: 'Could not start the payment. Please try again.' }, 502)
    }
    return json({ checkout_url: url })
  }
}
