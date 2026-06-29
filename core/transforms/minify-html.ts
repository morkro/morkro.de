const getRawToken = (id: number) => `<?--RAW:${String(id)}--?>`
const openTagRegex = /<(script|style|pre|textarea)\b/gi

type RawSlice = {
  type: 'script' | 'style' | 'pre' | 'textarea'
  text: string
}

function protectRawBlocks (html: string) {
  const slices: RawSlice[] = []
  let cursor = 0
  let source = ''

  while (cursor < html.length) {
    openTagRegex.lastIndex = cursor
    const openTagMatch = openTagRegex.exec(html)
    if (!openTagMatch) {
      source += html.slice(cursor)
      break
    }

    const tagStart = openTagMatch.index
    source += html.slice(cursor, tagStart)

    const type = openTagMatch[1] as RawSlice['type']
    const tagEnd = indexClosingTag(html, tagStart)
    if (tagEnd === -1) {
      source += html.slice(tagStart)
      break
    }

    const closeRe = new RegExp(`</\\s*${type}\\s*>`, 'gi')
    closeRe.lastIndex = tagEnd + 1
    const closeTagMatch = closeRe.exec(html)
    if (!closeTagMatch) {
      source += html.slice(tagStart)
      break
    }

    const blockEnd = closeTagMatch.index + closeTagMatch[0].length
    const token = getRawToken(slices.length)
    slices.push({
      type,
      text: html.slice(tagStart, blockEnd)
    })
    // replace the entire raw block with the token
    source += token
    cursor = blockEnd
  }

  return {
    slices,
    withoutRawBlocks: source
  }
}

function restoreRawBlocks (html: string, slices: RawSlice[]) {
  let result = html
	for (let index = slices.length - 1; index >= 0; index--) {
		const token = getRawToken(index)
    // String replacement with function to avoid regex backtracking
		result = result.replaceAll(token, () => slices[index].text)
	}
	return result
}

function indexClosingTag (html: string, index: number) {
  let quote: '"' | "'" | null = null
	for (let i = index + 1; i < html.length; i++) {
		const char = html[i]
		if (quote) {
			if (char === quote) quote = null
			continue
		}
		if (char === '"' || char === "'") {
			quote = char
			continue
		}
		if (char === '>') return i
	}
	return -1
}

function stripHtmlComments (html: string) {
  let result = ''
  let cursor = 0

  while (cursor < html.length) {
    const start = html.indexOf('<!--', cursor)
    if (start === -1) {
      result += html.slice(cursor)
      break
    }

    result += html.slice(cursor, start)

    const end = html.indexOf('-->', start + 4)
    if (end === -1) {
      result += html.slice(cursor)
      break
    }

    cursor = end + 3
  }

  return result
}

function removeWhitespace (html: string): string {
  return html
    // remove all whitespace between tags
    .replaceAll(/>\s+</g, '><')
    // remove whitespace before closing tag
    .replaceAll(/\s+\/>/g, '/>')
}

export function minifyHtml (html: string): string {
  const { withoutRawBlocks, slices } = protectRawBlocks(html)
  return restoreRawBlocks(
    removeWhitespace(
      stripHtmlComments(
        withoutRawBlocks.trim())), slices)
}