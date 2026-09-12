/**
 * Minimal local server for developing the contact API without any platform CLI.
 *   npm run dev   →   POST http://localhost:8787/api/contact
 */
import { createServer, type IncomingMessage } from 'node:http'

import { createContactHandlerFromEnv } from '../src/app.js'

const port = Number(process.env.PORT ?? 8787)
const handleContactRequest = createContactHandlerFromEnv()

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  // Mirror what the hosting platform does in production.
  headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1')

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
  return new Request(`http://localhost:${port}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', `http://localhost:${port}`).pathname

  if (path !== '/api/contact') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: { code: 'bad_request', message: 'Not found.' } }))
    return
  }

  try {
    const response = await handleContactRequest(await toWebRequest(req))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({ ok: false, error: { code: 'server_error', message: 'Unexpected error.' } }),
    )
  }
}).listen(port, () => {
  console.log(`Contact API listening on http://localhost:${port}/api/contact`)
})
