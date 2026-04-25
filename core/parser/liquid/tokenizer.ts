import { ParserError, getIndentWidth } from '#parser/utils.ts'
import {
  type InnerToken,
  type Token,
  TokenKeywordValues,
  type TokenOperator,
  type TokenPunct,
  type TokenText
} from './types.ts'

export type Cursor = {
  readonly input: string
  readonly index: number
}

export const createCursor = (input: string): Cursor => ({ input, index: 0})
const isAlpha = (input: string) => /[A-Za-z_]/.test(input)
const isAlnum = (input: string) => /[A-Za-z0-9_]/.test(input)
const isDigit = (input: string) => /[0-9]/.test(input)
const keywords = new Set(TokenKeywordValues)
const logicalOperators = new Set(['and', 'or', 'contains', 'not'])

function pushText (value: string, start: number, end: number): TokenText | undefined {
  if (value.length > 0) {
    return { type: 'Text', value, start, end }
  }
  return undefined
}

type EndrawMatch = {
  openIndex: number
  closeIndex: number
  trimLeft: boolean
  trimRight: boolean
}

function findEndrawTag(input: string, fromIndex: number): EndrawMatch {
	let index = fromIndex
	while (index < input.length) {
		const open = input.indexOf('{%', index)
		if (open === -1) {
			throw new ParserError('Unclosed raw block', fromIndex)
		}

		const close = input.indexOf('%}', open + 2)
		if (close === -1) {
			throw new ParserError('Unclosed tag inside raw search', fromIndex)
		}

    const trimLeft = input[open + 2] === '-'
    const trimRight = input[close - 1] === '-'
    const innerStart = open + 2 + (trimLeft ? 1 : 0)
    const innerEnd = trimRight ? close - 1 : close
		const tagInner = input.slice(innerStart, innerEnd).trim()

		if (tagInner === 'endraw') {
			return { openIndex: open, closeIndex: close + 2, trimLeft, trimRight }
		}

		index = close + 2
	}

	throw new ParserError('Unclosed raw block', fromIndex)
}

