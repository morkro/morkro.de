export function minifyHtml (html: string): string {
  return html
    .trim()
    // remove all whitespace between tags
    .replaceAll(/>\s+</g, '><')
    // remove all comments
    .replaceAll(/<!--[\s\S]*?-->/g, '')
    // remove all whitespace between attributes
    .replaceAll(/\s+=/g, '=')
    // remove whitespace before closing tag
    .replaceAll(/\s+\/>/g, '/>')
}