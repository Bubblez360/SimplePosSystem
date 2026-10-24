import { createClient } from '@supabase/supabase-js'

// Project URL and PUBLIC anon key (Supabase dashboard > Project Settings > API).
// The anon key is meant to ship in the browser; what protects the data is RLS
// (see supabase/migrations) plus the Edge Functions. NEVER put the service_role
// key here. Override per environment with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xukccpfuydiwhnvyildw.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Without a key there is no client: license checks and cloud sync report
// "not configured" instead of failing against a dead project. The POS itself
// is offline-first and keeps working.
export const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
