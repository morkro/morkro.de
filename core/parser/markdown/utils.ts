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
export const inlineImageRegex = /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/y
export const inlineLinkRegex = /\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/y
export const inlineBreakRegex = /  \n/y
export const inlineCodeRegex = /`([^`\n]+)`/y
export const boldStarRegex = /\*\*([\s\S]+?)\*\*/y
export const boldUnderscoreRegex = /__([\s\S]+?)__/y
export const italicStarRegex = /\*([\s\S]+?)\*/y
export const italicUnderscoreRegex = /_([\s\S]+?)_/y
export const strikethroughRegex = /~~([\s\S]+?)~~/y
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