// PayMongo -> TindaPOS license issuer.
//
// Deploy (PayMongo does not send a Supabase JWT, so JWT verification MUST be off):
//   supabase functions deploy paymongo-webhook --no-verify-jwt
// Required secrets (the function refuses every request if the first is missing):
//   supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_...   # from PayMongo > Developers > Webhooks
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set FROM_EMAIL="TindaPOS <noreply@your-verified-domain>"
// Resend only delivers to arbitrary customers from a VERIFIED domain; the
// default resend.dev sender can only email your own account address.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendLicenseEmail } from '../_shared/email.ts'
import { createWebhookHandler } from './handler.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'TindaPOS <noreply@resend.dev>'

Deno.serve(createWebhookHandler({
  secret: Deno.env.get('PAYMONGO_WEBHOOK_SECRET') ?? '',
  supabase: supabase as never,
  sendEmail: ({ to, licenseKey, plan, expiresAt }) =>
    sendLicenseEmail({ apiKey: RESEND_API_KEY, from: FROM_EMAIL, to, licenseKey, plan, expiresAt, reason: 'purchase' }),
}))
