import { relative, resolve } from 'node:path'
import config from '#config'

export function toUrl (base: string, output: string): string {
  const relativeUrl = relative(resolve(config.directories.output), output)
    .replace(/\\/g, '/')
    .replace(/index\.html$/, '')
  return `${base.replace(/\/$/, '')}/${relativeUrl}`
}