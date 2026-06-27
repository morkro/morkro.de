import { ParserError } from '#parser/utils.ts'
import {
  htmlCdataRegex,
  htmlCloseTagRegex,
  htmlCommentRegex,
  htmlDeclRegex, 
  htmlOpenTagRegex,
  htmlProcInstRegex,
  knownHtmlBlockTags
} from './html.ts'
import { parseLink } from './parser.ts'
import type {
  BlockToken,
  InlineToken,
  TableAlign,
  TokenCheckbox,
  TokenHeadingLevel,
  TokenList,
  TokenListItem,
  TokenTableCell,
} from './types.ts'
import {
  autolinkEmailRegex,
  autolinkUriRegex,
  blockquoteRegex,
  boldStarRegex,
  boldUnderscoreRegex,
  checkboxRegex,
  decimalEntityRegex,
  headingRegex,
  hexEntityRegex,
  inlineBreakRegex,
  inlineCodeRegex,
  isAsciiPunct,
  italicStarRegex,
  italicUnderscoreRegex,
  matchSticky,
  namedEntityRegex,
  orderedRegex,
  strikethroughRegex,
  tableSeparatorCellRegex,
  unorderedRegex,
} from './utils.ts'

export type Cursor = {
  readonly input: string
  index: number
}

function readLine (input: string, index: number) {
  const newline = input.indexOf('\n', index)
  const end = newline === -1 ? input.length : newline
  const line = input.slice(index, end)
  const after = newline === -1 ? input.length : newline + 1
  return { line, after }
}

function parseList (input: string, index: number): { list: TokenList, after: number } {
  const { line: firstLine } = readLine(input, index)
  const firstUnordered = unorderedRegex.exec(firstLine)
  const firstOrdered = !firstUnordered && orderedRegex.exec(firstLine)
  const firstMatch = firstUnordered || firstOrdered

  const kind = firstUnordered ? 'Unordered' : 'Ordered'
  const baseIndent = firstMatch?.[1].length

  const items: (TokenListItem | TokenCheckbox)[] = []
  let scan = index
  let listEnd = index

  while (scan < input.length) {
    const { line, after } = readLine(input, scan)
    const unordered = unorderedRegex.exec(line)
    const ordered = !unordered && orderedRegex.exec(line)
    const match = unordered || ordered
    if (!match) break

    const indent = match[1].length
    if (indent < baseIndent) break

    if (indent > baseIndent) {
      const previous = items[items.length - 1]
      if (!previous) break

      const { list: child, after: childAfter } = parseList(input, scan)
      previous.children = previous.children ?? []
      previous.children.push(child)

      scan = childAfter
      listEnd = childAfter
      continue
    }

    const lineKind = unordered ? 'Unordered' : 'Ordered'
    if (lineKind !== kind) break

    const itemText = match[3]
    const itemTextStart = scan + match[0].length - itemText.length

    const checkbox = checkboxRegex.exec(itemText)
    if (checkbox) {
      const checkboxText = checkbox[2]
      const checkboxTextStart = itemTextStart + (checkbox[0].length - checkbox[2].length)

      items.push({
        type: 'Checkbox',
        inline: tokenizeInner(checkboxText.trimEnd(), checkboxTextStart),
        checked: checkbox[1] === 'x' || checkbox[1] === 'X',
        start: scan,
        end: after
      })
    } else {
      items.push({
        type: 'ListItem',
        inline: tokenizeInner(itemText.trimEnd(), itemTextStart),
        start: scan,
        end: after
      })
    }

    scan = after
    listEnd = after
  }

  return {
    list: {
      type: 'List',
      kind,
      items,
      start: index,
      end: listEnd
    },
    after: scan
  }
}