export function tokenizeInner (input: string, baseOffset = 0): InnerToken[] {
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
      const start = index
      index++

      while (index < input.length && (isAlnum(peek(index)) || (peek(index) === '-' && isAlnum(peek(index + 1))))) {
        index++
      }

      const value = input.slice(start, index)
      if (keywords.has(value as typeof TokenKeywordValues[number])) {
        tokens.push({
          type: 'Keyword',
          value: value as typeof TokenKeywordValues[number],
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (logicalOperators.has(value)) {
        tokens.push({
          type: 'Operator',
          value: value as TokenOperator['value'],
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else {
        tokens.push({
          type: 'Ident',
          value,
          start: baseOffset + start,
          end: baseOffset + index
        })
      }

      continue
    }

    if (isDigit(peek(index))) {
      const start = index
      index++

      while (index < input.length && isDigit(peek(index))) {
        index++
      }

      if (peek(index) === '.' && peek(index + 1) !== '.') {
        index++
        while (index < input.length && isDigit(peek(index))) {
          index++
        }
      }

      tokens.push({
        type: 'Number',
        value: Number(input.slice(start, index)),
        start: baseOffset + start,
        end: baseOffset + index
      })
      continue
    }

    if ('<>'.includes(peek(index)) || ('=!'.includes(peek(index)) && peek(index + 1) === '=')) {
      const start = index
      index++

      if (peek(start) === '=' && peek(index) === '=') {
        index++
        tokens.push({
          type: 'Operator',
          value: '==',
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (peek(start) === '!' && peek(index) === '=') {
        index++
        tokens.push({
          type: 'Operator',
          value: '!=',
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (peek(start) === '>' && peek(index) === '=') {
        index++
        tokens.push({
          type: 'Operator',
          value: '>=',
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (peek(start) === '<' && peek(index) === '=') {
        index++
        tokens.push({
          type: 'Operator',
          value: '<=',
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (peek(start) === '>' && peek(index) !== '=') {
        tokens.push({
          type: 'Operator',
          value: '>',
          start: baseOffset + start,
          end: baseOffset + index
        })
      } else if (peek(start) === '<' && peek(index) !== '=') {
        tokens.push({
          type: 'Operator',
          value: '<',
          start: baseOffset + start,
          end: baseOffset + index
        })
      }

      continue
    }

    if (`"'`.includes(peek(index))) {
      const quote = peek(index)
      const start = index
      index++
      let output = ''
      let terminated = false

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
          tokens.push({
            type: 'String',
            value: output,
            start: baseOffset + start,
            end: baseOffset + index
          })
          terminated = true
          break
        }

        output += cursor
        index++
      }

      if (!terminated) {
        throw new ParserError('Unclosed string literal', baseOffset + index)
      }
      continue
    }

    if ('+-*/'.includes(peek(index))) {
      tokens.push({
        type: 'Operator',
        value: peek(index) as TokenOperator['value'],
        start: baseOffset + index,
        end: baseOffset + index + 1
      })
      index++
      continue
    }

    if ('.:,=|()[]'.includes(peek(index))) {
      if (peek(index) === '.' && peek(index + 1) === '.') {
        tokens.push({
          type: 'Punct',
          value: '..',
          start: baseOffset + index,
          end: baseOffset + index + 2
        })
        index += 2
        continue
      }

      tokens.push({
        type: 'Punct',
        value: peek(index) as TokenPunct["value"],
        start: baseOffset + index,
        end: baseOffset + index + 1
      })
      index++ 
      continue
    }

    throw new ParserError(
      `Unexpected character "${peek(index)}" in inner tokenization.`, 
      baseOffset + index,
    )
  }

  tokens.push({ type: 'EOF', start: baseOffset + index, end: baseOffset + index })

  return tokens
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let cursor: Cursor = createCursor(input)
  let trimNextText = false
  
  const pushTextSlice = (value: string, start: number, end: number) => {
    let trimmed = value
    if (trimNextText) {
      trimmed = trimmed.replace(/^\s+/, '')
      trimNextText = false
    }
    const text = pushText(trimmed, start, end)
    if (text) {
      tokens.push(text)
    }
  }

  const trimPrevText = () => {
    const last = tokens[tokens.length - 1]
    if (!last || last.type !== 'Text') return

    const trimmed = last.value.replace(/\s+$/, '')
    if (trimmed.length === 0) {
      tokens.pop()
    } else {
      tokens[tokens.length - 1] = { ...last, value: trimmed }
    }
  }

  while (cursor.index < input.length) {
    const nextOutput = input.indexOf('{{', cursor.index)
    const nextTag = input.indexOf('{%', cursor.index)

    // Get the next token index, preferring output over tag
    const next = nextOutput === -1
      ? nextTag
      : nextTag === -1
        ? nextOutput
        : Math.min(nextOutput, nextTag)

    if (next === -1) {
      pushTextSlice(input.slice(cursor.index), cursor.index, input.length)
      break
    }

    pushTextSlice(input.slice(cursor.index, next), cursor.index, next)
    cursor = { input, index: next }

    if (input.startsWith("{{", cursor.index)) {
      const start = cursor.index
      const trimLeft = input[start + 2] === '-'
      const innerOffsetStart = start + 2 + (trimLeft ? 1 : 0)
      cursor = { input, index: innerOffsetStart }

      const end = input.indexOf("}}", cursor.index)
      if (end === -1) {
        throw new ParserError('Unclosed output', start)
      }

      const trimRight = input[end - 1] === '-'
      const innerEnd = trimRight ? end - 1 : end
      const inner = input.slice(cursor.index, innerEnd)

      if (trimLeft) trimPrevText()

      tokens.push({
        type: 'Output',
        value: inner.trim(),
        start,
        end: end + 2,
        innerStart: cursor.index + getIndentWidth(inner),
      })

      if (trimRight) trimNextText = true
      cursor = { input, index: end + 2 }

      continue
    }

    if (input.startsWith('{%', cursor.index)) {
      const start = cursor.index
      const trimLeft = input[start + 2] === '-'
      const innerOffsetStart = start + 2 + (trimLeft ? 1 : 0)
      cursor = { input, index: innerOffsetStart }
      
      const end = input.indexOf('%}', cursor.index)
      if (end === -1) {
        throw new ParserError('Unclosed tag', start)
      }
      
      const trimRight = input[end - 1] === '-'
      const innerEnd = trimRight ? end - 1 : end
      const inner = input.slice(cursor.index, innerEnd)
      if (inner.includes('{%') || inner.includes('{{')) {
        throw new ParserError('Unclosed tag', start)
      }

      if (trimLeft) trimPrevText()

      if (inner.trim() === 'raw') {
        const afterOpenTag = end + 2
        const endrawMatch = findEndrawTag(input, afterOpenTag)
        let literal = input.slice(afterOpenTag, endrawMatch.openIndex)
        if (trimRight) literal = literal.replace(/^\s+/, '')
        if (endrawMatch.trimLeft) literal = literal.replace(/\s+$/, '')
        
        tokens.push({
          type: 'Tag',
          value: 'raw',
          start,
          end: afterOpenTag,
          innerStart: cursor.index + getIndentWidth(inner),
        })
        tokens.push({
          type: 'Text',
          value: literal,
          start: afterOpenTag,
          end: endrawMatch.openIndex,
        })
        tokens.push({
          type: 'Tag',
          value: 'endraw',
          start: endrawMatch.openIndex,
          end: endrawMatch.closeIndex,
          innerStart: endrawMatch.openIndex + 2,
        })

        if (endrawMatch.trimRight) trimNextText = true
        cursor = { input, index: endrawMatch.closeIndex }

        continue
      }
      
      // Ignore Liquid comments
      if (inner.startsWith('#')) {
        if (trimRight) trimNextText = true
        cursor = { input, index: end + 2 }
        continue
      }
      
      tokens.push({
        type: 'Tag',
        value: inner.trim(),
        start,
        end: end + 2,
        innerStart: cursor.index + getIndentWidth(inner),
      })

      if (trimRight) trimNextText = true
      cursor = { input, index: end + 2 }
    } 
  }

  return tokens
}