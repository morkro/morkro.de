import { ParserError } from '#parser/utils.ts'
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

export type CursorState = {
  readonly tokens: InnerToken[]
  readonly index: number
}

export const current = (cursor: CursorState) => {
  const token = cursor.tokens[cursor.index]
  if (!token) {
    throw new ParserError(
      'Expected token but got EOF',
      cursor.tokens[cursor.index - 1]?.end ?? 0
    )
  }
  return token
}

export const next = (cursor: CursorState): CursorState => ({
  tokens: cursor.tokens,
  index: cursor.index + 1
})