import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get('PAYMONGO_WEBHOOK_SECRET') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'TindaPOS <noreply@resend.dev>'

const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateLicenseKey(): string {
  return [0, 1, 2, 3].map(() =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => KEY_CHARS[b % KEY_CHARS.length])
      .join('')
  ).join('-')
}

async function verifySignature(secret: string, body: string, sigHeader: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => {
    const idx = p.indexOf('=')
    return [p.slice(0, idx), p.slice(idx + 1)]
  }))
  const timestamp = parts['t']
  const signature = parts['li'] ?? parts['te']
  if (!timestamp || !signature) return false

  const payload = `${timestamp}.${body}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === signature
}

async function sendLicenseEmail(
  email: string,
  licenseKey: string,
  plan: string,
  expiresAt: Date,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping email')
    return
  }

  const planLabel = plan === 'annual' ? 'Annual (1 taon)' : plan === 'monthly' ? 'Monthly (30 araw)' : 'Trial (7 araw)'
  const expiryStr = expiresAt.toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1c1917;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #F59E0B; margin: 0; font-size: 28px;">TindaPOS</h1>
    <p style="color: #78716c; margin: 4px 0 0;">License Key</p>
  </div>

  <p>Salamat sa iyong subscription! Nandito na ang iyong license key:</p>

  <div style="background: #fafaf7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
    <p style="margin: 0 0 8px; font-size: 12px; color: #78716c; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
    <p style="margin: 0; font-family: monospace; font-size: 22px; font-weight: bold; color: #1c1917; letter-spacing: 2px;">${licenseKey}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Plan</td>
      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${planLabel}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #78716c; font-size: 14px;">Valid hanggang</td>
      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${expiryStr}</td>
    </tr>
  </table>

  <h3 style="color: #1c1917; margin: 24px 0 12px;">Paano i-activate:</h3>
  <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #44403c;">
    <li>Buksan ang TindaPOS app</li>
    <li>Pumunta sa <strong>Settings</strong></li>
    <li>I-tap ang <strong>"I-activate ang Premium"</strong></li>
    <li>I-paste ang license key sa itaas</li>
    <li>I-tap ang <strong>Activate</strong></li>
  </ol>

  <p style="margin-top: 24px; font-size: 13px; color: #78716c;">
    Nawala ang key? I-type ang email mo sa Settings → "Retrieve License Key" para makuha ulit.
  </p>

  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">
  <p style="font-size: 12px; color: #a8a29e; text-align: center; margin: 0;">
    TindaPOS — Para sa mga tindero at negosyante
  </p>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: `Ang iyong TindaPOS License Key — ${planLabel}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  } else {
    console.log(`Email sent to ${email}`)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()

  if (PAYMONGO_WEBHOOK_SECRET) {
    const sigHeader = req.headers.get('paymongo-signature') ?? ''
    const valid = await verifySignature(PAYMONGO_WEBHOOK_SECRET, body, sigHeader)
    if (!valid) return new Response('Invalid signature', { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const attrs = (event.data as Record<string, unknown>)?.attributes as Record<string, unknown>
  if (attrs?.type !== 'payment.paid') {
    return new Response('OK', { status: 200 })
  }

  const payment = attrs.data as Record<string, unknown>
  const paymentId = payment?.id as string
  const paymentAttrs = payment?.attributes as Record<string, unknown>
  const billing = paymentAttrs?.billing as Record<string, unknown>
  const email = (billing?.email as string | undefined)?.toLowerCase().trim()
  const amount = paymentAttrs?.amount as number

  if (!paymentId || !email) {
    return new Response('Missing billing email', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Dedup — idempotent on re-delivery
  const { data: existing } = await supabase
    .from('licenses')
    .select('license_key')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ ok: true, existing: true }), { status: 200 })
  }

  // ₱49 trial=4900, ₱99 monthly=9900, ₱499 annual=49900 (centavos)
  let plan: string
  let days: number
  if (amount >= 49900) {
    plan = 'annual'; days = 365
  } else if (amount >= 9900) {
    plan = 'monthly'; days = 30
  } else {
    plan = 'trial'; days = 7
  }
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)

  const licenseKey = generateLicenseKey()

  const { error } = await supabase.from('licenses').insert({
    license_key: licenseKey,
    active: true,
    expires_at: expiresAt.toISOString(),
    email,
    payment_id: paymentId,
    plan,
  })

  if (error) {
    console.error('DB insert error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  console.log(`License ${licenseKey} issued to ${email} (${plan}, ${days}d)`)

  await sendLicenseEmail(email, licenseKey, plan, expiresAt)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
