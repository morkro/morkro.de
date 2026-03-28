export function toUrl (base: string, output: string): string {
  const path = `/${output.replace(/^.*[/\\]\.build[/\\]?/, '').replace(/\\/g, '/')}`
  return base.replace(/\/$/, '') + path.replace(/index\.html$/, '')
}
