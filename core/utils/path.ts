import { basename, dirname, extname, join } from 'node:path'

export function ensureOutputPath (fileName: string, buildRoot: string, permalink?: string): string {
  const htmlName = basename(fileName, extname(fileName)) + '.html'

  if (!permalink || typeof permalink !== 'string') {
    return join(buildRoot, dirname(fileName), htmlName)
  }

  let path = permalink.trim()
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  if (path.endsWith('/')) {
    const innerPath = path.slice(1, -1)
    if (innerPath === '') {
      return join(buildRoot, htmlName)
    }
    return join(buildRoot, ...innerPath.split('/').filter(Boolean), htmlName)
  }

  return join(buildRoot, path.slice(1))
}