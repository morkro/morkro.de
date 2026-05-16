import { escapeXML } from '#utils/html.ts'
import type {
  InlineToken,
  Token,
  TokenList,
  TokenTable,
  TokenTableCell,
} from './types.ts'

function renderList (list: TokenList): string {
  const tag = list.kind === 'Ordered' ? 'ol' : 'ul'
  const items = list.items.map(item => {
    const children = item.children?.map(renderList).join('') ?? ''
    const inner = escapeXML(item.text)
    if (item.type === 'Checkbox') {
      return `<li><input type="checkbox"${item.checked ? ' checked' : ''}>${inner}${children}</li>`
    }
    return `<li>${inner}${children}</li>`
  })

  return `<${tag}>${items.join('')}</${tag}>`
}

function renderTableCell (cell: TokenTableCell): string {
  const tag = cell.header ? 'th' : 'td'
  const align = cell.align ? ` style="text-align:${cell.align};"` : ''
  return `<${tag}${align}>${escapeXML(cell.text)}</${tag}>`
}

function renderTable (table: TokenTable): string {
  const head = `<thead><tr>${
    table.headers.map(renderTableCell).join('')
  }</tr></thead>`
  const body = `<tbody>${
    table.rows.map(row => `<tr>${row.map(renderTableCell).join('')}</tr>`).join('')
  }</tbody>`
  return `<table>${head}${body}</table>`
}

function renderInline (tokens: InlineToken[]): string {
  return tokens.map(token => {
    switch (token.type) {
      case 'Text':
        return escapeXML(token.text)
      case 'Link':
        return `<a href="${token.url}">${escapeXML(token.text)}</a>`
      case 'Image': {
        const title = token.text.length > 0 ? ` title="${escapeXML(token.text)}"` : ''
        return `<img src="${token.src}" alt="${escapeXML(token.alt)}"${title}>`
      }
      case 'Break':
        return '<br>'
    }
  }).join('')
}

export function renderMarkdown (tokens: Token[]): string {
  const result: string[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'Heading':
        result.push(`<h${token.level}>${renderInline(token.inline)}</h${token.level}>`)
        break
      case 'Paragraph':
        result.push(`<p>${renderInline(token.inline)}</p>`)
        break
      case 'Line':
        result.push('<hr>')
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
      case 'Table':
        result.push(renderTable(token))
        break
    }
  }

  return result.join('')
}