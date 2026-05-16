import type {
  Token,
  TokenCheckbox,
  TokenHeadingLevel,
  TokenList,
  TokenListItem,
} from './types.ts'

export type Cursor = {
  readonly input: string
  index: number
}

const unorderedRegex = /^( *)([*+-])\s+(.*)$/
const orderedRegex = /^( *)(\d+)\.\s+(.*)$/
const checkboxRegex = /^\[( |x|X)\]\s+(.*)$/
const blockquoteRegex = /^>\s?/

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

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const cursor: Cursor = { input, index: 0 }
  let pStart = -1
  let paragraphs:string[] = []

  const flushParagraph = (end: number) => {
    if (pStart === -1) return
    
    const text = paragraphs.join('\n').trimEnd()
    if (text.length > 0) {
      tokens.push({
        type: 'Paragraph',
        text,
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
    const isHeading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (isHeading) {
      flushParagraph(cursor.index)

      tokens.push({
        type: 'Heading',
        level: isHeading[1].length as TokenHeadingLevel,
        text: isHeading[2].trimEnd(),
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