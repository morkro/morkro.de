import { stat } from 'node:fs/promises'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { basename, dirname, extname, join } from 'node:path'
import config from '#config'
import { logger } from '#utils/log.ts'
import { getMimeType, isTextFile } from '#utils/mime-types.ts'
import { handleWSUpgrade } from '#transforms/livereload.ts'
import { resolveWithin } from '#utils/path-resolve.ts'
import { loadFile } from '#core/utils/fs.ts'

const log = logger('Server')

// dynamically loads the static files from the ".build/" directory
async function handleRequest (req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  let urlPath = url.pathname.replace(/^\//, '')
  let filePath = resolveWithin(config.directories.output, urlPath)

  try {
    const stats = await stat(filePath)
    if (stats.isDirectory()) {
      urlPath = join(urlPath, 'index.html')
      filePath = resolveWithin(config.directories.output, urlPath)
    }
  } catch {}
  
  const extension = extname(filePath)
  let contentType = getMimeType(extension)
  let file: string | Buffer = ''

  log.debug(`Requested url: "${url}"`)
  
  try {
    file = await loadFile(
      dirname(filePath),
      basename(filePath),
      isTextFile(extension) ? 'utf-8' : null
    )
    log.debug(`Served file: "${filePath}"`)
    res.statusCode = 200
  } catch (error) {
    log.error('Error reading file', { error, filePath })
    
    // lets see if the there is a custom "404.html" file and serve that instead
    try {
      file = await loadFile(config.directories.output, '404.html')
      log.debug(`Served file: "${config.directories.output}/404.html"`)
      contentType = getMimeType('html')
    } catch {
      log.warn('No custom 404 file found, serving default 404')
      file = '404 Not Found'
      contentType = getMimeType('txt')
    }
    
    res.statusCode = 404
  }

  log.debug(`Content type: ${contentType}`)
  const body = typeof file === 'string' ? Buffer.from(file) : file

  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Length', body.byteLength)
  /** In case I ever do port forwarding */
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.end(body)
}

export function startServer (port = 8080): { stop: () => Promise<void> } {
  const host = 'localhost'
  const server = createServer(handleRequest)

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/__livereload') {
      handleWSUpgrade(request, socket, head)
    } else {
      socket.destroy()
    }
  })

  server.listen(port, host, () => {
    log.info(`Server is running on http://${host}:${port}`)
  })

  return {
    stop: () => new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()))
  }
}