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

async function validateKey(
  admin: ReturnType<typeof createClient>,
  licenseKey: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('licenses')
    .select('active, expires_at')
    .eq('license_key', licenseKey)
    .single()
  if (error || !data || !data.active) return 'Invalid license key'
  if (data.expires_at && new Date(data.expires_at) < new Date()) return 'License expired'
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  let licenseKey: string
  try {
    const body = await req.json()
    licenseKey = (body.licenseKey ?? '').trim()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }

  if (!licenseKey) return json({ error: 'No license key' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const keyError = await validateKey(admin, licenseKey)
  if (keyError) return json({ error: keyError }, 401)

  const { data, error } = await admin
    .from('vendor_backups')
    .select('store_name, record_id, data, synced_at')
    .eq('vendor_key', licenseKey)
    .order('synced_at', { ascending: false })

  if (error) return json({ error: error.message }, 500)

  const grouped: Record<string, unknown[]> = {}
  let lastSyncAt: string | null = null

  for (const row of (data ?? [])) {
    if (!grouped[row.store_name]) grouped[row.store_name] = []
    grouped[row.store_name].push(row.data)
    if (!lastSyncAt) lastSyncAt = row.synced_at
  }

  return json({ data: grouped, lastSyncAt, restored: data?.length ?? 0 })
})
