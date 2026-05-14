import type { Token, TokenHeading, TokenParagraph } from './types.ts';

export type Cursor = {
  readonly input: string
  index: number
}

function isBeginningOfLine (input: string, index: number) {
  return index === 0 || input[index - 1] === '\n'
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
      } as TokenParagraph)
    }

    pStart = -1
    paragraphs = []
  }
  
  while (cursor.index < input.length) {
    if (!isBeginningOfLine(input, cursor.index)) {
      const nextNewline = input.indexOf('\n', cursor.index)
      cursor.index = nextNewline === -1 ? input.length : nextNewline + 1
      continue
    }

    const nextNewline = input.indexOf('\n', cursor.index)
    const line = input.slice(
      cursor.index,
      nextNewline === -1 ? input.length : nextNewline
    )
    const afterLine = nextNewline === -1 ? input.length : nextNewline + 1
    
    const isHeading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (isHeading) {
      flushParagraph(cursor.index)

      tokens.push({
        type: 'Heading',
        level: isHeading[1].length,
        text: isHeading[2].trimEnd(),
        start: cursor.index,
        end: afterLine
      } as TokenHeading)

      cursor.index = afterLine
      continue
    }

    if (line.trim() === '') {
      flushParagraph(cursor.index)
      cursor.index = afterLine
      continue
    }
    
    if (pStart === -1) pStart = cursor.index
    paragraphs.push(line)
    cursor.index = afterLine
  }

  flushParagraph(input.length)
  return tokens
}