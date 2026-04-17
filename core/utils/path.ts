import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import config from '#core/config.core.ts'

export function ensureOutputPath (fileName: string, buildRoot: string, permalink?: string): string {
  const htmlName = `${basename(fileName, extname(fileName))}.html`

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

export function resolveOutput (filePath: string, destDir: string, permalink?: string): string {
  const srcRoot = resolve(config.directories.src)
  const srcRelative = relative(srcRoot, resolve(filePath))
  return ensureOutputPath(srcRelative, destDir, permalink)
}