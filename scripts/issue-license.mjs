// Manually issue (or renew) a TindaPOS license and email it. Fallback for when
// the PayMongo webhook isn't running: check the payment in the PayMongo
// dashboard, then run this.
//
//   node scripts/issue-license.mjs --email nena@example.com --plan monthly
//   node scripts/issue-license.mjs --email nena@example.com --plan annual --dry-run
//
// Options
//   --email <addr>     customer email (required)
//   --plan <name>      trial (7d) | monthly (30d) | annual (365d)   (required)
//   --days <n>         override the plan's length
//   --new              always create a new key (default: if this email already
//                      has an active license, EXTEND it and re-send the same key)
//   --no-email         create/extend only, don't send the email
//   --dry-run          show what would happen, change nothing
//
// Secrets are read from the environment (or a gitignored .env.local in the repo
// root), never from arguments, so they stay out of shell history:
//   SUPABASE_SERVICE_ROLE_KEY  (if unset, fetched via the logged-in Supabase CLI)
//   RESEND_API_KEY, FROM_EMAIL (only needed when sending email)
//   SUPABASE_URL               (default: the TindaPOS project)
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_REF = 'xukccpfuydiwhnvyildw'
export const PLAN_DAYS = { trial: 7, monthly: 30, annual: 365 }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Pure core: all I/O is injected, so it is unit-tested without a network.
export async function issueLicense({ email, plan, days, forceNew = false, sendMail = true, dryRun = false }, deps) {
  const mail = String(email ?? '').toLowerCase().trim()
  if (!EMAIL_PATTERN.test(mail)) throw new Error(`Not a valid email: "${email}"`)
  if (!(plan in PLAN_DAYS)) throw new Error(`Unknown plan "${plan}". Use: ${Object.keys(PLAN_DAYS).join(', ')}`)
  const length = days ?? PLAN_DAYS[plan]
  if (!Number.isFinite(length) || length <= 0) throw new Error('--days must be a positive number')

  const now = deps.now()
  const existing = forceNew ? null : await deps.findActive(mail)
  const live = existing && (!existing.expires_at || new Date(existing.expires_at) > now)

  // Renewal: extend from the later of today and the current expiry.
  const base = live && existing.expires_at ? new Date(existing.expires_at) : now
  const expiresAt = new Date(Math.max(base.getTime(), now.getTime()) + length * 86400_000)

  const action = existing ? 'extend' : 'create'
  const licenseKey = existing ? existing.license_key : deps.makeKey()
  const result = { action, email: mail, plan, licenseKey, expiresAt, emailed: false, dryRun }
  if (dryRun) return result

  if (existing) await deps.extend(existing.license_key, expiresAt, plan)
  else await deps.insert({
    license_key: licenseKey, active: true, expires_at: expiresAt.toISOString(),
    email: mail, payment_id: `manual-${now.getTime()}`, plan,
  })

  if (sendMail) result.emailed = await deps.sendEmail({ to: mail, licenseKey, plan, expiresAt })
  return result
}

// ───────────────────────── CLI plumbing ─────────────────────────

function loadDotEnv() {
  const file = join(ROOT, '.env.local')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function parseArgs(argv) {
  const out = { forceNew: false, sendMail: true, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') out.email = argv[++i]
    else if (a === '--plan') out.plan = argv[++i]
    else if (a === '--days') out.days = Number(argv[++i])
    else if (a === '--new') out.forceNew = true
    else if (a === '--no-email') out.sendMail = false
    else if (a === '--dry-run') out.dryRun = true
    else throw new Error(`Unknown option: ${a}`)
  }
  return out
}

// The shared Edge Function modules are TypeScript; compile them on the fly with
// esbuild (already installed as a Vite dependency) so the email template and
// key format exist in exactly one place.
async function loadShared() {
  const { transformSync } = await import('esbuild')
  const dir = mkdtempSync(join(tmpdir(), 'tindapos-shared-'))
  const load = async name => {
    const src = readFileSync(join(ROOT, 'supabase/functions/_shared', `${name}.ts`), 'utf8')
    const file = join(dir, `${name}.mjs`)
    writeFileSync(file, transformSync(src, { loader: 'ts', format: 'esm' }).code)
    return import(pathToFileURL(file).href)
  }
  return { paymongo: await load('paymongo'), email: await load('email') }
}

function serviceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const out = execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'json'],
      { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] })
    const keys = JSON.parse(out.slice(out.indexOf('[')))
    const found = keys.find(k => k.name === 'service_role')?.api_key
    if (found) return found
  } catch { /* fall through */ }
  throw new Error('No SUPABASE_SERVICE_ROLE_KEY. Set it, or run `npx supabase login` so it can be fetched.')
}

export function restDeps(baseUrl, key, shared, fetchFn = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const call = async (path, init = {}) => {
    const res = await fetchFn(`${baseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } })
    const body = await res.text()
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`)
    // `Prefer: return=minimal` answers 201/204 with an EMPTY body; parsing that
    // as JSON used to throw "Unexpected end of JSON input" AFTER the row was written.
    return body ? JSON.parse(body) : null
  }
  return {
    now: () => new Date(),
    makeKey: shared.paymongo.generateLicenseKey,
    findActive: async email => (await call(
      `licenses?select=license_key,expires_at,plan&email=eq.${encodeURIComponent(email)}&active=eq.true&order=created_at.desc&limit=1`,
    ))[0] ?? null,
    insert: row => call('licenses', { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=minimal' } }),
    extend: (licenseKey, expiresAt, plan) => call(`licenses?license_key=eq.${encodeURIComponent(licenseKey)}`, {
      method: 'PATCH', body: JSON.stringify({ expires_at: expiresAt.toISOString(), plan }), headers: { Prefer: 'return=minimal' },
    }),
    sendEmail: ({ to, licenseKey, plan, expiresAt }) => {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set (or use --no-email).')
      return shared.email.sendLicenseEmail({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.FROM_EMAIL || 'TindaPOS <noreply@resend.dev>',
        to, licenseKey, plan, expiresAt, reason: 'purchase',
      })
    },
  }
}

async function main() {
  loadDotEnv()
  const args = parseArgs(process.argv.slice(2))
  if (!args.email || !args.plan) {
    console.error('Usage: node scripts/issue-license.mjs --email <addr> --plan <trial|monthly|annual> [--days N] [--new] [--no-email] [--dry-run]')
    process.exit(2)
  }
  const shared = await loadShared()
  const url = (process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`).replace(/\/$/, '')
  const deps = restDeps(url, serviceRoleKey(), shared)
  const r = await issueLicense(args, deps)

  const when = r.expiresAt.toISOString().slice(0, 10)
  console.log(`${r.dryRun ? '[dry run] would ' : ''}${r.action === 'extend' ? 'EXTEND existing license' : 'CREATE license'} for ${r.email}`)
  console.log(`  plan: ${r.plan}   valid until: ${when}`)
  console.log(`  key:  ${r.licenseKey}`)
  if (!r.dryRun) console.log(args.sendMail ? (r.emailed ? '  email: sent' : '  email: FAILED to send (give the customer the key above)') : '  email: skipped')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(`Error: ${err.message}`); process.exit(1) })
}
