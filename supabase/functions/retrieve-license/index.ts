import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  identifier: string,
  action: string,
  maxCount: number,
  windowMinutes: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count } = await admin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('created_at', windowStart)
  if ((count ?? 0) >= maxCount) return false
  await admin.from('rate_limits').insert({ identifier, action })
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 86400_000).toISOString()
    await admin.from('rate_limits').delete().lt('created_at', cutoff)
  }
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  let email: string
  try {
    const body = await req.json()
    email = (body.email ?? '').toLowerCase().trim()
  } catch {
    return json({ key: null, error: 'Invalid request' }, 400)
  }

  if (!email) return json({ key: null, error: 'No email' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const emailAllowed = await checkRateLimit(admin, `email:${email}`, 'retrieve', 3, 60)
  if (!emailAllowed) return json({ key: null, error: 'Too many attempts. Try again later.' }, 429)

  const ipAllowed = await checkRateLimit(admin, `ip:${ip}`, 'retrieve', 5, 60)
  if (!ipAllowed) return json({ key: null, error: 'Too many attempts. Try again later.' }, 429)

  const { data, error } = await admin
    .from('licenses')
    .select('license_key, active, expires_at')
    .eq('email', email)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return json({ key: null, error: 'No license found for that email' })
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return json({ key: null, error: 'License expired' })
  }

  return json({ key: data.license_key })
})
