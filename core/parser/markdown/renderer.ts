import { escapeXML } from '#utils/html.ts'
import type { Token } from './types.ts'

export function renderMarkdown (tokens: Token[]): string {
  const result: string[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'Heading':
        result.push(`<h${token.level}>${escapeXML(token.text)}</h${token.level}>`)
        break
      case 'Paragraph':
        result.push(`<p>${escapeXML(token.text)}</p>`)
        break
      case 'Line':
        result.push('<hr>')
        break
      case 'Break':
        result.push('<br>')
        break
      case 'Link':
        result.push(`<a href="${token.url}">${escapeXML(token.text)}</a>`)
        break
      case 'Image':
        result.push(`<img src="${token.src}" alt="${escapeXML(token.alt)}" title="${escapeXML(token.text)}">`)
        break
      case 'Checkbox':
        result.push(`<input type="checkbox" ${token.checked ? 'checked' : ''}>`)
        break
      case 'Code':
        result.push(`<pre><code class="language-${token.language}">${token.text}</code></pre>`)
        break
      case 'Blockquote':
        result.push(`<blockquote>${escapeXML(token.text)}</blockquote>`)
        break
      case 'List': {
        const listKind = token.kind === 'Ordered' ? 'ol' : 'ul'
        result.push(`<${listKind}>${token.items.map(item => `<li>${escapeXML(item.text)}</li>`).join('')}</${listKind}>`)
        break
      }
    }
  }

  return result.join('')
}