import { relative, resolve } from 'node:path'
import config from '#core/config.core.ts'

export function toUrl (base: string, output: string): string {
  const relativeUrl = relative(resolve(config.directories.dest), output)
    .replace(/\\/g, '/')
    .replace(/index\.html$/, '')
  return `${base.replace(/\/$/, '')}/${relativeUrl}`
}