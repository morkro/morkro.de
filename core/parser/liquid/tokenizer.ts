import { logParser as log } from '#utils/log.ts'
import {
  type TokenText,
  type InnerToken,
  type Token,
  type TokenPunct,
  TokenKeywordValues
} from './types.ts'
import { ParserError } from './utils.ts'

export type Cursor = {
  readonly input: string
  readonly index: number
}

export const createCursor = (input: string): Cursor => ({ input, index: 0})
export const isAlpha = (input: string) => /[A-Za-z_-]/.test(input)
export const isAlnum = (input: string) => /[A-Za-z0-9_-]/.test(input)
export const isDigit = (input: string) => /[0-9]/.test(input)

const keywords = new Set(TokenKeywordValues)

function pushText (value: string, start: number, end: number): TokenText | undefined {
  if (value.length > 0) {
    return { type: 'Text', value, start, end }
  } else return undefined
}

export function tokenizeInner (input: string): InnerToken[] {
  const tokens: InnerToken[] = []
  const peek = (index: number) => input[index]
  let index = 0

  while (index < input.length) {
    // Skipping whitespace
    while (index < input.length && /\s/.test(peek(index))) {
      index++
    }
    
    if (index >= input.length) break

    if (isAlpha(peek(index))) {
      let start = index
      index++

      while (index < input.length && isAlnum(peek(index))) {
        index++
      }

      const value = input.slice(start, index)
      if (keywords.has(value as typeof TokenKeywordValues[number])) {
        tokens.push({ type: 'Keyword', value: value as typeof TokenKeywordValues[number] })
      } else {
        tokens.push({ type: 'Ident', value })
      }

      continue
    }

    if (isDigit(peek(index))) {
      let start = index
      index++

      while (index < input.length && isDigit(peek(index))) {
        index++
      }

      if (peek(index) === '.') {
        index++
        while (index < input.length && isDigit(peek(index))) {
          index++
        }
      }

      tokens.push({
        type: 'Number',
        value: Number(input.slice(start, index))
      })
      continue
    }

    if (`"'`.includes(peek(index))) {
      const quote = peek(index)
      index++
      let output = ''
      let escaped = false

      while (index < input.length) {
        const cursor = peek(index)

        if (cursor === '\\') {
          const next = peek(index + 1)
          if (next === undefined) break
          if (next === 'n') {
            output += '\n'
          } else if (next === 't') {
            output += '\t'
          } else {
            output += next
          }
          index += 2
          continue
        }

        if (cursor === quote) {
          index++
          tokens.push({ type: 'String', value: output })
          escaped = true
          break
        }

        output += cursor
        index++
      }

      if (!escaped) {
        log('Unclosed string literal', { lvl: 'error' })
      }
      continue
    }

    if ('.:,=|()'.includes(peek(index))) {
      tokens.push({ type: 'Punct', value: peek(index) as TokenPunct["value"] })
      index++
      continue
    }

    throw new ParserError(`Unexpected character "${peek(index)}" in inner tokenization.`, index)
  }

  tokens.push({ type: 'EOF' })

  return tokens
}

export function tokenize(input: string): Token[] {
  let cursor: Cursor = createCursor(input)
  const tokens: Token[] = []
  
  while (cursor.index < input.length) {
    const nextOutput = input.indexOf('{{', cursor.index)
    const nextTag = input.indexOf('{%', cursor.index)

    const next = [nextOutput, nextTag]
      .filter(x => x !== -1)
      .sort((a,b) => a - b)[0]

    if (next === undefined) {
      const text = pushText(input.slice(cursor.index), cursor.index, input.length)
      if (text) {
        tokens.push(text)
      }
      break
    }

    const text = pushText(input.slice(cursor.index, next), cursor.index, next)
    if (text) {
      tokens.push(text)
    }
    cursor = { input, index: next }

    if (input.startsWith("{{", cursor.index)) {
      const start = cursor.index
      cursor = { input, index: start + 2 }

      const end = input.indexOf("}}", cursor.index)
      if (end === -1) {
        throw new ParserError(`Unclosed output`, start)
      }

      const inner = input.slice(cursor.index, end)
      tokens.push({ type: 'Output', value: inner.trim(), start, end: end + 2 })
      cursor = { input, index: end + 2 }

      continue
    }

    if (input.startsWith('{%', cursor.index)) {
      const start = cursor.index
      cursor = { input, index: start + 2 }

      const end = input.indexOf('%}', cursor.index)
      if (end === -1) {
        throw new ParserError(`Unclosed tag`, start)
      }

      const inner = input.slice(cursor.index, end)

      // Ignore Liquid comments
      if (inner.startsWith('#')) {
        cursor = { input, index: end + 2 }
        continue
      }
      
      tokens.push({ type: 'Tag', value: inner.trim(), start, end: end + 2 })
      cursor = { input, index: end + 2 }
      
      continue
    } 
  }

  return tokens
}