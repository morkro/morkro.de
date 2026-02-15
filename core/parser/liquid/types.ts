type ExpressionVar = { type: 'Var', path: string[] }
type ExpressionLiteral = { type: 'Literal', value: string | number }

export type Expression =
  | ExpressionVar
  | ExpressionLiteral

type NodeText = { type: 'Text', value: string }
type NodeOutput = { type: 'Output', expression: Expression }
type NodeAssign = { type: 'Assign', name: string, expression: Expression }
type NodeRender = { type: 'Render', file: string, variables: { name: string, expression: Expression }[] }
type NodeIf = { type: 'If', condition: Expression , body: Node[], elseBody?: Node[] }

export type Node =
 | NodeText
 | NodeOutput
 | NodeAssign
 | NodeRender
 | NodeIf

export type Template = {
  type: 'Template',
  body: Node[]
}

export const TokenKeywordValues = [
  'assign',
  'if',
  'else',
  'endif',
  'render',
  'for',
  'endfor',
  'in',
] as const

export type TokenText = { type: 'Text', value: string, start: number, end: number }
type TokenTag = { type: 'Tag', value: string, start: number, end: number }
type TokenOutput = { type: 'Output', value: string, start: number, end: number }
export type TokenIdent = { type: 'Ident', value: string }
type TokenNumber = { type: 'Number', value: number }
type TokenString = { type: 'String', value: string }
export type TokenPunct = { type: 'Punct', value: '.' | ':' | ',' | '=' | '|' | '(' | ')' }
export type TokenKeyword = { type: 'Keyword', value: typeof TokenKeywordValues[number] }
type TokenEOF = { type: 'EOF' }

export type Token =
  | TokenText
  | TokenTag
  | TokenOutput
  
export type InnerToken =
  | TokenIdent
  | TokenNumber
  | TokenString
  | TokenPunct
  | TokenKeyword
  | TokenEOF