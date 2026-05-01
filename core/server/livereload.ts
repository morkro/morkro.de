import { createHash } from "node:crypto"
import type { IncomingMessage } from "node:http"
import type { Duplex } from "node:stream"
import config from "#core/config.core.ts"
import { logger } from "#utils/log.ts"

const clients = new Set<Duplex>()
const log = logger('Server')

const livereloadScript = `
  <script>
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(\`\${protocol}//\${window.location.host}\/__livereload\`)
    socket.onmessage = (message) => {
      window.location.reload()
    }
  </script>
`

export function injectLivereloadScript(file: string): string {
  return file.replace('</body>', `${livereloadScript}</body>`)
}

/**
 * Broadcast a reload message to all connected clients
 */
export function broadcastReload () {
  const payload = Buffer.from('reload', 'utf-8')
  const frame = Buffer.alloc(2 + payload.length)
  frame[0] = 0x80 | 0x1
  frame[1] = payload.length
  payload.copy(frame, 2)
  for (const client of clients) {
    try {
      client.write(frame)
    } catch (error) {
      clients.delete(client)
      log.error(`Error broadcasting reload message to client: ${String(error)}`)
    }
  }
}

function acceptWSKey (secWSKey: string): string {
  return createHash('sha1')
    .update(secWSKey + config.livereload.wsGuid)
    .digest('base64')
}

export function handleWSUpgrade (req: IncomingMessage, socket: Duplex, head: Buffer) {
  const secWSKey = req.headers['sec-websocket-key']
  if (!secWSKey || typeof secWSKey !== 'string') {
    socket.destroy()
    return
  }

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptWSKey(secWSKey)}`,
    '',
    '' // Apparently this is required by the WebSocket protocol
  ].join('\r\n')
  socket.write(headers)
  clients.add(socket)
  socket.on('close', () => {
    clients.delete(socket)
  })
  socket.on('error', (error) => {
    clients.delete(socket)
    log.error(`WebSocket error: ${String(error)}`)
  })
}