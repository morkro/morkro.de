export function toUrl (base: string, output: string): string {
  const path = output
    .replace(/^(?:.*[/\\])?\.build[/\\]?/, '') // remove .build from path
    .replace(/\\/g, '/') // replace backslashes with forward slashes
  return `${base.replace(/\/$/, '')}/${path.replace(/index\.html$/, '')}`
}
