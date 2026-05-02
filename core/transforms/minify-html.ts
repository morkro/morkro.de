export function minifyHtml (html: string): string {
  return html
    .trim()
    .replace(/>\s+</g, '><')
}