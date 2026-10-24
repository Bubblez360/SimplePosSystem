// PayMongo -> TindaPOS license issuer.
//
// Deploy (PayMongo does not send a Supabase JWT, so JWT verification MUST be off):
//   supabase functions deploy paymongo-webhook --no-verify-jwt
// Required secrets (the function refuses every request if the first is missing):
//   supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_...   # from PayMongo > Developers > Webhooks
// Email (one of; Gmail wins if both are set, see _shared/mailer.ts):
//   supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
//   supabase secrets set RESEND_API_KEY=re_... FROM_EMAIL="TindaPOS <noreply@your-verified-domain>"
// Resend only delivers to arbitrary customers from a VERIFIED domain; the
// default resend.dev sender can only email your own account address.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mailerFromEnv } from '../_shared/mailer.ts'
import { createWebhookHandler } from './handler.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const mailer = mailerFromEnv()

Deno.serve(createWebhookHandler({
  secret: Deno.env.get('PAYMONGO_WEBHOOK_SECRET') ?? '',
  supabase: supabase as never,
  sendEmail: ({ to, licenseKey, plan, expiresAt }) =>
    mailer.sendLicense({ to, licenseKey, plan, expiresAt, reason: 'purchase' }),
}))
