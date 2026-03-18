import type {
  InnerToken,
  Token,
  Expression,
  Node,
  Template,
  TokenKeyword,
  NodeIf,
  TokenOperator,
  TokenIdent
} from './types.ts'
import { tokenize, tokenizeInner } from './tokenizer.ts'
import { ParserError } from './utils.ts'

type CursorState = {
  readonly tokens: InnerToken[]
  readonly index: number
}

type ParseContext = {
  readonly source: string
  readonly filePath: string
}

type ParseResult = {
  readonly nodes: Node[]
  readonly endIndex: number
  readonly stoppedAt?: TokenKeyword['value']
  readonly stoppedAtTokens?: InnerToken[]
}

type ParseIfResult = {
  readonly node: NodeIf
  readonly endIndex: number
}

type ParseExpressionResult = {
  readonly expression: Expression
  readonly cursor: CursorState
}

const current = (cursor: CursorState) => {
  const token = cursor.tokens[cursor.index]
  if (!token) {
    throw new ParserError(
      `Expected token but got EOF`,
      cursor.tokens[cursor.index - 1]?.end ?? 0
    )
  }
  return token
}
const next = (cursor: CursorState): CursorState => ({
  tokens: cursor.tokens,
  index: cursor.index + 1
})

function trimLeadingWhitespace (nodes: Node[]): Node[] {
  const _nodes = Array.from(nodes)
  for (let i = 0; i < _nodes.length; i++) {
    const node = _nodes[i]
    if (node.type === 'Text') {
      _nodes[i] = { ...node, value: node.value.replace(/^\n/, '') }
    }
  }
  return _nodes
}

function parseCondition (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  const { expression: left, cursor: leftCursor } = parseExpression(cursor, ctx)
  cursor = leftCursor
  if (current(cursor).type !== 'Operator') {
    return { expression: left, cursor }
  }
  
  const token = current(cursor) as TokenOperator
  cursor = next(cursor)
  const { expression: right, cursor: rightCursor } = parseExpression(cursor, ctx)

  return {
    expression: { type: 'Binary', left, right, operator: token.value },
    cursor: rightCursor
  }
}

function parseExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  const token = current(cursor)

  if (token.type === 'String' || token.type === 'Number') {
    return {
      expression: { type: 'Literal', value: token.value },
      cursor: next(cursor)
    }
  }

  if (token.type === 'Ident') {
    const path = [token.value]
    cursor = next(cursor) 
    
    let currentToken = current(cursor)
    while (currentToken.type === 'Punct' && currentToken.value === '.') {
      cursor = next(cursor)
      const identToken = current(cursor)
      if (identToken.type !== 'Ident') {
        throw new ParserError(
          `Expected identifier after '.', got ${identToken.type}`,
          identToken.start,
          ctx.source,
          ctx.filePath
        )
      }
      path.push(identToken.value)
      cursor = next(cursor)
      currentToken = current(cursor)
    }

    return {
      expression: { type: 'Var', path },
      cursor
    }
  }

  throw new ParserError(
    `Unsupported expression starting with ${token.type}`,
    token.start,
    ctx.source,
    ctx.filePath
  )
}

function parseTag (tokens: InnerToken[], ctx: ParseContext): Node {
  let cursor: CursorState = { tokens, index: 0 }
  const token = current(cursor)

  if (token.type !== 'Keyword') {
    throw new ParserError(
      `Unknown keyword ${token.type}`,
      token.start,
      ctx.source,
      ctx.filePath
    )
  }
  
  // {% assign key = value %}
  if (token.value === 'assign') {
    cursor = next(cursor)

    const nameToken = current(cursor)
    if (nameToken.type !== 'Ident') {
      throw new ParserError(
        `Expected "Ident" but got ${nameToken.type}`,
        nameToken.start,
        ctx.source,
        ctx.filePath
      )
    }
    cursor = next(cursor)

    const punctToken = current(cursor)
    if (punctToken.type !== 'Punct' || punctToken.value !== '=') {
      throw new ParserError(
        `Expected "Punct" but got ${punctToken.type}`,
        punctToken.start,
        ctx.source,
        ctx.filePath
      )
    }
    cursor = next(cursor)

    const { expression, cursor: newCursor } = parseExpression(cursor, ctx)
    cursor = newCursor
    return {
      type: 'Assign',
      name: nameToken.value,
      expression, // until EOF
    }
  }

  // {% render "file.html", key: value %}
  // {% render 'file.html', key: value %}
  if (token.value === 'render') {
    cursor = next(cursor)
    
    const fileToken = current(cursor)
    if (fileToken.type !== 'Ident' && fileToken.type !== 'String') {
      throw new ParserError(
        `Expected filename (identifier or string) but got ${fileToken.type}`, 
        fileToken.start,
        ctx.source,
        ctx.filePath
      )
    }
    const fileName = fileToken.value
    cursor = next(cursor)
    const variables: { name: string, expression: Expression }[] = []

    let currentToken = current(cursor)
    if (currentToken.type === 'Punct' && currentToken.value === ',') {
      cursor = next(cursor)
      currentToken = current(cursor)
    }

    while (currentToken.type === 'Ident') {
      const keyName = currentToken.value
      cursor = next(cursor)
      
      const colonToken = current(cursor)
      if (colonToken.type !== 'Punct' || colonToken.value !== ':') {
        throw new ParserError(
          `Expected ":" but got ${colonToken.type}`,
          colonToken.start,
          ctx.source,
          ctx.filePath
        )
      }
      cursor = next(cursor)

      const result = parseExpression(cursor, ctx)
      cursor = result.cursor
      variables.push({ name: keyName, expression: result.expression })

      currentToken = current(cursor)
      if (currentToken.type === 'Punct' && currentToken.value === ',') {
        cursor = next(cursor)
        currentToken = current(cursor)
      }
    }

    return {
      type: 'Render',
      file: fileName,
      variables
    }
  }

  throw new ParserError(
    `Unsupported tag starting with ${token.type} "${token.value}"`,
    token.start,
    ctx.source,
    ctx.filePath
  )
}

