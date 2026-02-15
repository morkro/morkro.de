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
