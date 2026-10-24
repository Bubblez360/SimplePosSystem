// License-key email. Shared by the payment webhook (new purchase) and
// retrieve-license ("I lost my key"), which EMAILS the key instead of returning
// it to whoever typed the address.
//
// Delivery is pluggable: pass a `transport` (Gmail SMTP, see smtp.ts) or an
// `apiKey` (Resend). This file stays free of Deno-only imports so Node (vitest,
// scripts/issue-license.mjs) can load it.

export interface MailMessage {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

/** Resolves true only when the provider accepted the message. May throw. */
export type MailTransport = (msg: MailMessage) => Promise<boolean>

export interface LicenseEmail {
  /** Resend API key. Ignored when `transport` is set. */
  apiKey?: string
  transport?: MailTransport
  from: string
  to: string
  licenseKey: string
  plan: string
  expiresAt: Date
  reason?: 'purchase' | 'retrieve'
  fetchFn?: typeof fetch
}

const PLAN_LABELS: Record<string, string> = {
  annual: 'Annual (1 taon)',
  monthly: 'Monthly (30 araw)',
  trial: 'Trial (7 araw)',
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderLicenseEmail(o: Pick<LicenseEmail, 'licenseKey' | 'plan' | 'expiresAt' | 'reason'>) {
  const planLabel = PLAN_LABELS[o.plan] ?? o.plan
  const expiryStr = o.expiresAt.toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  const intro = o.reason === 'retrieve'
    ? 'May humiling na ipadala muli ang iyong license key. Nandito ito:'
    : 'Salamat sa iyong subscription! Nandito na ang iyong license key:'
  const outro = o.reason === 'retrieve'
    ? 'Hindi ikaw ang humiling? Pwede mo itong balewalain — walang nagbago sa account mo.'
    : 'Nawala ang key? I-type ang email mo sa Settings at ipapadala namin ulit sa email na ito.'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1c1917;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #B45309; margin: 0; font-size: 28px;">TindaPOS</h1>
    <p style="color: #6b645c; margin: 4px 0 0;">License Key</p>
  </div>
  <p>${intro}</p>
  <div style="background: #fafaf7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b645c;">Your License Key</p>
    <p style="margin: 0; font-family: monospace; font-size: 22px; font-weight: bold; color: #1c1917; letter-spacing: 2px;">${escapeHtml(o.licenseKey)}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 0; color: #6b645c; font-size: 14px;">Plan</td>
      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${escapeHtml(planLabel)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b645c; font-size: 14px;">Valid hanggang</td>
      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${escapeHtml(expiryStr)}</td>
    </tr>
  </table>
  <h3 style="color: #1c1917; margin: 24px 0 12px;">Paano i-activate:</h3>
  <ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #44403c;">
    <li>Buksan ang TindaPOS</li>
    <li>Pumunta sa <strong>Setting</strong> → <strong>Sistema</strong></li>
    <li>I-tap ang <strong>"May key na?"</strong></li>
    <li>I-paste ang license key sa itaas</li>
    <li>I-tap ang <strong>I-activate ang Key</strong></li>
  </ol>
  <p style="margin-top: 24px; font-size: 13px; color: #6b645c;">${outro}</p>
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">
  <p style="font-size: 12px; color: #78716c; text-align: center; margin: 0;">TindaPOS — Para sa mga tindero at negosyante</p>
</body>
</html>`

  const text = [
    intro,
    '',
    `License key: ${o.licenseKey}`,
    `Plan: ${planLabel}`,
    `Valid hanggang: ${expiryStr}`,
    '',
    'Paano i-activate: Setting > Sistema > "May key na?" > i-paste ang key > I-activate ang Key.',
    '',
    outro,
  ].join('\n')

  return { planLabel, html, text }
}

function resendTransport(apiKey: string, send: typeof fetch): MailTransport {
  return async ({ from, to, subject, html }) => {
    const res = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!res.ok) console.error('Resend error:', res.status, await res.text())
    return res.ok
  }
}

// Returns true only when the provider accepted the message. Never throws.
export async function sendLicenseEmail(o: LicenseEmail): Promise<boolean> {
  const transport = o.transport ?? (o.apiKey ? resendTransport(o.apiKey, o.fetchFn ?? fetch) : null)
  if (!transport) {
    console.error('No email transport configured (set GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY)')
    return false
  }
  const { planLabel, html, text } = renderLicenseEmail(o)
  try {
    return await transport({
      from: o.from,
      to: o.to,
      subject: `Ang iyong TindaPOS License Key — ${planLabel}`,
      html,
      text,
    })
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}
