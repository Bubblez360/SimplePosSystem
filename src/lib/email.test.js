// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { sendLicenseEmail } from '../../supabase/functions/_shared/email.ts'

const base = {
  from: 'TindaPOS <shop@gmail.com>',
  to: 'nena@example.com',
  licenseKey: 'ABCD-2345-EFGH-6789',
  plan: 'monthly',
  expiresAt: new Date('2026-11-24T00:00:00Z'),
}

describe('sendLicenseEmail transports', () => {
  it('hands the message to an injected transport (Gmail SMTP) with an HTML and a plain-text body', async () => {
    const transport = vi.fn(async () => true)
    expect(await sendLicenseEmail({ ...base, transport })).toBe(true)

    const msg = transport.mock.calls[0][0]
    expect(msg).toMatchObject({ from: base.from, to: base.to })
    expect(msg.subject).toContain('TindaPOS')
    expect(msg.html).toContain('ABCD-2345-EFGH-6789')
    expect(msg.text).toContain('ABCD-2345-EFGH-6789')
  })

  it('reports failure instead of throwing when the transport throws', async () => {
    const transport = vi.fn(async () => { throw new Error('535 bad credentials') })
    expect(await sendLicenseEmail({ ...base, transport })).toBe(false)
  })

  it('reports failure when the transport says it was not accepted', async () => {
    expect(await sendLicenseEmail({ ...base, transport: async () => false })).toBe(false)
  })

  it('still sends through Resend when only an API key is configured', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }))
    expect(await sendLicenseEmail({ ...base, apiKey: 're_x', fetchFn })).toBe(true)
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.resend.com/emails')
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer re_x')
  })

  it('refuses when nothing is configured', async () => {
    expect(await sendLicenseEmail({ ...base })).toBe(false)
  })

  it('prefers the transport over Resend when both are present', async () => {
    const transport = vi.fn(async () => true)
    const fetchFn = vi.fn()
    await sendLicenseEmail({ ...base, apiKey: 're_x', fetchFn, transport })
    expect(transport).toHaveBeenCalledOnce()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('escapes the license key in the HTML body', async () => {
    const transport = vi.fn(async () => true)
    await sendLicenseEmail({ ...base, licenseKey: '<b>X</b>', transport })
    expect(transport.mock.calls[0][0].html).not.toContain('<b>X</b>')
  })
})
