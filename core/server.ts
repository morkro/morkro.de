import { readFile } from 'node:fs/promises'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { extname, resolve } from 'node:path'
import { DIRECTORIES } from '#config'
import { logServer as log } from '#utils/log.ts'
import { getMimeType, isTextFile } from '#utils/mime-types.ts'

const hasExtension = (path: string): boolean => extname(path) !== ''

// dynamically loads the static files from the ".build/" directory
async function handleRequest (req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const urlPath = url.pathname.replace(/^\//, '')
  const filePath = hasExtension(urlPath) ? urlPath : `${urlPath}/index.html`
  const resolvedBase = resolve(DIRECTORIES.DEST)
  const resolvedPath = resolve(DIRECTORIES.DEST, filePath)
  
  // secure exit if the file is not in the build directory
  if (!resolvedPath.startsWith(resolvedBase)) {
    log(`Requested file is not in the build directory: "${resolvedPath}"`, { lvl: 'error' })
    res.statusCode = 404
    res.end('404 Not Found')
    return
  }
  
  const extension = extname(resolvedPath)
  let contentType = getMimeType(extension)
  let file: string | Buffer = ''

  log(`Requested url: "${url}"`)

  try {
    file = await readFile(resolvedPath, {
      encoding: isTextFile(extension) ? 'utf-8' : undefined
    })
    log(`Served file: "${resolvedPath}"`)
  } catch (error) {
    log(`Error reading file ${filePath}: ${error}`, { lvl: 'error' })
    
    // lets see if the there is a custom "404.html" file and serve that instead
    try {
      file = await readFile(resolve(resolvedBase, '404.html'), 'utf-8')
      log(`Served file: "${DIRECTORIES.DEST}/404.html"`)
      contentType = getMimeType('html')
    } catch {
      log('No custom 404 file found, serving default 404', { lvl: 'debug' })
      file = '404 Not Found'
      contentType = getMimeType('txt')
    }
    
    res.statusCode = 404
  }

  log(`Content type: ${contentType}`)
  res.setHeader('Content-Type', contentType)
  res.write(file)
  res.end()
}

export function startServer (port = 8080): void {
  const host = 'localhost'
  const server = createServer(handleRequest)

  server.listen(port, host, () => {
    log(`Server is running on http://${host}:${port}`)
  })
}