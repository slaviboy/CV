/**
 * Contact API request handler.
 *
 * Written against the Web-standard Request/Response API, so it runs unchanged on Vercel
 * Functions, Netlify Functions, Cloudflare-style runtimes or a plain Node server. Storage and
 * email are injected, which keeps the handler easy to test and to port.
 */
import { createHash } from 'node:crypto'

import type { ServerConfig } from './config.js'
import {
  hasErrors,
  normalizeContactForm,
  validateContactForm,
  type ContactFormData,
} from './validation.js'

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface StoredMessage extends ContactFormData {
  createdAt: Date
  /** Salted SHA-256 of the client IP — used only for rate limiting. */
  ipHash: string | null
  userAgent: string | null
  origin: string
  emailStatus: EmailStatus
}

export interface MessageStore {
  countRecentByIp(ipHash: string, since: Date): Promise<number>
  save(message: StoredMessage): Promise<string>
  updateEmailStatus(id: string, status: EmailStatus): Promise<void>
}

export interface Mailer {
  send(message: ContactFormData & { receivedAt: Date }): Promise<void>
}

export interface ContactHandlerDeps {
  config: ServerConfig
  store?: MessageStore
  mailer?: Mailer
  now?: () => Date
  logger?: Pick<Console, 'error' | 'warn'>
}

type ErrorCode = 'validation' | 'rate_limited' | 'forbidden' | 'bad_request' | 'server_error'

const MAX_BODY_BYTES = 16 * 1024

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

function errorBody(code: ErrorCode, message: string) {
  return { ok: false, error: { code, message } }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
    headers['Access-Control-Max-Age'] = '86400'
  }
  return headers
}

/**
 * On Vercel, `x-real-ip` / `x-forwarded-for` are set by the platform and cannot be spoofed by
 * the client. If you deploy elsewhere, make sure your platform provides an equivalent header.
 */
function getClientIp(request: Request): string | null {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || null
}

function hashIp(salt: string, ip: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export function createContactHandler(deps: ContactHandlerDeps) {
  const { config, store, mailer } = deps
  const now = deps.now ?? (() => new Date())
  const logger = deps.logger ?? console

  return async function handleContactRequest(request: Request): Promise<Response> {
    const requestOrigin = request.headers.get('origin')
    const origin =
      requestOrigin && config.allowedOrigins.includes(requestOrigin) ? requestOrigin : null
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: origin ? 204 : 403, headers: cors })
    }

    if (request.method !== 'POST') {
      return json(405, errorBody('bad_request', 'Method not allowed.'), {
        ...cors,
        Allow: 'POST, OPTIONS',
      })
    }

    // Browsers always send Origin on cross-origin POSTs; anything else isn't our frontend.
    if (!origin) {
      return json(403, errorBody('forbidden', 'Origin not allowed.'), cors)
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.startsWith('application/json')) {
      return json(415, errorBody('bad_request', 'Expected a JSON request body.'), cors)
    }

    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return json(413, errorBody('bad_request', 'Request body is too large.'), cors)
    }

    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json(413, errorBody('bad_request', 'Request body is too large.'), cors)
    }

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return json(400, errorBody('bad_request', 'Malformed JSON.'), cors)
    }

    // Honeypot filled in → almost certainly a bot. Pretend success and drop the message.
    if (isRecord(body) && typeof body.website === 'string' && body.website.trim() !== '') {
      logger.warn('[contact] Honeypot triggered; message discarded.')
      return json(200, { ok: true }, cors)
    }

    const data = normalizeContactForm(body)
    const fields = validateContactForm(data)
    if (hasErrors(fields)) {
      return json(
        422,
        { ...errorBody('validation', 'Please correct the highlighted fields.'), fields },
        cors,
      )
    }

    const receivedAt = now()
    const ip = getClientIp(request)
    const ipHash = ip && store ? hashIp(config.ipHashSalt, ip) : null

    if (store && ipHash) {
      try {
        const windowMs = config.rateLimit.windowMinutes * 60_000
        const since = new Date(receivedAt.getTime() - windowMs)
        const recent = await store.countRecentByIp(ipHash, since)
        if (recent >= config.rateLimit.maxRequests) {
          return json(
            429,
            errorBody(
              'rate_limited',
              "You've sent several messages in a short time. Please try again a bit later.",
            ),
            { ...cors, 'Retry-After': String(Math.ceil(windowMs / 1000)) },
          )
        }
      } catch (error) {
        // Fail open: a database hiccup shouldn't block a genuine visitor.
        logger.error('[contact] Rate-limit check failed:', describeError(error))
      }
    }

    let messageId: string | null = null
    if (store) {
      try {
        messageId = await store.save({
          ...data,
          createdAt: receivedAt,
          ipHash,
          userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
          origin,
          emailStatus: mailer ? 'pending' : 'skipped',
        })
      } catch (error) {
        logger.error('[contact] Saving message failed:', describeError(error))
      }
    }

    let emailed = false
    if (mailer) {
      try {
        await mailer.send({ ...data, receivedAt })
        emailed = true
      } catch (error) {
        logger.error('[contact] Sending notification email failed:', describeError(error))
      }

      if (store && messageId) {
        try {
          await store.updateEmailStatus(messageId, emailed ? 'sent' : 'failed')
        } catch (error) {
          logger.error('[contact] Updating email status failed:', describeError(error))
        }
      }
    }

    // The message counts as delivered if it was stored OR emailed.
    if (!messageId && !emailed) {
      return json(
        502,
        errorBody('server_error', "Your message couldn't be delivered. Please try again later."),
        cors,
      )
    }

    return json(200, { ok: true }, cors)
  }
}

/** Handler used when the environment is misconfigured: fails closed with a generic error. */
export function createMisconfiguredHandler(
  reason: string,
  logger: Pick<Console, 'error'> = console,
) {
  return async function handleMisconfigured(): Promise<Response> {
    logger.error(`[contact] Server misconfigured: ${reason}`)
    return json(500, errorBody('server_error', 'The contact service is temporarily unavailable.'))
  }
}
