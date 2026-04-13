export function getMimeType(extension = ''): string {
  const utf8 = '; charset=utf-8'
  switch (extension.toLowerCase()) {
    case '.html':
      return 'text/html' + utf8
    case '.css':
      return 'text/css' + utf8
    case '.js':
      return 'application/javascript' + utf8
    case '.json':
      return 'application/json'
    case '.txt':
      return 'text/plain' + utf8
    case '.svg':
      return 'image/svg+xml' + utf8
    case '.png':
      return 'image/png'
    case '.jpg':
      return 'image/jpeg'
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
    case '.ico':
      return 'image/x-icon'
    case '.webp':
      return 'image/webp'
    case '.mp4':
      return 'video/mp4'
    case '.webm':
      return 'video/webm'
    case '.ogg':
      return 'video/ogg'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.ttf':
      return 'font/ttf'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    case '.eot':
      return 'font/eot'
    case '.otf':
      return 'font/otf'
    default:
      return 'text/plain' + utf8
  }
}

export function isTextFile(extension?: string): boolean {
  const mimeType = getMimeType(extension)
  return mimeType.startsWith('text/') || mimeType.startsWith('application/')
}