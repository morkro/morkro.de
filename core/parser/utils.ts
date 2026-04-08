import { styleText } from 'node:util'

export function stripQuotes(raw: string) {
	return raw.trim().replace(/^(['"])(.*)\1$/, '$2')
}

export function getIndentWidth(line: string): number {
	return line.length - line.trimStart().length
}

export type SourceLocation = { line: number, column: number }

export class ParserError extends Error {
  #rawMessage: string
  #source?: string
  #offset: number

  static #buildMessage (message: string, offset: number, source?: string, filePath?: string): string {
    const location = source
      ? `\n${ParserError.#formatLocation(source, offset, offset + 1)}`
      : ''
    return `${message}${filePath ? ` in ${filePath}` : ''}${location ? `\n${location}` : ''}`
  }

  static #offsetToLocation (source: string, offset: number): SourceLocation {
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
  static #formatLocation (source: string, start: number, end: number): string {
    const startLocation = ParserError.#offsetToLocation(source, start)
    const split = source.split('\n')
    const errorLine = split[startLocation.line - 1]
    const prevLine = startLocation.line > 1 ? split[startLocation.line - 2] : null
    const nextLine = startLocation.line < split.length ? split[startLocation.line] : null
    const gutterWidth = String(split.length).length
    const caretLength = Math.max(1, errorLine.trimEnd().length - (startLocation.column - 1))
    const emptyGutter = `   ${' '.repeat(gutterWidth)} │ `
    const indent = errorLine.slice(0, startLocation.column - 1).replace(/[^\t]/g, ' ')
    const gutter = (lineNum: number, marker = false) =>
      `${marker ? ' > ' : '   '}${String(lineNum).padStart(gutterWidth)} │ `
    
    const output: string[] = []

    if (prevLine !== null) {
      output.push(gutter(startLocation.line - 1) + prevLine)
    }
    output.push(gutter(startLocation.line, true) + styleText(['red'], errorLine))
    output.push(emptyGutter + indent + styleText(['red'], '^'.repeat(caretLength)))
    if (nextLine !== null) {
      output.push(gutter(startLocation.line + 1) + nextLine)
    }

    return output.join('\n')
  }

  constructor(
    message: string,
    offset: number,
    source?: string,
    filePath?: string
  ) {
    super(ParserError.#buildMessage(message, offset, source, filePath))
    this.#rawMessage = message
    this.#source = source
    this.#offset = offset
  }

  get rawMessage(): string { return this.#rawMessage }
  get source(): string | undefined { return this.#source }
  get offset(): number { return this.#offset }
}

export class BreakSignal {}
export class ContinueSignal {}