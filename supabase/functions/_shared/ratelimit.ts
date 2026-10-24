// Shared rate limiter backed by the `rate_limits` table (service-role only).
// Structural subset of the Supabase admin client, so tests can pass a fake.
// deno-lint-ignore no-explicit-any
export type Admin = { from(table: string): any }

export async function checkRateLimit(
  admin: Admin,
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
