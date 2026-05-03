/**
 * Filters
 */
export type FilterArg = Expression

export type Filter = {
  name: string
  args: FilterArg[]
}

export type ExpressionFilter = {
  type: 'Filter',
  input: Expression,
  filters: Filter[],
}

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
export type ExpressionAccess = {
  type: 'Access',
  object: Expression,
  key: Expression,
}
export type ExpressionUnary = {
  type: 'Unary',
  operator: 'not' | '-',
  operand: Expression,
}

export type Expression =
  | ExpressionVar
  | ExpressionLiteral
  | ExpressionBinary
  | ExpressionRange
  | ExpressionAccess
  | ExpressionUnary
  | ExpressionFilter

/**
 * Nodes
 */
type HeaderParamLimit = { type: 'limit', value: number }
type HeaderParamOffset = { type: 'offset', value: number }
type HeaderParamReversed = { type: 'reversed' }
type HeaderParamCols = { type: 'cols', value: number }
export type NodeForParams = HeaderParamLimit | HeaderParamOffset | HeaderParamReversed
export type NodeTableRowParams = HeaderParamLimit | HeaderParamOffset | HeaderParamCols

export type NodeVariable = { name: string, expression: Expression }
export type NodeText = { type: 'Text', value: string }
export type NodeOutput = { type: 'Output', expression: Expression }
export type NodeAssign = { type: 'Assign' } & NodeVariable
export type NodeRender = { type: 'Render', file: string, variables: NodeVariable[] }
export type NodeIf = { type: 'If', condition: Expression , body: Node[], elseBody?: Node[], negated?: boolean }
export type NodeFor = { type: 'For', variable: string, collection: Expression, body: Node[], elseBody?: Node[], params?: NodeForParams[] }
export type NodeForBreak = { type: 'ForBreak' }
export type NodeForContinue = { type: 'ForContinue' }
export type NodeCapture = { type: 'Capture', name: string, body: Node[] }
export type NodeComment = { type: 'Comment', body: Node[] }
export type NodeCaseWhen = { values: Expression[], body: Node[] }
export type NodeCase = { type: 'Case', subject: Expression, whens: NodeCaseWhen[], elseBody?: Node[] }
export type NodeRaw = { type: 'Raw', body: Node[] }
export type NodeEcho = { type: 'Echo', expression: Expression }
export type NodeIncrement = { type: 'Increment', variable: string }
export type NodeDecrement = { type: 'Decrement', variable: string }
export type NodeShortCode = { type: 'ShortCode', name: string }
export type NodeCycle = { type: 'Cycle', group: string, values: Expression[] }
export type NodeTableRow = { type: 'TableRow', body: Node[], params?: NodeTableRowParams[], variable: string, collection: Expression }
export type NodeUnknown = { type: 'Unknown', name: string, body: string, args: string }

export type Node =
  | NodeText
  | NodeOutput
  | NodeAssign
  | NodeRender
  | NodeIf
  | NodeFor
  | NodeForBreak
  | NodeForContinue
  | NodeCapture
  | NodeComment
  | NodeCase
  | NodeRaw
  | NodeEcho
  | NodeIncrement
  | NodeDecrement
  | NodeShortCode
  | NodeCycle
  | NodeTableRow
  | NodeUnknown
  
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

/** Table row context object */
export type TableRowLoopContext = ForLoopContext & {
  col: number
  col0: number
  colFirst: boolean
  colLast: boolean
  row: number
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
  'capture',
  'endcapture',
  'comment',
  'endcomment',
  'case',
  'when',
  'endcase',
  'raw',
  'endraw',
  'echo',
  'increment',
  'decrement',
  'cycle',
  'tablerow',
  'endtablerow',
  'liquid'
] as const

export const TokenOperatorValues = [
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  '+',
  '-',
  '*',
  '/',
  'and',
  'or',
  'contains',
  'not'
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
  '[',
  ']'
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
type TemplateMeta = {
  source: string
}

export type Template = {
  type: 'Template',
  meta: TemplateMeta
  body: Node[]
}

export type Layout = {
  type: 'Layout',
  meta: TemplateMeta
  template: Template,
  frontmatter: Record<string, unknown>,
}

export type FullPage = {
  type: 'FullPage',
  template: Template,
  layouts: {
    name: string,
    template: Template,
    sourcePath: string
  }[],
}