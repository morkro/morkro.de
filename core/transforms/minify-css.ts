import { maskBlockComments } from '#utils/css.ts';

const getRawToken = (id: number) => `<?--RAW:${String(id)}--?>`
const openQuoteRegex = /['"]/g

function readQuoteString (css: string, start: number) {
  const quote = css[start]

  for (let index = start + 1; index < css.length; index++) {
    const char = css[index]
    if (char === '\\') {
      index++
      continue
    }

    if (char === quote) {
      return index + 1
    }
  }

  return -1
}

function protectRawBlocks (css: string) {
  const slices: string[] = []
  let cursor = 0
  let source = ''

  while (cursor < css.length) {
    openQuoteRegex.lastIndex = cursor
    const openQuoteMatch = openQuoteRegex.exec(css)
    if (!openQuoteMatch) {
      source += css.slice(cursor)
      break
    }

    const quoteStart = openQuoteMatch.index
    source += css.slice(cursor, quoteStart)
    
    const quoteEnd = readQuoteString(css, quoteStart)
    if (quoteEnd === -1) {
      source += css.slice(cursor)
      break
    }

    const token = getRawToken(slices.length)
    slices.push(css.slice(quoteStart, quoteEnd))
    source += token
    cursor = quoteEnd
  }

  return {
    slices,
    withoutRawBlocks: source
  }
}

function restoreRawBlocks (css: string, slices): string {
  let result = css
	for (let index = slices.length - 1; index >= 0; index--) {
		const token = getRawToken(index)
    // String replacement with function to avoid regex backtracking
		result = result.replaceAll(token, () => slices[index])
	}
	return result
}

function removeWhitespace (css: string): string {
  return css
    .replaceAll(/\s+/g, ' ') // collapse all whitespace into a single space
    .replaceAll(/\s*{\s*/g, '{') // remove whitespace before opening brace
    .replaceAll(/\s*}\s*/g, '}') // remove whitespace after closing brace
    .replaceAll(/\s*:\s*/g, ':') // remove whitespace after colon
    .replaceAll(/\s*,\s*/g, ',') // remove whitespace after comma
    .replaceAll(/\s*;\s*/g, ';') // remove whitespace after semicolon
}

export function minifyCss (css: string): string {
  const maskedCss = maskBlockComments(css)
  const { withoutRawBlocks, slices } = protectRawBlocks(maskedCss)
  const collapsed = removeWhitespace(withoutRawBlocks)
  return restoreRawBlocks(collapsed, slices)
}