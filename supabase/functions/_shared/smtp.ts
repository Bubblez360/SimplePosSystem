// Gmail SMTP transport (Deno only: imported by mailer.ts, never by Node code).
//
// Port 465 (implicit TLS). Supabase Edge Functions block outbound 25 and 587,
// so STARTTLS submission would hang; 465 is allowed.
//
// Setup: Google Account > Security > turn on 2-Step Verification > App
// passwords > create one. Use that 16-character password, NOT the Gmail login.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import type { MailTransport } from './email.ts'

export function createGmailTransport(user: string, appPassword: string): MailTransport {
  return async ({ from, to, subject, html, text }) => {
    // A fresh connection per message: license emails are rare, and an idle
    // pooled connection would be dead by the next invocation anyway.
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are cosmetic.
        auth: { username: user, password: appPassword.replace(/\s+/g, '') },
      },
    })
    try {
      await client.send({ from, to, subject, content: text, html })
      return true
    } finally {
      await client.close().catch(() => {})
    }
  }
}
