/**
 * Server configuration, read from environment variables (never from source code).
 * See `server/.env.example` for documentation of every variable.
 */

export interface ServerConfig {
  /** Exact origins allowed to call the API, e.g. https://slaviboy.github.io */
  allowedOrigins: string[]
  mongodb?: {
    uri: string
    dbName: string
    collection: string
  }
  resend?: {
    apiKey: string
    from: string
    to: string
  }
  /** Secret used to hash client IPs for rate limiting (raw IPs are never stored). */
  ipHashSalt: string
  rateLimit: {
    maxRequests: number
    windowMinutes: number
  }
}

export class ConfigError extends Error {
  override name = 'ConfigError'
}

type Env = Record<string, string | undefined>

function readPositiveInt(env: Env, key: string, fallback: number): number {
  const raw = env[key]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`${key} must be a positive integer.`)
  }
  return value
}

function parseOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    throw new ConfigError('ALLOWED_ORIGINS is required (comma-separated list of origins).')
  }

  return origins.map((value) => {
    try {
      const url = new URL(value)
      // Origins never include a path; normalise "https://site.io/" → "https://site.io".
      return url.origin
    } catch {
      throw new ConfigError(`ALLOWED_ORIGINS contains an invalid origin: "${value}".`)
    }
  })
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const allowedOrigins = parseOrigins(env.ALLOWED_ORIGINS)

  const mongoUri = env.MONGODB_URI?.trim()
  const resendApiKey = env.RESEND_API_KEY?.trim()

  if (!mongoUri && !resendApiKey) {
    throw new ConfigError(
      'Configure at least one delivery channel: MONGODB_URI (store messages) and/or RESEND_API_KEY (email notifications).',
    )
  }

  const ipHashSalt = env.IP_HASH_SALT?.trim() ?? ''
  if (mongoUri && ipHashSalt.length < 16) {
    throw new ConfigError(
      'IP_HASH_SALT must be set to a random secret of at least 16 characters when MONGODB_URI is used.',
    )
  }

  let resend: ServerConfig['resend']
  if (resendApiKey) {
    const to = env.CONTACT_TO_EMAIL?.trim()
    if (!to) throw new ConfigError('CONTACT_TO_EMAIL is required when RESEND_API_KEY is set.')
    resend = {
      apiKey: resendApiKey,
      to,
      from: env.CONTACT_FROM_EMAIL?.trim() || 'Portfolio Contact <onboarding@resend.dev>',
    }
  }

  return {
    allowedOrigins,
    mongodb: mongoUri
      ? {
          uri: mongoUri,
          dbName: env.MONGODB_DB?.trim() || 'portfolio',
          collection: 'contact_messages',
        }
      : undefined,
    resend,
    ipHashSalt,
    rateLimit: {
      maxRequests: readPositiveInt(env, 'RATE_LIMIT_MAX', 5),
      windowMinutes: readPositiveInt(env, 'RATE_LIMIT_WINDOW_MINUTES', 60),
    },
  }
}
