import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get('PAYMONGO_WEBHOOK_SECRET') ?? ''

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
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
