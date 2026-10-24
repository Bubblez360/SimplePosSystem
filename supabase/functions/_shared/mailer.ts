// Picks the email provider from the function's secrets and exposes one
// `sendLicense` for both the payment webhook and retrieve-license.
//
//   Gmail SMTP (free):  GMAIL_USER, GMAIL_APP_PASSWORD   [FROM_NAME optional]
//   Resend (verified domain):  RESEND_API_KEY, FROM_EMAIL
// Gmail wins when both are set. With neither, `configured` is false and
// retrieve-license answers 503 instead of silently dropping the email.
import { sendLicenseEmail, type LicenseEmail } from './email.ts'
import { createGmailTransport } from './smtp.ts'

export interface Mailer {
  configured: boolean
  sendLicense: (o: Pick<LicenseEmail, 'to' | 'licenseKey' | 'plan' | 'expiresAt' | 'reason'>) => Promise<boolean>
}

export function mailerFromEnv(): Mailer {
  const gmailUser = Deno.env.get('GMAIL_USER') ?? ''
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

  if (gmailUser && gmailPass) {
    const name = Deno.env.get('FROM_NAME') ?? 'TindaPOS'
    const transport = createGmailTransport(gmailUser, gmailPass)
    return {
      configured: true,
      // Gmail rewrites the sender to the authenticated account, so use it as-is.
      sendLicense: o => sendLicenseEmail({ ...o, transport, from: `${name} <${gmailUser}>` }),
    }
  }

  const from = Deno.env.get('FROM_EMAIL') ?? 'TindaPOS <noreply@resend.dev>'
  return {
    configured: !!resendKey,
    sendLicense: o => sendLicenseEmail({ ...o, apiKey: resendKey, from }),
  }
}
