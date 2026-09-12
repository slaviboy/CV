import { ConfigError, loadConfig } from './config.js'
import { createContactHandler, createMisconfiguredHandler } from './handler.js'
import { createMongoStore } from './mongoStore.js'
import { createResendMailer } from './resendMailer.js'

/** Builds the production handler from environment variables. */
export function createContactHandlerFromEnv(env: Record<string, string | undefined> = process.env) {
  try {
    const config = loadConfig(env)
    return createContactHandler({
      config,
      store: config.mongodb ? createMongoStore(config.mongodb) : undefined,
      mailer: config.resend ? createResendMailer(config.resend) : undefined,
    })
  } catch (error) {
    if (error instanceof ConfigError) return createMisconfiguredHandler(error.message)
    throw error
  }
}
