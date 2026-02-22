import { styleText } from 'node:util'
import type{ InnerToken } from './types.ts'

/**
 * Visualises tokens as a string for easier debugging, for example:
 * [Text:Hello, world!] [Output:{ "name": "John" }] [Tag:render] [EOF]
 */
export function vizTokens (tokens: InnerToken[]): string {
  return tokens
    .map((token) => {
      if (token.type === 'EOF') return '[EOF]'
      if ('value' in token) {
        return `[${token.type}:${token.value}]`
      }
      return `[${(token as InnerToken).type}]`
    })
    .join(' ')
}

export type SourceLocation = { line: number, column: number }

function offsetToLocation (source: string, offset: number): SourceLocation {
  if (offset === 0) return { line: 1, column: 1 }

  let line = 1
  let column = 1
  const clampedOffset = Math.min(offset, source.length)

  for (let index = 0; index < clampedOffset; index++) {
    if (source[index] === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }

  return { line, column }
}

/** Output format should be:
 * 1 │ line before error
 * 2 │ the error line
 *   │    ^^^^^^^^^^^^
 * 3 │ line after error
 */
function formatLocation (source: string, start: number, end: number): string {
  const startLocation = offsetToLocation(source, start)
  const split = source.split('\n')
  const errorLine = split[startLocation.line - 1]
  const prevLine = startLocation.line > 1 ? split[startLocation.line - 2] : null
  const nextLine = startLocation.line < split.length ? split[startLocation.line] : null
  const gutterWidth = String(split.length).length
  const caretLength = Math.max(1, errorLine.trimEnd().length - (startLocation.column - 1))
  const emptyGutter = '   ' + ' '.repeat(gutterWidth) + ' │ '
  const indent = errorLine.slice(0, startLocation.column - 1).replace(/[^\t]/g, ' ')
  const gutter = (lineNum: number, marker: boolean) =>
    `${marker ? ' > ' : '   '}${String(lineNum).padStart(gutterWidth)} │ `
  
  const output: string[] = []

  if (prevLine !== null) {
    output.push(gutter(startLocation.line - 1, false) + prevLine)
  }
  output.push(gutter(startLocation.line, true) + styleText(['red'], errorLine))
  output.push(emptyGutter + indent + styleText(['red'], '^'.repeat(caretLength)))
  if (nextLine !== null) {
    output.push(gutter(startLocation.line + 1, false) + nextLine)
  }

  return output.join('\n')
}

export class ParserError extends Error {
  public readonly rawMessage: string
  public readonly source: string

  constructor(
    message: string,
    public readonly offset: number,
    source?: string,
    filePath?: string
  ) {
    const location = source
      ? '\n' + formatLocation(source, offset, offset + 1)
      : ''
    super(`${message}${filePath ? ` in ${filePath}` : ''}${location ? '\n' + location : ''}`)
    this.rawMessage = message
  }
}