function splitTableRow (line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function parseTableAlign (cell: string): TableAlign {
  if (!tableSeparatorCellRegex.test(cell)) return null
  
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')

  if (left && right) return 'center'
  if (left) return 'left'
  if (right) return 'right'
  return null
}

function tokenizeInner (text: string, baseOffset = 0): InlineToken[] {
  const tokens: InlineToken[] = []
  let buffer = ''
  let bufferStart = 0
  let index = 0

  const flushText = (end: number) => {
    if (buffer.length === 0) return

    tokens.push({
      type: 'Text',
      text: buffer,
      start: baseOffset + bufferStart,
      end: baseOffset + end
    })

    buffer = ''
  }

  while (index < text.length) {
    /**
     * Backslack escaped character
     */
    const isEscaped = text[index] === '\\' && index + 1 < text.length && isAsciiPunct(text[index + 1])
    if (isEscaped) {
      if (buffer.length === 0) {
        bufferStart = index
      }
      buffer += text[index + 1]
      index += 2
      continue
    }

    /**
     * Backslack escaped newline
     */
    const isEscapedNewline = text[index] === '\\' && text[index + 1] === '\n'
    if (isEscapedNewline) {
      flushText(index)
      
      tokens.push({
        type: 'Break',
        start: baseOffset + index,
        end: baseOffset + index + 2
      })

      index += 2
      bufferStart = index
      continue
    }

    const entityMatch =
      matchSticky(namedEntityRegex, text, index) ??
      matchSticky(hexEntityRegex, text, index) ??
      matchSticky(decimalEntityRegex, text, index)
    if (entityMatch) {
      flushText(index)
      const [raw] = entityMatch

      tokens.push({
        type: 'HtmlInline',
        raw,
        start: baseOffset + index,
        end: baseOffset + index + raw.length
      })

      index += raw.length
      bufferStart = index
      continue
    }


    /**
     * Autolink email and URI: <user@example.com> or <https://example.com>
     */
    const autolinkUriMatch = matchSticky(autolinkUriRegex, text, index)
    const autolinkEmailMatch = !autolinkUriMatch && matchSticky(autolinkEmailRegex, text, index)
    const autolinkMatch = autolinkUriMatch ?? autolinkEmailMatch
    if (autolinkMatch) {
      flushText(index)
      const [full, body] = autolinkMatch
      const url = autolinkUriMatch ? body : `mailto:${body}`
      const start = baseOffset + index
      const end = start + full.length

      tokens.push({
        type: 'Link',
        inline: [{
          type: 'Text',
          text: body,
          start: start + 1,
          end: end - 1
        }],
        title: '',
        url,
        start,
        end
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown inline image: ![Alt text](image.jpg)
     */
    const imageMatch = parseLink(text, index, true)
    if (imageMatch) {
      flushText(index)

      tokens.push({
        type: 'Image',
        text: imageMatch.title,
        alt: imageMatch.text,
        src: imageMatch.url,
        start: baseOffset + index,
        end: baseOffset + index + imageMatch.full.length
      })

      index += imageMatch.full.length
      bufferStart = index
      continue
    }

    /** 
     * Markdown inline link: [Link text](https://example.com)
     */
    const linkMatch = parseLink(text, index, false)
    if (linkMatch) {
      flushText(index)
      
      tokens.push({
        type: 'Link',
        inline: tokenizeInner(linkMatch.text, baseOffset + index + 1),
        url: linkMatch.url,
        title: linkMatch.title,
        start: baseOffset + index,
        end: baseOffset + index + linkMatch.full.length
      })

      index += linkMatch.full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown inline break
     */
    const breakMatch = matchSticky(inlineBreakRegex, text, index)
    if (breakMatch) {
      flushText(index)

      tokens.push({
        type: 'Break',
        start: baseOffset + index,
        end: baseOffset + index + 3
      })

      index += 3
      bufferStart = index
      continue
    }

    /**
     * Markdown inline HTML: <div>HTML content</div>
     */
    const htmlInlineMatch = 
      matchSticky(htmlOpenTagRegex, text, index) ??
      matchSticky(htmlCloseTagRegex, text, index) ??
      matchSticky(htmlCommentRegex, text, index) ??
      matchSticky(htmlCdataRegex, text, index) ??
      matchSticky(htmlDeclRegex, text, index) ??
      matchSticky(htmlProcInstRegex, text, index)

    if (htmlInlineMatch) {
      flushText(index)
      const [raw] = htmlInlineMatch

      tokens.push({
        type: 'HtmlInline',
        raw,
        start: baseOffset + index,
        end: baseOffset + index + raw.length
      })

      index += raw.length
      bufferStart = index
      continue
    }

    /**
     * Markdown inline code: `Inline code`
     */
    const inlineCodeMatch = matchSticky(inlineCodeRegex, text, index)
    if (inlineCodeMatch) {
      flushText(index)

      const [full, body] = inlineCodeMatch

      tokens.push({
        type: 'InlineCode',
        text: body.trim(),
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown bold: **Bold text** or __Bold text__
     */
    const boldStarMatch = matchSticky(boldStarRegex, text, index)
    const boldUnderscoreMatch = matchSticky(boldUnderscoreRegex, text, index)
    const boldMatch = boldStarMatch ?? boldUnderscoreMatch
    if (boldMatch) {
      flushText(index)

      const [full, body] = boldMatch

      tokens.push({
        type: 'Bold',
        inline: tokenizeInner(body, baseOffset + index + 2),
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown italic: *Italic text* or _Italic text_
     */
    const italicStarMatch = matchSticky(italicStarRegex, text, index)
    const italicUnderscoreMatch = matchSticky(italicUnderscoreRegex, text, index)
    const italicMatch = italicStarMatch ?? italicUnderscoreMatch
    if (italicMatch) {
      flushText(index)

      const [full, body] = italicMatch

      tokens.push({
        type: 'Italic',
        inline: tokenizeInner(body, baseOffset + index + 1),
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown strikethrough: ~~Strikethrough text~~
     */
    const strikethroughMatch = matchSticky(strikethroughRegex, text, index)
    if (strikethroughMatch) {
      flushText(index)

      const [full, body] = strikethroughMatch

      tokens.push({
        type: 'Strikethrough',
        inline: tokenizeInner(body, baseOffset + index + 2),
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown inline text
     */
    if (buffer.length === 0) {
      bufferStart = index
    }

    buffer += text[index]
    index++
  }

  flushText(index)
  return tokens
}

export function tokenize(input: string): BlockToken[] {
  const tokens: BlockToken[] = []
  const cursor: Cursor = { input, index: 0 }
  let pStart = -1
  let paragraphs:string[] = []

  const flushParagraph = (end: number) => {
    if (pStart === -1) return
    
    const text = paragraphs.join('\n').trimEnd()
    if (text.length > 0) {
      tokens.push({
        type: 'Paragraph',
        inline: tokenizeInner(text, pStart),
        start: pStart,
        end
      })
    }

    pStart = -1
    paragraphs = []
  }
  
  while (cursor.index < input.length) {
    const { line, after: outerAfter } = readLine(input, cursor.index)
    
    /**
     * Markdown heading: # Heading
     */
    const headingMatch = headingRegex.exec(line)
    if (headingMatch) {
      flushParagraph(cursor.index)

      if (!headingMatch.indices) {
        throw new ParserError('Heading match indices are required', headingMatch.index)
      }

      const [textStart] = headingMatch.indices[2]
      const headingText = headingMatch[2].trimEnd()

      tokens.push({
        type: 'Heading',
        level: headingMatch[1].length as TokenHeadingLevel,
        inline: tokenizeInner(headingText, cursor.index + textStart),
        start: cursor.index,
        end: outerAfter
      })

      cursor.index = outerAfter
      continue
    }

    /**
     * Markdown code block: ```language
     */
    const isCodeBlock = /^(```|~~~)\s*([^\s`]*)\s*$/.exec(line)
    if (isCodeBlock) {
      flushParagraph(cursor.index)

      const block = isCodeBlock[1]
      const language = isCodeBlock[2]
      const closing = block === '```' ? /^```\s*$/ : /^~~~\s*$/
      const start = cursor.index
      const lines: string[] = []
      let scan = outerAfter
      let blockEnd = input.length

      while (scan < input.length) {
        const { line: codeLine, after: innerAfter } = readLine(input, scan)

        if (closing.test(codeLine)) {
          blockEnd = innerAfter
          scan = innerAfter
          break
        }

        lines.push(codeLine)
        scan = innerAfter
        blockEnd = innerAfter
      }

      tokens.push({
        type: 'Code',
        text: lines.join('\n'),
        language,
        start,
        end: blockEnd
      })

      cursor.index = scan
      continue
    }

    /**
     * Markdown list: - List item
     */
    const isUnorderedList = unorderedRegex.exec(line)
    const isOrderedList = !isUnorderedList && orderedRegex.exec(line)
    if (isUnorderedList || isOrderedList) {
      flushParagraph(cursor.index)
      const { list, after } = parseList(input, cursor.index)
      tokens.push(list)
      cursor.index = after
      continue
    }

    /**
     * Markdown line: ---
     */
    const isLine = /^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)
    if (isLine) {
      flushParagraph(cursor.index)
      tokens.push({
        type: 'Line',
        start: cursor.index,
        end: outerAfter
      })
      cursor.index = outerAfter
      continue
    }

    /**
     * Markdown blockquote: > Blockquote
     */
    const isBlockquote = blockquoteRegex.test(line)
    if (isBlockquote) {
      flushParagraph(cursor.index)

      const start = cursor.index
      const quoteLines: string[] = []
      let scan = cursor.index
      let blockEnd = input.length

      while (scan < input.length) {
        const { line: quoteLine, after: innerAfter } = readLine(input, scan)
        if (!blockquoteRegex.test(quoteLine)) break

        quoteLines.push(quoteLine.replace(blockquoteRegex, '').trimEnd())
        scan = innerAfter
        blockEnd = innerAfter
      }

      tokens.push({
        type: 'Blockquote',
        inline: tokenizeInner(quoteLines.join('\n'), start),
        start,
        end: blockEnd
      })

      cursor.index = scan
      continue
    }

    /**
     * Markdown block HTML: <section>HTML content</section>
     */
    const htmlBlockOpen = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s|\/?>|$)/
    const htmlMatch = htmlBlockOpen.exec(line)
    if (htmlMatch && knownHtmlBlockTags.has(htmlMatch[1].toLowerCase())) {
      flushParagraph(cursor.index)

      const start = cursor.index
      const htmlLines: string[] = [line]
      let scan = outerAfter
      let blockEnd = outerAfter

      while (scan < input.length) {
        const { line: next, after: innerAfter } = readLine(input, scan)
        if (next.trim() === '') {
          blockEnd = scan
          break
        }
        htmlLines.push(next)
        scan = innerAfter
        blockEnd = innerAfter
      }

      tokens.push({
        type: 'HtmlBlock',
        raw: htmlLines.join('\n'),
        start,
        end: blockEnd
      })

      cursor.index = scan
      continue
    }

    /**
     * Markdown table: | Header | Header |
     */
    if (line.includes('|')) {
      const { line: maybeSeparator, after: afterSeparator } = readLine(input, outerAfter)
      const separatorCells = splitTableRow(maybeSeparator)
      const isSeparator =
        separatorCells.length > 0 &&
        separatorCells.every(cell => tableSeparatorCellRegex.test(cell))

      if (isSeparator) {
        flushParagraph(cursor.index)

        const start = cursor.index
        const headerCells = splitTableRow(line)
        const align = separatorCells.map(parseTableAlign)
        const headers: TokenTableCell[] = headerCells.map((text, index) => ({
          type: 'TableCell',
          header: true,
          inline: tokenizeInner(text, cursor.index),
          align: align[index] ?? null,
          start: cursor.index,
          end: outerAfter
        }))

        const rows: TokenTableCell[][] = []
        let scan = afterSeparator
        let tableEnd = afterSeparator

        while (scan < input.length) {
          const { line: maybeRow, after: innerAfter } = readLine(input, scan)
          if (maybeRow.trim() === '' || !maybeRow.includes('|')) {
            break
          }

          const cells = splitTableRow(maybeRow)
          rows.push(cells.map((text, index) => ({
            type: 'TableCell',
            header: false,
            inline: tokenizeInner(text, scan),
            align: align[index] ?? null,
            start: scan,
            end: innerAfter
          })))

          scan = innerAfter
          tableEnd = innerAfter
        }

        tokens.push({
          type: 'Table',
          headers,
          rows,
          align,
          start,
          end: tableEnd
        })
        
        cursor.index = scan
        continue
      }
    }

    if (line.trim() === '') {
      flushParagraph(cursor.index)
      cursor.index = outerAfter
      continue
    }
    
    if (pStart === -1) pStart = cursor.index
    paragraphs.push(line)
    cursor.index = outerAfter
  }

  flushParagraph(input.length)
  return tokens
}