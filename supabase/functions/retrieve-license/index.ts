// Emails a license key to the address on file. Deploy with:
//   supabase functions deploy retrieve-license
// (JWT verification stays ON: the app calls it with its anon key.)
// Needs the same RESEND_API_KEY / FROM_EMAIL secrets as paymongo-webhook.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { sendLicenseEmail } from '../_shared/email.ts'
import { createRetrieveHandler } from './handler.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'TindaPOS <noreply@resend.dev>'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(createRetrieveHandler({
  admin,
  emailConfigured: !!RESEND_API_KEY,
  sendEmail: ({ to, licenseKey, plan, expiresAt }) =>
    sendLicenseEmail({ apiKey: RESEND_API_KEY, from: FROM_EMAIL, to, licenseKey, plan, expiresAt, reason: 'retrieve' }),
}))
