import type { Mailer } from './handler.js'

interface ResendMailerOptions {
  apiKey: string
  from: string
  to: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Sends the notification through Resend's REST API (https://resend.com/docs/api-reference).
 * Uses plain `fetch`, so no SDK dependency is needed. Replying to the email goes straight to
 * the visitor thanks to `reply_to`.
 */
export function createResendMailer(
  options: ResendMailerOptions,
  fetchImpl: typeof fetch = fetch,
): Mailer {
  return {
    async send(message) {
      const received = message.receivedAt.toUTCString()
      const text = [
        `New message from your portfolio contact form.`,
        ``,
        `Name:     ${message.name}`,
        `Email:    ${message.email}`,
        `Received: ${received}`,
        ``,
        message.message,
      ].join('\n')

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#101316">
          <p style="margin:0 0 16px;color:#545c64">New message from your portfolio contact form.</p>
          <table style="border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:2px 16px 2px 0;color:#545c64">Name</td><td>${escapeHtml(message.name)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#545c64">Email</td><td>${escapeHtml(message.email)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#545c64">Received</td><td>${escapeHtml(received)}</td></tr>
          </table>
          <div style="white-space:pre-wrap;padding:16px;border-radius:8px;background:#f7f7f4">${escapeHtml(message.message)}</div>
        </div>`

      const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from,
          to: [options.to],
          reply_to: message.email,
          subject: `Portfolio message from ${message.name}`,
          text,
          html,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300)
        throw new Error(`Resend API responded with ${response.status}: ${detail}`)
      }
    },
  }
}
