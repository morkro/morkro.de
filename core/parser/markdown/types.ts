/**
 * Tokens
 */
type TokenHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type TokenHeading = {
  type: 'Heading',
  level: TokenHeadingLevel,
  text: string,
  start: number,
  end: number
}

export type TokenParagraph = {
  type: 'Paragraph',
  text: string,
  start: number,
  end: number
}

export type TokenLink = {
  type: 'Link',
  text: string,
  url: string,
  start: number,
  end: number
}

export type TokenImage = {
  type: 'Image',
  text: string,
  src: string,
  alt: string,
  start: number,
  end: number
}

export type TokenBreak = {
  type: 'Break',
  start: number,
  end: number
}

export type TokenLine = {
  type: 'Line',
  start: number,
  end: number
}

export type TokenCheckbox = {
  type: 'Checkbox',
  text: string,
  checked: boolean,
  start: number,
  end: number
}

export type TokenCode = {
  type: 'Code',
  text: string,
  language: string,
  start: number,
  end: number
}

export type TokenBlockquote = {
  type: 'Blockquote',
  text: string,
  start: number,
  end: number
}

export type TokenList = {
  type: 'List',
  kind: 'Ordered' | 'Unordered',
  items: TokenListItem[],
  start: number,
  end: number
}

export type TokenListItem = {
  type: 'ListItem',
  text: string,
  start: number,
  end: number
}

type TableAlign = 'left' | 'center' | 'right' | null

export type TokenTable = {
  type: 'Table',
  headers: TokenTableCell[],
  rows: TokenTableCell[][],
  align: TableAlign[],
  start: number,
  end: number
}

export type TokenTableCell = {
  type: 'TableCell',
  header: boolean,
  text: string,
  align: TableAlign,
  start: number,
  end: number
}

export type Token =
  | TokenHeading
  | TokenParagraph
  | TokenLink
  | TokenImage
  | TokenBreak
  | TokenLine
  | TokenCheckbox
  | TokenCode
  | TokenBlockquote
  | TokenList
  | TokenListItem
  | TokenTable
  | TokenTableCell

/**
 * Template
 */
type TemplateMeta = {
  source: string
}

export type Template = {
  type: 'Template',
  meta: TemplateMeta
  body: Token[]
}