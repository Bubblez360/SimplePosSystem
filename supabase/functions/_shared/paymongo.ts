// Pure helpers for the PayMongo webhook. Web-standard APIs only (WebCrypto), so
// the same code runs in Deno (Supabase Edge) and in Node (vitest).

const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type Plan = 'trial' | 'monthly' | 'annual'

// Price points in centavos: ₱49 trial, ₱99 monthly, ₱499 annual.
// Anything below the cheapest plan is not a subscription payment.
export function planForAmount(amount: unknown): { plan: Plan; days: number } | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null
  if (amount >= 49900) return { plan: 'annual', days: 365 }
  if (amount >= 9900) return { plan: 'monthly', days: 30 }
  if (amount >= 4900) return { plan: 'trial', days: 7 }
  return null
}

export function generateLicenseKey(): string {
  return [0, 1, 2, 3].map(() =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => KEY_CHARS[b % KEY_CHARS.length])
      .join('')
  ).join('-')
}

// Constant-time string comparison: no early exit on the first differing
// character, and length differences are folded into the result.
export function timingSafeEqualHex(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function parseSignatureHeader(header: string): Record<string, string> {
  const parts: Record<string, string> = {}
  for (const piece of header.split(',')) {
    const idx = piece.indexOf('=')
    if (idx > 0) parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim()
  }
  return parts
}

// PayMongo-Signature looks like `t=<unix>,te=<test sig>,li=<live sig>` and
// fills exactly ONE of te/li, leaving the other as an empty string. Compare
// against every non-empty candidate (so test-mode webhooks verify too) and
// never accept an empty signature.
export async function verifyPaymongoSignature(
  secret: string,
  body: string,
  header: string,
): Promise<boolean> {
  if (!secret || !header) return false
  const parts = parseSignatureHeader(header)
  const timestamp = parts['t']
  const candidates = [parts['li'], parts['te']].filter((s): s is string => !!s)
  if (!timestamp || candidates.length === 0) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${body}`))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  // Evaluate every candidate (no short-circuit) before deciding.
  return candidates.map(c => timingSafeEqualHex(c, computed)).some(Boolean)
}
