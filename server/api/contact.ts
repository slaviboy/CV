/**
 * Vercel Function: POST /api/contact
 * Uses the Web-standard `fetch` export supported by Vercel's Node.js runtime.
 */
import { createContactHandlerFromEnv } from '../src/app.js'

const handleContactRequest = createContactHandlerFromEnv()

export default {
  fetch(request: Request): Promise<Response> {
    return handleContactRequest(request)
  },
}
