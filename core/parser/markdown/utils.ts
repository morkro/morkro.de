export function isAsciiPunct (char: string): boolean {
  return /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(char)
}

export function matchSticky (regex: RegExp, text: string, index: number): RegExpExecArray | null {
  regex.lastIndex = index
  return regex.exec(text)
}

export function escapeHtmlContent (html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function isWhitespace (char: string): boolean {
  return /\s/.test(char)
}

/**
 * Markdown autolink helper
 */
type ScanResult<T> = { value: T, after: number } | null

export function scanLinkText (text: string, index: number): ScanResult<string> {
  if (text[index] !== '[') return null

  const start = index + 1
  let scanDepth = 1
  let _index = start

  while (_index < text.length) {
    const char = text[_index]

    if (char === '\\' && _index + 1 < text.length && isAsciiPunct(text[_index + 1])) {
      _index += 2
      continue
    }

    if (char === '[') scanDepth++
    else if (char === ']') {
      scanDepth--
      if (scanDepth === 0) {
        return {
          value: text.slice(start, _index),
          after: _index + 1
        }
      }
    }

    _index++
  }

  return null
}

export function scanLinkDest (text: string, index: number): ScanResult<string> {
  let url = ''
  let _index = index

  if (text[index] === '<') {
    _index = index + 1

    while (_index < text.length) {
      const char = text[_index]

      if (char === '\\' && _index + 1 < text.length && isAsciiPunct(text[index + 1])) {
        url += text[_index + 1]
        _index += 2
        continue
      }

      if (char === '>') {
        return { value: url, after: _index +1 }
      }

      if (char === '<' || char === '\n') {
        return null
      }

      url += char
      _index++
    }
    
    return null
  }

  let scanDepth = 0
  url = ''

  while (_index < text.length) {
    const char = text[_index]

    if (char === '\\' && _index + 1 < text.length && isAsciiPunct(text[_index + 1])) {
      url += text[_index + 1]
      _index += 2
      continue
    }

    if (char === '(') {
      scanDepth++
      url += char
      _index++
      continue
    }
    
    if (char === ')') {
      if (scanDepth === 0) break
      scanDepth--
      url += char
      _index++
      continue
    }

    if (isWhitespace(char)) break

    url += char
    _index++
  }

  if (url.length === 0) return null

  return { value: url, after: _index }
}

export function scanLinkTitle (text: string, index: number): ScanResult<string> {
  const opener = text[index]
  if (opener !== '"' && opener !== '\'' && opener !== '(') return null

  const closer = opener === '(' ? ')' : opener
  let _index = index + 1
  let title = ''

  while (_index < text.length) {
    const char = text[_index]

    if (char === '\\' && _index + 1 < text.length && isAsciiPunct(text[_index + 1])) {
      title += text[_index + 1]
      _index += 2
      continue
    }

    if (char === closer) {
      return { value: title, after: _index + 1}
    }

    title += char
    _index++
  }

  return null
}

/**
 * y flag is used to enable sticky matching
 * d flag is used to enable dotall matching
 */
export const headingRegex = /^(#{1,6})\s+(.*)$/d
export const unorderedRegex = /^( *)([*+-])\s+(.*)$/
export const orderedRegex = /^( *)(\d+)\.\s+(.*)$/
export const checkboxRegex = /^\[( |x|X)\]\s+(.*)$/
export const blockquoteRegex = /^>\s?/
export const tableSeparatorCellRegex = /^:?-+:?$/
export const inlineBreakRegex = / {2}\n/y
export const inlineCodeRegex = /`([^`\n]+)`/y
export const boldStarRegex = /\*\*([\s\S]+?)\*\*/y
export const boldUnderscoreRegex = /__([\s\S]+?)__/y
export const italicStarRegex = /\*([\s\S]+?)\*/y
export const italicUnderscoreRegex = /_([\s\S]+?)_/y
export const strikethroughRegex = /~~([\s\S]+?)~~/y
export const namedEntityRegex = /&[a-zA-Z][a-zA-Z0-9]{1,30};/y
export const decimalEntityRegex = /&#[0-9]{1,7};/y
export const hexEntityRegex = /&#[xX][0-9a-fA-F]{1,6};/y
/**
 * `[a-zA-Z][a-zA-Z0-9+.-]{1,31}` gives a 2-32 char scheme.
 * Examples it matches: http, https, mailto, tel, git+ssh, chrome-extension.
 * 
 * `[^\s<>]*` for the URL body. Whitespace, <, > are not allowed.
 */
export const autolinkUriRegex = /<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*)>/y

/**
 * Taken from CommonMark spec: https://spec.commonmark.org/0.30/#email-address
 * 
 * `[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+` gives a 6-32 char local part.
 * Examples it matches: user@example.com, user+tag@example.com.
 * 
 * `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*` gives a 1-63 char domain.
 * Examples it matches: example.com, example.com.uk, example.com.uk.
 */
export const autolinkEmailRegex =
  /<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/y