function parseIfBlock (
  tokens: Token[],
  innerTokens: InnerToken[],
  startIndex: number,
  ctx: ParseContext
): ParseIfResult {
  const { expression: condition } = parseCondition({ tokens: innerTokens, index: 1 }, ctx)
  const { nodes: ifBody, stoppedAt, stoppedAtTokens, endIndex } = parseNodes(
    tokens,
    startIndex,
    ctx,
    ['else', 'elsif', 'endif']
  )

  let elseBody: Node[] = []
  let finalEndIndex: number = endIndex

  if (stoppedAt === 'elsif') {
    const nestedIf = parseIfBlock(tokens, stoppedAtTokens!, endIndex, ctx)
    elseBody = [nestedIf.node]
    finalEndIndex = nestedIf.endIndex
  } else if (stoppedAt === 'else') {
    const elseResult = parseNodes(tokens, endIndex, ctx, ['endif'])
    elseBody = elseResult.nodes
    finalEndIndex = elseResult.endIndex
  }

  return {
    node: { type: 'If', condition, body: ifBody, elseBody },
    endIndex: finalEndIndex
  }
}

function parseNodes(
  tokens: Token[],
  startIndex: number,
  ctx: ParseContext,
  stopKeywords?: TokenKeyword['value'][]
): ParseResult {
  const nodes: Node[] = []
  let index = startIndex

  while (index < tokens.length) {
    const token = tokens[index]

    switch (token.type) {
      case 'Text':
        nodes.push({ type: 'Text', value: token.value })
        index++
        break
      case 'Output':
        const { expression } = parseExpression({
          tokens: tokenizeInner(token.value, token.innerStart),
          index: 0
        }, ctx)
        nodes.push({ type: 'Output', expression })
        index++
        break
      case 'Tag': {
        const innerTokens = tokenizeInner(token.value, token.innerStart)
        const firstToken = innerTokens[0]

        if (stopKeywords && firstToken.type === 'Keyword' && stopKeywords.includes(firstToken.value)) {
          return {
            nodes: trimLeadingWhitespace(nodes),
            endIndex: index + 1,
            stoppedAt: firstToken.value,
            stoppedAtTokens: innerTokens
          }
        }

        if (firstToken.type === 'Keyword' && firstToken.value === 'if') {
          const { expression: condition } = parseCondition({
            tokens: innerTokens,
            index: 1
          }, ctx)
          const { nodes: body, stoppedAt, stoppedAtTokens, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['else', 'elsif', 'endif']
          )
          let elseBody: Node[] = []

          if (stoppedAt === 'elsif') {
            const elsifResult = parseIfBlock(tokens, stoppedAtTokens!, endIndex, ctx)
            
            index = elsifResult.endIndex
            nodes.push({
              type: 'If',
              condition,
              body,
              elseBody: [elsifResult.node]
            })
          } else if (stoppedAt === 'else') {
            const elseResult = parseNodes(tokens, endIndex, ctx,['endif'])
            elseBody = elseResult.nodes
            index = elseResult.endIndex
            nodes.push({ type: 'If', condition, body, elseBody })
          } else {
            index = endIndex
            nodes.push({ type: 'If', condition, body })
          }

          continue
        }

        if (firstToken.type === 'Keyword' && firstToken.value === 'for') {
          const variable = innerTokens[1] as TokenIdent
          if (variable.type !== 'Ident') {
            throw new ParserError(
              `Expected "Ident" but got ${variable.type}`,
              variable.start,
              ctx.source,
              ctx.filePath
            )
          }
          const { expression: iterable } = parseExpression({
            tokens: innerTokens,
            index: 3
          }, ctx)
          const { nodes: body, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['endfor']
          )

          nodes.push({ type: 'For', variable: variable.value, collection: iterable, body })

          index = endIndex
          continue
        }    

        nodes.push(parseTag(innerTokens, ctx))
        index++
        break
      }
      default:
        throw new ParserError(
          `Unknown token type: ${(token as Token).type}`,
          (token as Token).start,
          ctx.source,
          ctx.filePath
        )
    }
  }

  return { nodes: trimLeadingWhitespace(nodes), endIndex: index }
}

export function parseLiquid(input: string, sourcePath: string): Template {
  const ctx: ParseContext = { source: input, filePath: sourcePath }
  try {
    return {
      type: 'Template',
      meta: {
        source: ctx.filePath
      },
      body: parseNodes(tokenize(input), 0, ctx).nodes
    }
  } catch (error) {
    if (error instanceof ParserError && !error.source) {
      throw new ParserError(
        error.rawMessage,
        error.offset,
        ctx.source,
        ctx.filePath
      )
    }
    throw error
  }
}
