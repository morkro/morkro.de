import { ParserError } from '#parser/utils.ts'
import { tokenize } from './tokenizer.ts'
import type { Template } from './types.ts'

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