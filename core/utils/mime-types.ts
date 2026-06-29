const UTF8 = '; charset=utf-8'
const TEXT_PREFIXES = ['text/', 'application/']
const MIME_MAP = new Map<string, string>([
  ['.html', 'text/html'],
  ['.css', 'text/css'],
  ['.js', 'application/javascript'],
  ['.json', 'application/json'],
  ['.txt', 'text/plain'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.ogg', 'video/ogg'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.eot', 'font/eot'],
  ['.otf', 'font/otf'],
])

export function getMimeType(ext = ''): string {
  let extension = ext
  if (!extension.startsWith('.')) extension = '.' + extension
  const mime = MIME_MAP.get(extension.toLowerCase()) ?? 'text/plain'
  return TEXT_PREFIXES.some(prefix => mime.startsWith(prefix))
    ? `${mime}${UTF8}`
    : mime
}

export function isTextFile(extension?: string): boolean {
  const mimeType = getMimeType(extension)
  return mimeType.startsWith('text/') || mimeType.startsWith('application/')
}