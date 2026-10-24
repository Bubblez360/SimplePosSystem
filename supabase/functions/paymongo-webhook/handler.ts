import { extractPaid, generateLicenseKey, planForAmount, verifyPaymongoSignature } from '../_shared/paymongo.ts'

// Structural subset of the Supabase client this handler needs, so tests can
// pass a tiny fake.
export interface LicenseStore {
  from(table: string): {
    select(cols: string): { eq(col: string, val: string): { maybeSingle(): Promise<{ data: unknown }> } }
    insert(row: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>
  }
}

export interface WebhookDeps {
  /** PayMongo webhook signing secret. EMPTY MEANS THE ENDPOINT REFUSES EVERYTHING. */
  secret: string
  supabase: LicenseStore
  sendEmail: (o: { to: string; licenseKey: string; plan: string; expiresAt: Date }) => Promise<boolean>
  now?: () => Date
}

const text = (body: string, status: number) => new Response(body, { status })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export function createWebhookHandler({ secret, supabase, sendEmail, now = () => new Date() }: WebhookDeps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method !== 'POST') return text('Method not allowed', 405)

    // Fail CLOSED. Without a secret anyone could POST a fake "payment.paid"
    // and mint a free license, so refuse before reading the body.
    if (!secret) {
      console.error('PAYMONGO_WEBHOOK_SECRET is not set — refusing all webhook requests')
      return json({ error: 'Webhook not configured' }, 500)
    }

    const body = await req.text()
    const valid = await verifyPaymongoSignature(secret, body, req.headers.get('paymongo-signature') ?? '')
    if (!valid) return text('Invalid signature', 401)

    let event: Record<string, any>
    try {
      event = JSON.parse(body)
    } catch {
      return text('Invalid JSON', 400)
    }

    // payment.paid (a payment) and checkout_session.payment.paid (an in-app
    // checkout) both mean "money arrived"; anything else is acknowledged and ignored.
    const paid = extractPaid(event?.data?.attributes)
    if (!paid) return text('OK', 200)
    const { paymentId, email, amount } = paid

    if (!paymentId || !email) return text('Missing billing email', 400)

    const planInfo = planForAmount(amount)
    if (!planInfo) {
      console.log(`Ignoring payment ${paymentId}: amount ${amount} is below the cheapest plan`)
      return json({ ok: true, ignored: 'amount below minimum plan' })
    }

    // Idempotent on re-delivery.
    const { data: existing } = await supabase
      .from('licenses').select('license_key').eq('payment_id', paymentId).maybeSingle()
    if (existing) return json({ ok: true, existing: true })

    const expiresAt = new Date(now().getTime() + planInfo.days * 86400_000)
    const licenseKey = generateLicenseKey()

    const { error } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      active: true,
      expires_at: expiresAt.toISOString(),
      email,
      payment_id: paymentId,
      plan: planInfo.plan,
    })
    if (error) {
      console.error('DB insert error:', error.message)
      return text('DB error', 500)
    }

    console.log(`License ${licenseKey} issued to ${email} (${planInfo.plan}, ${planInfo.days}d)`)

    // The license exists either way; if the email fails the customer can use
    // "send my key again" in the app.
    const sent = await sendEmail({ to: email, licenseKey, plan: planInfo.plan, expiresAt })
    if (!sent) console.error(`License email to ${email} failed`)

    return json({ ok: true })
  }
}
