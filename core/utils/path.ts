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

export function resolveOutput (filePath: string, outputRoot: string, permalink?: string): string {
  const inputRoot = resolve(config.directories.input)
  let inputRelative = relative(inputRoot, resolve(filePath))

  // if there is no permalink, we need to remove the pages directory from the path
  if (!permalink || typeof permalink !== 'string') {
    const prefix = `${config.directories.pages}/`
    if (inputRelative.startsWith(prefix)) {
      inputRelative = inputRelative.slice(prefix.length)
    }
  }

  return ensureOutputPath(inputRelative, outputRoot, permalink)
}