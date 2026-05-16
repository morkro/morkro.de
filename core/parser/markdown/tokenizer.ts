import { ParserError } from '#parser/utils.ts'
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

export type Cursor = {
  readonly input: string
  index: number
}

const headingRegex = /^(#{1,6})\s+(.*)$/d
const unorderedRegex = /^( *)([*+-])\s+(.*)$/
const orderedRegex = /^( *)(\d+)\.\s+(.*)$/
const checkboxRegex = /^\[( |x|X)\]\s+(.*)$/
const blockquoteRegex = /^>\s?/
const tableSeparatorCellRegex = /^:?-+:?$/
const inlineImageRegex = /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/y
const inlineLinkRegex = /\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/y
const inlineBreakRegex = /  \n/y

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
    const checkbox = checkboxRegex.exec(itemText)
    if (checkbox) {
      items.push({
        type: 'Checkbox',
        text: checkbox[2].trimEnd(),
        checked: checkbox[1] === 'x' || checkbox[1] === 'X',
        start: scan,
        end: after
      })
    } else {
      items.push({
        type: 'ListItem',
        text: itemText.trimEnd(),
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
     * Markdown inline image: ![Alt text](image.jpg)
     */
    inlineImageRegex.lastIndex = index
    const imageMatch = inlineImageRegex.exec(text)
    if (imageMatch) {
      flushText(index)
      const [full, alt, src, title] = imageMatch

      tokens.push({
        type: 'Image',
        text: title ?? '',
        alt,
        src,
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /** 
     * Markdown inline link: [Link text](https://example.com)
     */
    inlineLinkRegex.lastIndex = index
    const linkMatch = inlineLinkRegex.exec(text)
    if (linkMatch) {
      flushText(index)
      const [full, linkText, url] = linkMatch
      
      tokens.push({
        type: 'Link',
        text: linkText,
        url,
        start: baseOffset + index,
        end: baseOffset + index + full.length
      })

      index += full.length
      bufferStart = index
      continue
    }

    /**
     * Markdown inline break
     */
    inlineBreakRegex.lastIndex = index
    const breakMatch = inlineBreakRegex.exec(text)
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
        text: quoteLines.join('\n'),
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
          text,
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
            text,
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