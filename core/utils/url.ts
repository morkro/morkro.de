import { relative, resolve } from 'node:path'

export function toUrl (base: string, outputRoot: string,output: string): string {
  const relativeUrl = relative(resolve(outputRoot), output)
    .replace(/\\/g, '/')
    .replace(/index\.html$/, '')
  return `${base.replace(/\/$/, '')}/${relativeUrl}`
}