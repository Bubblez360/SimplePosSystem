// Emails a license key to the address on file. Deploy with:
//   supabase functions deploy retrieve-license
// (JWT verification stays ON: the app calls it with its anon key.)
// Needs the same email secrets as paymongo-webhook (see _shared/mailer.ts).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { mailerFromEnv } from '../_shared/mailer.ts'
import { createRetrieveHandler } from './handler.ts'

const mailer = mailerFromEnv()

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(createRetrieveHandler({
  admin,
  emailConfigured: mailer.configured,
  sendEmail: ({ to, licenseKey, plan, expiresAt }) =>
    mailer.sendLicense({ to, licenseKey, plan, expiresAt, reason: 'retrieve' }),
}))
