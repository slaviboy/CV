import { describe, expect, it } from 'vitest'

import { ConfigError, loadConfig } from './config.js'

const base = {
  ALLOWED_ORIGINS: 'https://slaviboy.github.io/, http://localhost:5173',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net',
  IP_HASH_SALT: '0123456789abcdef',
}

describe('loadConfig', () => {
  it('parses a complete configuration with defaults', () => {
    const config = loadConfig({
      ...base,
      RESEND_API_KEY: 're_test',
      CONTACT_TO_EMAIL: 'me@example.com',
    })

    expect(config.allowedOrigins).toEqual(['https://slaviboy.github.io', 'http://localhost:5173'])
    expect(config.mongodb).toEqual({
      uri: base.MONGODB_URI,
      dbName: 'portfolio',
      collection: 'contact_messages',
    })
    expect(config.resend?.from).toContain('onboarding@resend.dev')
    expect(config.rateLimit).toEqual({ maxRequests: 5, windowMinutes: 60 })
  })

  it('requires allowed origins', () => {
    expect(() => loadConfig({ ...base, ALLOWED_ORIGINS: '' })).toThrow(ConfigError)
    expect(() => loadConfig({ ...base, ALLOWED_ORIGINS: 'not a url' })).toThrow(ConfigError)
  })

  it('requires at least one delivery channel', () => {
    expect(() => loadConfig({ ALLOWED_ORIGINS: base.ALLOWED_ORIGINS })).toThrow(/at least one/)
  })

  it('requires a strong IP hash salt when MongoDB is used', () => {
    expect(() => loadConfig({ ...base, IP_HASH_SALT: 'short' })).toThrow(/IP_HASH_SALT/)
  })

  it('requires a recipient when Resend is configured', () => {
    expect(() =>
      loadConfig({ ALLOWED_ORIGINS: base.ALLOWED_ORIGINS, RESEND_API_KEY: 're_test' }),
    ).toThrow(/CONTACT_TO_EMAIL/)
  })

  it('validates numeric settings', () => {
    expect(() => loadConfig({ ...base, RATE_LIMIT_MAX: '0' })).toThrow(/RATE_LIMIT_MAX/)
  })
})
