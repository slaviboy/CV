import { describe, expect, it, vi } from 'vitest'

import type { ServerConfig } from './config.js'
import {
  createContactHandler,
  type Mailer,
  type MessageStore,
  type StoredMessage,
} from './handler.js'

const ORIGIN = 'https://slaviboy.github.io'

const config: ServerConfig = {
  allowedOrigins: [ORIGIN],
  ipHashSalt: 'test-salt-test-salt',
  rateLimit: { maxRequests: 2, windowMinutes: 60 },
}

const validBody = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there!' }

function createMemoryStore(): MessageStore & { messages: (StoredMessage & { id: string })[] } {
  const messages: (StoredMessage & { id: string })[] = []
  return {
    messages,
    async countRecentByIp(ipHash, since) {
      return messages.filter((m) => m.ipHash === ipHash && m.createdAt >= since).length
    },
    async save(message) {
      const id = String(messages.length + 1)
      messages.push({ ...message, id })
      return id
    },
    async updateEmailStatus(id, status) {
      const message = messages.find((m) => m.id === id)
      if (message) message.emailStatus = status
    },
  }
}

function request(
  body: unknown,
  {
    origin = ORIGIN,
    ip = '203.0.113.7',
    method = 'POST',
  }: { origin?: string | null; ip?: string; method?: string } = {},
) {
  const headers = new Headers({ 'content-type': 'application/json', 'x-forwarded-for': ip })
  if (origin) headers.set('origin', origin)
  return new Request('https://api.example.com/api/contact', {
    method,
    headers,
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  })
}

const silentLogger = {
  error: vi.fn<(...args: unknown[]) => void>(),
  warn: vi.fn<(...args: unknown[]) => void>(),
}

describe('contact handler', () => {
  it('answers CORS preflight for allowed origins only', async () => {
    const handle = createContactHandler({
      config,
      store: createMemoryStore(),
      logger: silentLogger,
    })

    const allowed = await handle(request(null, { method: 'OPTIONS' }))
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ORIGIN)

    const denied = await handle(
      request(null, { method: 'OPTIONS', origin: 'https://evil.example' }),
    )
    expect(denied.status).toBe(403)
    expect(denied.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('rejects requests from unknown origins', async () => {
    const store = createMemoryStore()
    const handle = createContactHandler({ config, store, logger: silentLogger })

    const response = await handle(request(validBody, { origin: 'https://evil.example' }))
    expect(response.status).toBe(403)
    expect(store.messages).toHaveLength(0)
  })

  it('stores a valid message and emails a notification', async () => {
    const store = createMemoryStore()
    const mailer: Mailer = { send: vi.fn<Mailer['send']>().mockResolvedValue(undefined) }
    const handle = createContactHandler({ config, store, mailer, logger: silentLogger })

    const response = await handle(request({ ...validBody, name: '  Ada Lovelace  ' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(store.messages).toHaveLength(1)
    expect(store.messages[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      emailStatus: 'sent',
      origin: ORIGIN,
    })
    // Raw IPs are never stored.
    expect(store.messages[0]?.ipHash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(store.messages[0])).not.toContain('203.0.113.7')
    expect(mailer.send).toHaveBeenCalledOnce()
  })

  it('returns field errors for invalid input', async () => {
    const handle = createContactHandler({
      config,
      store: createMemoryStore(),
      logger: silentLogger,
    })

    const response = await handle(request({ name: '', email: 'nope', message: '   ' }))
    const body = (await response.json()) as { error: { code: string }; fields: object }

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('validation')
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'message', 'name'])
  })

  it('rejects malformed JSON and non-JSON bodies', async () => {
    const handle = createContactHandler({
      config,
      store: createMemoryStore(),
      logger: silentLogger,
    })

    expect((await handle(request('{not json'))).status).toBe(400)

    const form = new Request('https://api.example.com/api/contact', {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=x',
    })
    expect((await handle(form)).status).toBe(415)
  })

  it('rejects oversized bodies', async () => {
    const handle = createContactHandler({
      config,
      store: createMemoryStore(),
      logger: silentLogger,
    })
    const response = await handle(request({ ...validBody, message: 'x'.repeat(20_000) }))
    expect(response.status).toBe(413)
  })

  it('silently discards honeypot submissions', async () => {
    const store = createMemoryStore()
    const mailer: Mailer = { send: vi.fn<Mailer['send']>() }
    const handle = createContactHandler({ config, store, mailer, logger: silentLogger })

    const response = await handle(request({ ...validBody, website: 'https://spam.example' }))

    expect(response.status).toBe(200)
    expect(store.messages).toHaveLength(0)
    expect(mailer.send).not.toHaveBeenCalled()
  })

  it('rate limits repeated submissions from the same IP', async () => {
    const store = createMemoryStore()
    const handle = createContactHandler({ config, store, logger: silentLogger })

    expect((await handle(request(validBody))).status).toBe(200)
    expect((await handle(request(validBody))).status).toBe(200)

    const limited = await handle(request(validBody))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('3600')

    // A different visitor is unaffected.
    expect((await handle(request(validBody, { ip: '198.51.100.1' }))).status).toBe(200)
  })

  it('still succeeds when email fails but the message was stored', async () => {
    const store = createMemoryStore()
    const mailer: Mailer = {
      send: vi.fn<Mailer['send']>().mockRejectedValue(new Error('SMTP down')),
    }
    const handle = createContactHandler({ config, store, mailer, logger: silentLogger })

    const response = await handle(request(validBody))

    expect(response.status).toBe(200)
    expect(store.messages[0]?.emailStatus).toBe('failed')
  })

  it('succeeds with email only when no database is configured', async () => {
    const mailer: Mailer = { send: vi.fn<Mailer['send']>().mockResolvedValue(undefined) }
    const handle = createContactHandler({ config, mailer, logger: silentLogger })

    expect((await handle(request(validBody))).status).toBe(200)
    expect(mailer.send).toHaveBeenCalledOnce()
  })

  it('reports failure when the message could not be delivered anywhere', async () => {
    const store = createMemoryStore()
    store.save = vi.fn<MessageStore['save']>().mockRejectedValue(new Error('db down'))
    const mailer: Mailer = {
      send: vi.fn<Mailer['send']>().mockRejectedValue(new Error('mail down')),
    }
    const handle = createContactHandler({ config, store, mailer, logger: silentLogger })

    const response = await handle(request(validBody))
    expect(response.status).toBe(502)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('server_error')
  })

  it('rejects unsupported methods', async () => {
    const handle = createContactHandler({
      config,
      store: createMemoryStore(),
      logger: silentLogger,
    })
    const response = await handle(request(null, { method: 'GET' }))
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('POST, OPTIONS')
  })
})
