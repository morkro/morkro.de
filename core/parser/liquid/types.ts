/**
 * Expressions
 */
export type ExpressionVar = { type: 'Var', path: string[] }
export type ExpressionLiteral = { type: 'Literal', value: string | number }
export type ExpressionBinary = {
  type: 'Binary',
  left: Expression,
  right: Expression,
  operator: TokenOperator['value']
}
export type ExpressionRange = {
  type: 'Range',
  from: Expression,
  to: Expression,
}

export type Expression =
  | ExpressionVar
  | ExpressionLiteral
  | ExpressionBinary
  | ExpressionRange

/**
 * Nodes
 */
type ForParamLimit = { type: 'limit', value: number }
type ForParamOffset = { type: 'offset', value: number }
type ForParamReversed = { type: 'reversed' }
export type NodeForParams = ForParamLimit | ForParamOffset | ForParamReversed

export type NodeVariable = { name: string, expression: Expression }
export type NodeText = { type: 'Text', value: string }
export type NodeOutput = { type: 'Output', expression: Expression }
export type NodeAssign = { type: 'Assign' } & NodeVariable
export type NodeRender = { type: 'Render', file: string, variables: NodeVariable[] }
export type NodeIf = { type: 'If', condition: Expression , body: Node[], elseBody?: Node[], negated?: boolean }
export type NodeFor = { type: 'For', variable: string, collection: Expression, body: Node[], elseBody?: Node[], params?: NodeForParams[] }
export type NodeForBreak = { type: 'ForBreak' }
export type NodeForContinue = { type: 'ForContinue' }

export type Node =
  | NodeText
  | NodeOutput
  | NodeAssign
  | NodeRender
  | NodeIf
  | NodeFor
  | NodeForBreak
  | NodeForContinue

/** For loop context object */
export type ForLoopContext = {
  index: number
  index0: number
  rindex: number
  rindex0: number
  first: boolean
  last: boolean
  length: number
}
  /**
* Tokens
*/
export const TokenKeywordValues = [
  'assign',
  'if',
  'else',
  'elsif',
  'unless',
  'endunless',
  'endif',
  'render',
  'for',
  'endfor',
  'in',
  'break',
  'continue',
] as const

export const TokenOperatorValues = [
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'and',
  'or',
  'contains',
] as const

export const TokenPunctValues = [
  '.',
  ':',
  ',',
  '=',
  '|',
  '(',
  ')',
  '..',
] as const

export type TokenText = { type: 'Text', value: string, start: number, end: number }
export type TokenTag = { type: 'Tag', value: string, start: number, end: number, innerStart: number }
export type TokenOutput = { type: 'Output', value: string, start: number, end: number, innerStart: number }

export type Token =
  | TokenText
  | TokenTag
  | TokenOutput

export type TokenIdent = { type: 'Ident', value: string, start: number, end: number }
export type TokenNumber = { type: 'Number', value: number, start: number, end: number }
export type TokenString = { type: 'String', value: string, start: number, end: number }
export type TokenPunct = { type: 'Punct', value: typeof TokenPunctValues[number], start: number, end: number }
export type TokenOperator = { type: 'Operator', value: typeof TokenOperatorValues[number], start: number, end: number }
export type TokenKeyword = { type: 'Keyword', value: typeof TokenKeywordValues[number], start: number, end: number }
export type TokenEOF = { type: 'EOF' , start: number, end: number }
  
export type InnerToken =
  | TokenIdent
  | TokenNumber
  | TokenString
  | TokenPunct
  | TokenOperator
  | TokenKeyword
  | TokenEOF

/**
 * Template
 */
export type Template = {
  type: 'Template',
  meta: {
    source: string
  }
  body: Node[]
}