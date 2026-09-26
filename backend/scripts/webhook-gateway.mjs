/* global fetch, Buffer, AbortSignal, process */
import { createServer } from 'node:http'

const path = '/api/v1/webhooks/midtrans'
const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== path || !request.headers['content-type']?.startsWith('application/json')) {
    response.writeHead(404).end()
    return
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 64 * 1024) {
      response.writeHead(413).end()
      return
    }
    chunks.push(chunk)
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:3000${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(20000),
    })
    response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' })
    response.end(await upstream.text())
    process.stdout.write(`Webhook forwarded: HTTP ${upstream.status}\n`)
  } catch {
    response.writeHead(502).end()
  }
})

server.listen(3333, '127.0.0.1', () => process.stdout.write('Webhook gateway listening on 127.0.0.1:3333\n'))
