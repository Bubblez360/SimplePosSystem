// Deploy:  supabase functions deploy create-checkout
// (JWT verification stays ON: the app calls it with its public anon key.)
// Secrets:
//   PAYMONGO_SECRET_KEY   sk_test_... while testing, sk_live_... at launch. SERVER ONLY.
//   APP_URL               optional, where buyers return to (default: the GitHub Pages site)
//   PAYMONGO_METHODS      optional, comma list (default: qrph,gcash,paymaya,card)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { createCheckoutHandler } from './handler.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(createCheckoutHandler({
  admin,
  secretKey: Deno.env.get('PAYMONGO_SECRET_KEY') ?? '',
  appUrl: Deno.env.get('APP_URL') ?? 'https://bubblez360.github.io/SimplePosSystem/',
  methods: (Deno.env.get('PAYMONGO_METHODS') ?? 'qrph,gcash,paymaya,card').split(',').map(s => s.trim()).filter(Boolean),
}))
