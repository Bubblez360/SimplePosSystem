// "I lost my license key" endpoint.
//
// SECURITY: this used to RETURN the key to whoever typed an email address, so
// anyone who knew a customer's email could take over their subscription. It now
// only EMAILS the key to the address on file, and answers identically whether
// or not a license exists, so it can't be used to probe which emails are
// customers either.

import { checkRateLimit, type Admin } from '../_shared/ratelimit.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

export interface RetrieveDeps {
  admin: Admin
  sendEmail: (o: { to: string; licenseKey: string; plan: string; expiresAt: Date }) => Promise<boolean>
  /** False when RESEND_API_KEY is missing: we refuse instead of silently dropping the email. */
  emailConfigured: boolean
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export function createRetrieveHandler({ admin, sendEmail, emailConfigured }: RetrieveDeps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

    let email: string
    try {
      const body = await req.json()
      email = String(body?.email ?? '').toLowerCase().trim()
    } catch {
      return json({ error: 'Invalid request' }, 400)
    }
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return json({ error: 'Please enter a valid email address' }, 400)
    }

    if (!emailConfigured) {
      console.error('RESEND_API_KEY is not set — cannot deliver license keys')
      return json({ error: 'Email delivery is unavailable right now. Please try again later.' }, 503)
    }

    const emailAllowed = await checkRateLimit(admin, `email:${email}`, 'retrieve', 3, 60)
    const ipAllowed = emailAllowed && await checkRateLimit(admin, `ip:${ip}`, 'retrieve', 5, 60)
    if (!emailAllowed || !ipAllowed) {
      return json({ error: 'Too many attempts. Try again later.' }, 429)
    }

    const { data } = await admin
      .from('licenses')
      .select('license_key, active, expires_at, plan')
      .eq('email', email)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const usable = data && (!data.expires_at || new Date(data.expires_at) >= new Date())
    if (usable) {
      const sent = await sendEmail({
        to: email,
        licenseKey: data.license_key,
        plan: data.plan ?? 'monthly',
        expiresAt: data.expires_at ? new Date(data.expires_at) : new Date(8640000000000000),
      })
      if (!sent) return json({ error: 'Could not send the email. Please try again later.' }, 502)
    }

    // Same answer for "sent", "no such license" and "expired".
    return json({ sent: true })
  }
}
