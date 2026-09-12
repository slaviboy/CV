import { describe, expect, it, vi } from 'vitest'

import { createResendMailer } from './resendMailer.js'

const message = {
  name: 'Ada <script>',
  email: 'ada@example.com',
  message: 'Hi & <b>hello</b>',
  receivedAt: new Date('2026-01-02T03:04:05Z'),
}

describe('createResendMailer', () => {
  it('posts an escaped email with reply-to set to the visitor', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"id":"1"}', { status: 200 }))
    const mailer = createResendMailer(
      { apiKey: 're_test', from: 'Portfolio <onboarding@resend.dev>', to: 'me@example.com' },
      fetchMock,
    )

    await mailer.send(message)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(init.body))
    expect(url).toBe('https://api.resend.com/emails')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer re_test')
    expect(payload).toMatchObject({ to: ['me@example.com'], reply_to: 'ada@example.com' })
    expect(payload.html).toContain('Ada &lt;script&gt;')
    expect(payload.html).toContain('Hi &amp; &lt;b&gt;hello&lt;/b&gt;')
    expect(payload.html).not.toContain('<script>')
    expect(payload.text).toContain('Hi & <b>hello</b>')
  })

  it('throws when the API responds with an error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('invalid key', { status: 401 }))
    const mailer = createResendMailer({ apiKey: 'bad', from: 'a@b.co', to: 'c@d.co' }, fetchMock)

    await expect(mailer.send(message)).rejects.toThrow(/401/)
  })
})
