import { escapeXML } from '#utils/html.ts'
import type { Token, TokenList } from './types.ts'

function renderList (list: TokenList): string {
  const tag = list.kind === 'Ordered' ? 'ol' : 'ul'
  const items = list.items.map(item => {
    const children = item.children?.map(renderList).join('') ?? null
    const inner = escapeXML(item.text)
    if (item.type === 'Checkbox') {
      return `<li><input type="checkbox" ${item.checked ? 'checked' : ''}>${inner}</li>`
    }
    return `<li>${inner}${children}</li>`
  })

  return `<${tag}>${items.join('')}</${tag}>`
}

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
      case 'Code':{
        result.push(`<pre><code class="language-${token.language ? token.language : 'txt'}">${token.text}</code></pre>`)
        break}
      case 'Blockquote':
        result.push(`<blockquote>${escapeXML(token.text)}</blockquote>`)
        break
      case 'List':
        result.push(renderList(token))
        break
    }
  }

  return result.join('')
}