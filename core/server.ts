import { readFile } from 'node:fs/promises'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import config from '#core/config.core.ts'
import { logger } from '#utils/log.ts'
import { getMimeType, isTextFile } from '#utils/mime-types.ts'

const log = logger('Server')

const hasExtension = (path: string): boolean => extname(path) !== ''

// dynamically loads the static files from the ".build/" directory
async function handleRequest (req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const urlPath = url.pathname.replace(/^\//, '')
  const filePath = hasExtension(urlPath) ? urlPath : join(urlPath, 'index.html')
  const resolvedBase = resolve(config.directories.dest)
  const resolvedPath = resolve(config.directories.dest, filePath)
  const normalisedBase = resolvedBase + sep
  
  // secure exit if the file is not in the build directory
  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(normalisedBase)) {
    log.error(`Requested file is not in the build directory: "${resolvedPath}"`)
    res.statusCode = 404
    res.end('404 Not Found')
    return
  }
  
  const extension = extname(resolvedPath)
  let contentType = getMimeType(extension)
  let file: string | Buffer = ''

  log.debug(`Requested url: "${url}"`)

  try {
    file = await readFile(resolvedPath, {
      encoding: isTextFile(extension) ? 'utf-8' : undefined
    })
    log.debug(`Served file: "${resolvedPath}"`)
    res.statusCode = 200
  } catch (error) {
    log.error(`Error reading file ${filePath}: ${error}`)
    
    // lets see if the there is a custom "404.html" file and serve that instead
    try {
      file = await readFile(resolve(resolvedBase, '404.html'), 'utf-8')
      log.debug(`Served file: "${config.directories.dest}/404.html"`)
      contentType = getMimeType('html')
    } catch {
      log.debug('No custom 404 file found, serving default 404')
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
  res.end(file)
}

export function startServer (port = 8080): void {
  const host = 'localhost'
  const server = createServer(handleRequest)

  server.listen(port, host, () => {
    log.info(`Server is running on http://${host}:${port}`)
  })
}