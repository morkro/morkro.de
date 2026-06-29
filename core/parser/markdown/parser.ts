import { ParserError } from '#parser/utils.ts'
import { tokenize } from './tokenizer.ts'
import type { Template } from './types.ts'
import { isWhitespace, scanLinkDest, scanLinkText, scanLinkTitle } from './utils.ts'

type ParseContext = {
  readonly source: string
  readonly filePath: string
}

export function parseMarkdown(input: string, sourcePath: string): Template {
  const ctx: ParseContext = { source: input, filePath: sourcePath }
  try {
    return {
      type: 'Template',
      meta: { source: ctx.filePath },
      body: tokenize(input)
    }
  } catch (error) {
    if (error instanceof ParserError && !error.source) {
      throw new ParserError(error.rawMessage, error.offset, ctx.source, ctx.filePath)
    }
    throw error
  }
}

export type ParsedLink = {
  readonly full: string
  readonly text: string
  readonly url: string
  readonly title: string
  readonly after: number
}

export function parseLink (text: string, index: number, isImage: boolean): ParsedLink | null {
  let _index = index

  if (isImage) {
    if (text[_index] !== '!') return null
    _index++
  }

  const textResult = scanLinkText(text, _index)
  if (!textResult) return null
  _index = textResult.after

  if (text[_index] !== '(') return null
  _index++

  while (_index < text.length && isWhitespace(text[_index])) _index++

  const destResult = scanLinkDest(text, _index)
  if (!destResult) return null
  _index = destResult.after

  let title = ''
  const beforeWhitespace = _index
  while (_index < text.length && isWhitespace(text[_index])) _index++

  if (text[_index] === '"' || text[_index] === '\'' || text[_index] === '(') {
    // CommonMark requires a title if the link is not empty
    if (_index === beforeWhitespace) return null
    const titleResult = scanLinkTitle(text, _index)
    if (!titleResult) return null
    
    title = titleResult.value
    _index = titleResult.after

    while (_index < text.length && isWhitespace(text[_index])) _index++
  }

  if (text[_index] !== ')') return null

  return {
    full: text.slice(index, _index + 1),
    text: textResult.value,
    url: destResult.value,
    title,
    after: _index + 1
  }
}