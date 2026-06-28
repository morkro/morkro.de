import { escapeXML } from '#utils/html.ts'
import type {
  InlineToken,
  Token,
  TokenList,
  TokenTable,
  TokenTableCell,
} from './types.ts'
import { escapeHtmlContent } from './utils.ts'

function renderList (list: TokenList): string {
  const tag = list.kind === 'Ordered' ? 'ol' : 'ul'
  const items = list.items.map(item => {
    const children = item.children?.map(renderList).join('') ?? ''
    const inner = renderInline(item.inline)
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
  return `<${tag}${align}>${renderInline(cell.inline)}</${tag}>`
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
        return escapeHtmlContent(token.text)
      case 'Link':{
        const title = token.title.length > 0 ? ` title="${escapeXML(token.title)}"` : ''
        return `<a href="${escapeXML(token.url)}"${title}>${renderInline(token.inline)}</a>`
      }
      case 'Image': {
        const title = token.text.length > 0 ? ` title="${escapeXML(token.text)}"` : ''
        return `<img src="${escapeXML(token.src)}" alt="${escapeXML(token.alt)}"${title}>`
      }
      case 'Break':
        return '<br>'
      case 'Bold':
        return `<strong>${renderInline(token.inline)}</strong>`
      case 'Italic':
        return `<em>${renderInline(token.inline)}</em>`
      case 'Strikethrough':
        return `<del>${renderInline(token.inline)}</del>`
      case 'InlineCode':
        return `<code>${escapeHtmlContent(token.text)}</code>`
      case 'HtmlInline':
        return token.raw
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
        const lang = token.language || 'txt'
        result.push(`<pre class="language-${lang}"><code class="language-${lang}">${escapeHtmlContent(token.text)}</code></pre>`)
        break}
      case 'Blockquote':
        result.push(`<blockquote>${renderInline(token.inline)}</blockquote>`)
        break
      case 'List':
        result.push(renderList(token))
        break
      case 'Table':
        result.push(renderTable(token))
        break
      case 'HtmlBlock':
        result.push(token.raw)
        break
    }
  }

  return result.join('')
}