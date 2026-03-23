import type {
  InnerToken,
  Token,
  Expression,
  Node,
  Template,
  TokenKeyword,
  NodeIf,
  TokenOperator,
  TokenIdent,
  NodeForParams,
  NodeCaseWhen
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

type ParseOperand = (cursor: CursorState, ctx: ParseContext) => ParseExpressionResult

const comparisonOperators = new Set<TokenOperator['value']>([
	'==',
	'!=',
	'>',
	'<',
	'>=',
	'<=',
])

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

  if (token.type === 'Punct' && token.value === '(') {
    cursor = next(cursor)
    const { expression: from, cursor: fromCursor } = parseExpression(cursor, ctx)
    cursor = fromCursor

    const currentToken = current(cursor)
    if (currentToken.type !== 'Punct' || currentToken.value !== '..') {
      throw new ParserError(
        `Expected ".." but got ${current(cursor).type}`,
        current(cursor).start,
        ctx.source, ctx.filePath)
    }

    cursor = next(cursor)
    const { expression: to, cursor: toCursor } = parseExpression(cursor, ctx)

    cursor = toCursor
    const toToken = current(cursor)
    if (toToken.type !== 'Punct' || toToken.value !== ')') {
      throw new ParserError(
        `Expected ")" but got ${toToken.type}`,
        toToken.start,
        ctx.source, ctx.filePath)
    }

    cursor = next(cursor)
    return {
      expression: { type: 'Range', from, to },
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

function parseWhenExpressions (innerTokens: InnerToken[], ctx: ParseContext): Expression[] {
	const values: Expression[] = []
	let cursor: CursorState = { tokens: innerTokens, index: 1 }
	const first = parseExpression(cursor, ctx)
	values.push(first.expression)
	cursor = first.cursor

	while (current(cursor).type !== 'EOF') {
		const punct = current(cursor)
		if (punct.type !== 'Punct' || punct.value !== ',') {
			throw new ParserError(
				`Expected "," or end of tag in when, got ${punct.type}`,
				punct.start,
				ctx.source,
				ctx.filePath
			)
		}
		cursor = next(cursor)
		const nextPart = parseExpression(cursor, ctx)
		values.push(nextPart.expression)
		cursor = nextPart.cursor
	}

	return values
}

function parseComparisonExpression (cursor: CursorState,ctx: ParseContext): ParseExpressionResult {
	let { expression: left, cursor: leftCursor } = parseExpression(cursor, ctx)
	
  const currentToken = current(leftCursor)
	if (currentToken.type !== 'Operator' || !comparisonOperators.has(currentToken.value)) {
		return { expression: left, cursor: leftCursor }
	}

	const operator = currentToken.value
	leftCursor = next(leftCursor)

	const { expression: right, cursor: rightCursor } = parseExpression(leftCursor, ctx)
	return {
		expression: { type: 'Binary', left, right, operator },
		cursor: rightCursor,
	}
}

function parseLeftAssociative (
	cursor: CursorState,
	ctx: ParseContext,
	parseOperand: ParseOperand,
	operator: TokenOperator['value']
): ParseExpressionResult {
  let { expression: left, cursor: leftCursor } = parseOperand(cursor, ctx)

  let currentToken = current(leftCursor)
  while (currentToken.type === 'Operator' && currentToken.value === operator) {
    leftCursor = next(leftCursor)
    const { expression: right, cursor: rightCursor } = parseOperand(leftCursor, ctx)
    left = { type: 'Binary', left, right, operator }
    leftCursor = rightCursor
    currentToken = current(leftCursor)
  }

  return { expression: left, cursor: leftCursor }
}

function parseContainsExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseComparisonExpression, 'contains')
}

function parseAndExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseContainsExpression, 'and')
}

function parseOrExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseAndExpression, 'or')
}

