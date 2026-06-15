import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const VALID_STORES = ['items', 'categories', 'sales', 'expenses']

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
  let data: Record<string, unknown[]>
  try {
    const body = await req.json()
    licenseKey = (body.licenseKey ?? '').trim()
    data = body.data ?? {}
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

  const syncedAt = new Date().toISOString()
  const results = []

  for (const storeName of VALID_STORES) {
    const records = data[storeName]
    if (!Array.isArray(records) || records.length === 0) continue

    const rows = records.map((r: unknown) => ({
      vendor_key: licenseKey,
      store_name: storeName,
      record_id: String((r as Record<string, unknown>).id ?? crypto.randomUUID()),
      data: r,
      synced_at: syncedAt,
    }))

    const { error: upsertErr } = await admin
      .from('vendor_backups')
      .upsert(rows, { onConflict: 'vendor_key,store_name,record_id' })

    if (upsertErr) results.push({ storeName, error: upsertErr.message })
    else results.push({ storeName, count: rows.length })
  }

  return json({ results, syncedAt })
})
