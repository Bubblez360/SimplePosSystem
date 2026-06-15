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

  let key: string
  try {
    const body = await req.json()
    key = (body.key ?? '').trim()
  } catch {
    return json({ valid: false, error: 'Invalid request' }, 400)
  }

  if (!key) return json({ valid: false, error: 'No key' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const allowed = await checkRateLimit(admin, ip, 'validate', 10, 10)
  if (!allowed) return json({ valid: false, error: 'Too many attempts. Try again later.' }, 429)

  const { data, error } = await admin
    .from('licenses')
    .select('active, expires_at')
    .eq('license_key', key)
    .single()

  if (error || !data) return json({ valid: false, error: 'Invalid license key' })
  if (!data.active) return json({ valid: false, error: 'License deactivated' })
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return json({ valid: false, error: 'License expired' })
  }

  return json({ valid: true, expires_at: data.expires_at })
})