function parseCondition (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  const { expression, cursor: conditionCursor } = parseOrExpression(cursor, ctx)

  const currentToken = current(conditionCursor)
  if (currentToken.type !== 'EOF') {
    throw new ParserError(
      `Expected "EOF" but got ${currentToken.type}`,
      currentToken.start,
      ctx.source,
      ctx.filePath
    )
  }

  return { expression, cursor: conditionCursor }
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

  // {% for ... %}
  // {% break %}
  if (token.value === 'break') {
    return { type: 'ForBreak' }
  }

  // {% for ... %}
  // {% continue %}
  if (token.value === 'continue') {
    return { type: 'ForContinue' }
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
        const isToken = (name: TokenKeyword['value']) =>
          firstToken.type === 'Keyword' && firstToken.value === name

        if (isToken('comment')) {
          const { nodes: body, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['endcomment']
          )
          index = endIndex
          nodes.push({ type: 'Comment', body })
          continue
        }

        if (stopKeywords && firstToken.type === 'Keyword' && stopKeywords.includes(firstToken.value)) {
          return {
            nodes: trimLeadingWhitespace(nodes),
            endIndex: index + 1,
            stoppedAt: firstToken.value,
            stoppedAtTokens: innerTokens
          }
        }

        if (isToken('capture')) {
          const nameToken = innerTokens[1] as TokenIdent
          if (nameToken.type !== 'Ident') {
            throw new ParserError(
              `Expected "Ident" but got ${nameToken.type}`,
              nameToken.start,
              ctx.source,
              ctx.filePath
            )
          }

          const { nodes: body, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['endcapture']
          )
          
          index = endIndex
          nodes.push({ type: 'Capture', name: nameToken.value, body })
          continue
        }

        if (isToken('if')) {
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

        if (isToken('case')) {
          const { expression: subject } = parseExpression({
            tokens: innerTokens,
            index: 1
          }, ctx)
          const { nodes: leadingNodes, stoppedAt, stoppedAtTokens, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['when', 'else', 'endcase']
          )

          // check that there is only whitespace between the case and when tags
          for (const node of leadingNodes) {
            if (node.type !== 'Text' || node.value.trim() !== '') {
              throw new ParserError(
                'Only whitespace may appear between {% case %} and the next {% when %}, {% else %}, or {% endcase %}',
                innerTokens[0].start,
                ctx.source,
                ctx.filePath
              )
            }
          }

          let elseBody: Node[] = []
          let stopped = stoppedAt
          let cursor = endIndex
          let tagTokens = stoppedAtTokens
          let whens: NodeCaseWhen[] = []

          while (stopped === 'when') {
            if (tagTokens === undefined) {
              throw new ParserError(
                'Internal parse error: expected {% when %} tags after {% case %}',
                innerTokens[0].start,
                ctx.source,
                ctx.filePath
              )
            }
            const values = parseWhenExpressions(tagTokens, ctx)
            const segment = parseNodes(tokens, cursor, ctx, ['when', 'else', 'endcase'])
            whens.push({ values, body: segment.nodes })
            stopped = segment.stoppedAt
            cursor = segment.endIndex
            tagTokens = segment.stoppedAtTokens
          }

          if (stopped === 'else') {
            const elseResult = parseNodes(tokens, cursor, ctx, ['endcase'])
            elseBody = elseResult.nodes
            index = elseResult.endIndex
            nodes.push({ type: 'Case', subject, whens, elseBody })
          } else {
            index = cursor
            nodes.push({ type: 'Case', subject, whens })
          }

          continue
        }

        if (isToken('unless')) {
          const { expression: condition } = parseCondition({
            tokens: innerTokens,
            index: 1
          }, ctx)
          const { nodes: body, stoppedAt, stoppedAtTokens, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['else', 'endunless']
          )

          let elseBody: Node[] = []

          if (stoppedAt === 'else') {
            const elseResult = parseNodes(tokens, endIndex, ctx,['endunless'])
            elseBody = elseResult.nodes
            index = elseResult.endIndex
            nodes.push({ type: 'If', condition, body, elseBody, negated: true })
          } else {
            index = endIndex
            nodes.push({ type: 'If', condition, body, negated: true })
          }

          continue
        }

        if (isToken('for')) {
          const variable = innerTokens[1] as TokenIdent
          if (variable.type !== 'Ident') {
            throw new ParserError(
              `Expected "Ident" but got ${variable.type}`,
              variable.start,
              ctx.source,
              ctx.filePath
            )
          }

          const { expression: iterable, cursor: iterableCursor } = parseExpression({
            tokens: innerTokens,
            index: 3
          }, ctx)
          const { nodes: body, stoppedAt, endIndex } = parseNodes(
            tokens,
            index + 1,
            ctx,
            ['else', 'endfor']
          )

          let cursor = iterableCursor
          const forParams: NodeForParams[] = []
          let elseBody: Node[] = []

          // Parse limit and offset params
          while (current(cursor).type === 'Ident') {
            const params = current(cursor) as TokenIdent
            const isNotParam = params.value !== 'limit' && params.value !== 'offset' && params.value !== 'reversed'
            if (isNotParam) break

            if (params.value === 'reversed') {
              forParams.push({ type: 'reversed' })
              cursor = next(cursor)
              continue
            }

            cursor = next(cursor)
            const colonToken = current(cursor)
            // Expect ":" after the param name
            if (colonToken.type !== 'Punct' || colonToken.value !== ':') {
              throw new ParserError(
                `Expected ":" but got ${colonToken.type}`,
                colonToken.start,
                ctx.source,
                ctx.filePath
              )
            }

            cursor = next(cursor)
            const { expression: value, cursor: valueCursor } = parseExpression(cursor, ctx)
            // Expect a number literal
            if (value.type !== 'Literal' || typeof value.value !== 'number') {
              throw new ParserError(
                `Expected "Literal" but got ${params.value}`,
                params.start,
                ctx.source,
                ctx.filePath
              )
            }

            if (params.value === 'limit') {
              forParams.push({ type: 'limit', value: value.value })
            } else if (params.value === 'offset') {
              forParams.push({ type: 'offset', value: value.value })
            }
            cursor = valueCursor
          }

          const hasParams = forParams.length > 0
          if (stoppedAt === 'else') {
            const elseResult = parseNodes(tokens, endIndex, ctx, ['endfor'])
            elseBody = elseResult.nodes
            index = elseResult.endIndex
            nodes.push({ type: 'For', variable: variable.value, collection: iterable, body, elseBody, params: hasParams ? forParams : undefined })
          } else {
            index = endIndex
            nodes.push({ type: 'For', variable: variable.value, collection: iterable, body, params: hasParams ? forParams : undefined })
          }

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
      meta: { source: ctx.filePath },
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
