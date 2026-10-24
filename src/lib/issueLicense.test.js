// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { issueLicense } from '../../scripts/issue-license.mjs'

const NOW = new Date('2026-10-24T00:00:00Z')

function fakeDeps({ existing = null, emailOk = true } = {}) {
  return {
    now: () => NOW,
    makeKey: () => 'NEWK-1111-2222-3333',
    findActive: vi.fn(async () => existing),
    insert: vi.fn(async () => {}),
    extend: vi.fn(async () => {}),
    sendEmail: vi.fn(async () => emailOk),
  }
}

describe('issueLicense', () => {
  it('creates a new license and emails it', async () => {
    const deps = fakeDeps()
    const r = await issueLicense({ email: ' Nena@Example.com ', plan: 'monthly' }, deps)
    expect(r).toMatchObject({ action: 'create', licenseKey: 'NEWK-1111-2222-3333', emailed: true, email: 'nena@example.com' })
    expect(r.expiresAt.toISOString()).toBe('2026-11-23T00:00:00.000Z')
    expect(deps.insert).toHaveBeenCalledWith(expect.objectContaining({
      license_key: 'NEWK-1111-2222-3333', active: true, plan: 'monthly', email: 'nena@example.com',
      expires_at: '2026-11-23T00:00:00.000Z', payment_id: expect.stringMatching(/^manual-/),
    }))
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'nena@example.com', plan: 'monthly' }))
  })

  it('renews: extends an existing active license from its current expiry and keeps the key', async () => {
    const deps = fakeDeps({ existing: { license_key: 'OLDK-AAAA-BBBB-CCCC', expires_at: '2026-10-30T00:00:00Z', plan: 'monthly' } })
    const r = await issueLicense({ email: 'nena@example.com', plan: 'monthly' }, deps)
    expect(r).toMatchObject({ action: 'extend', licenseKey: 'OLDK-AAAA-BBBB-CCCC' })
    expect(r.expiresAt.toISOString()).toBe('2026-11-29T00:00:00.000Z') // 6 days left + 30
    expect(deps.insert).not.toHaveBeenCalled()
    expect(deps.extend).toHaveBeenCalledWith('OLDK-AAAA-BBBB-CCCC', r.expiresAt, 'monthly')
  })

  it('an already-expired license restarts from today, not from the old date', async () => {
    const deps = fakeDeps({ existing: { license_key: 'OLDK-AAAA-BBBB-CCCC', expires_at: '2026-01-01T00:00:00Z', plan: 'monthly' } })
    const r = await issueLicense({ email: 'nena@example.com', plan: 'annual' }, deps)
    expect(r.expiresAt.toISOString()).toBe('2027-10-24T00:00:00.000Z')
  })

  it('--new forces a fresh key even if one exists', async () => {
    const deps = fakeDeps({ existing: { license_key: 'OLDK-AAAA-BBBB-CCCC', expires_at: '2026-12-01T00:00:00Z' } })
    const r = await issueLicense({ email: 'nena@example.com', plan: 'trial', forceNew: true }, deps)
    expect(r.action).toBe('create')
    expect(deps.findActive).not.toHaveBeenCalled()
  })

  it('dry run changes nothing and sends nothing', async () => {
    const deps = fakeDeps()
    const r = await issueLicense({ email: 'nena@example.com', plan: 'monthly', dryRun: true }, deps)
    expect(r.dryRun).toBe(true)
    expect(deps.insert).not.toHaveBeenCalled()
    expect(deps.sendEmail).not.toHaveBeenCalled()
  })

  it('--no-email skips the email; a failed send is reported, not hidden', async () => {
    const quiet = fakeDeps()
    await issueLicense({ email: 'nena@example.com', plan: 'monthly', sendMail: false }, quiet)
    expect(quiet.sendEmail).not.toHaveBeenCalled()
    const broken = fakeDeps({ emailOk: false })
    expect((await issueLicense({ email: 'nena@example.com', plan: 'monthly' }, broken)).emailed).toBe(false)
  })

  it('honours --days and rejects bad input', async () => {
    const r = await issueLicense({ email: 'nena@example.com', plan: 'monthly', days: 3 }, fakeDeps())
    expect(r.expiresAt.toISOString()).toBe('2026-10-27T00:00:00.000Z')
    await expect(issueLicense({ email: 'nope', plan: 'monthly' }, fakeDeps())).rejects.toThrow(/valid email/)
    await expect(issueLicense({ email: 'a@b.co', plan: 'gold' }, fakeDeps())).rejects.toThrow(/Unknown plan/)
    await expect(issueLicense({ email: 'a@b.co', plan: 'monthly', days: -1 }, fakeDeps())).rejects.toThrow(/positive/)
  })
})
