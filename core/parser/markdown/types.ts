/**
 * Tokens
 */
export type TokenHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type TokenHeading = {
  type: 'Heading',
  level: TokenHeadingLevel,
  inline: InlineToken[],
  start: number,
  end: number
}

export type TokenText = {
  type: 'Text',
  text: string,
  start: number,
  end: number
}

export type TokenParagraph = {
  type: 'Paragraph',
  inline: InlineToken[],
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
  items: (TokenListItem | TokenCheckbox)[],
  start: number,
  end: number
}

export type TokenListItem = {
  type: 'ListItem',
  children?: TokenList[],
  text: string,
  start: number,
  end: number
}

export type TokenCheckbox = {
  type: 'Checkbox',
  text: string,
  children?: TokenList[],
  checked: boolean,
  start: number,
  end: number
}

export type TableAlign = 'left' | 'center' | 'right' | null

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

export type InlineToken =
  | TokenText
  | TokenLink
  | TokenImage
  | TokenBreak

export type BlockToken =
  | TokenHeading
  | TokenParagraph
  | TokenLine
  | TokenCode
  | TokenBlockquote
  | TokenList
  | TokenTable

export type Token = InlineToken | BlockToken

/**
 * Template
 */
type TemplateMeta = {
  source: string
}

export type Template = {
  type: 'Template',
  meta: TemplateMeta
  body: BlockToken[]
}