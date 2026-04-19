import { ParserError } from '#parser/utils.ts'
import { tokenize, tokenizeInner } from './tokenizer.ts'
import type {
  Expression,
  InnerToken,
  Node,
  NodeCaseWhen,
  NodeForParams,
  NodeIf,
  NodeTableRowParams,
  Template,
  Token,
  TokenIdent,
  TokenKeyword,
  TokenOperator,
  TokenPunct,
} from './types.ts'

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

type ParseExpressionResult = {
  readonly expression: Expression
  readonly cursor: CursorState
}

type ParseIterationHeaderResult = {
  readonly variable: TokenIdent
  readonly expression: Expression
  readonly cursor: CursorState
}

type IfChainResult = {
  readonly node: NodeIf
  readonly endIndex: number
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
      'Expected token but got EOF',
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
      break
    }
  }
  return _nodes
}

function parseExpression (_cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  let cursor = _cursor
  let expression: Expression
  const token = current(cursor)

  if (token.type === 'String' || token.type === 'Number') {
    expression = { type: 'Literal', value: token.value }
    cursor = next(cursor)
  } else if (token.type === 'Ident') {
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

    expression = { type: 'Var', path }
  } else if (token.type === 'Punct' && token.value === '(') {
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
    expression = { type: 'Range', from, to }
  } else {
    throw new ParserError(
      `Unsupported expression starting with ${token.type}`,
      token.start,
      ctx.source,
      ctx.filePath
    )
  }

  // Postfix bracket access: x[0], x["foo"], x[key], x[1][2]
  while (current(cursor).type === 'Punct' && (current(cursor) as TokenPunct).value === '[') {
    cursor = next(cursor)
    const { expression: key, cursor: keyCursor } = parseExpression(cursor, ctx)
    cursor = keyCursor

    const closeBracketCursor = current(cursor)
    if (closeBracketCursor.type !== 'Punct' || closeBracketCursor.value !== ']') {
      throw new ParserError(
        `Expected "]" but got ${closeBracketCursor.type}`,
        closeBracketCursor.start,
        ctx.source,
        ctx.filePath
      )
    }

    cursor = next(cursor)
    expression = { type: 'Access', object: expression, key }
  }

  return { expression, cursor }
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

  // {% echo expression %}
  if (token.value === 'echo') {
    cursor = next(cursor)
    const { expression } = parseExpression(cursor, ctx)
    return { type: 'Echo', expression }
  }

  // {% increment variable %}
  if (token.value === 'increment') {
    cursor = next(cursor)
    const variableToken = current(cursor)
    if (variableToken.type !== 'Ident') {
      throw new ParserError(
        `Expected "Ident" but got ${variableToken.type}`,
        variableToken.start,
        ctx.source,
        ctx.filePath
      )
    }
    return { type: 'Increment', variable: variableToken.value }
  }

  // {% decrement variable %}
  if (token.value === 'decrement') {
    cursor = next(cursor)
    const variableToken = current(cursor)
    if (variableToken.type !== 'Ident') {
      throw new ParserError(
        `Expected "Ident" but got ${variableToken.type}`,
        variableToken.start,
        ctx.source,
        ctx.filePath
      )
    }
    return { type: 'Decrement', variable: variableToken.value }
  }

  // {% cycle group, value1, value2, ... %}
  // {% cycle "group": "one", "two", "three" %}
  if (token.value === 'cycle') {
    cursor = next(cursor)
    const first = parseExpression(cursor, ctx)
    cursor = first.cursor

    let group: string | undefined
    const values: Expression[] = []

    const afterFirst = current(cursor)
    if (afterFirst.type === 'Punct' && afterFirst.value === ':') {
      if (first.expression.type !== 'Literal' || typeof first.expression.value !== 'string') {
        throw new ParserError(
          'Cycle group name must be a string literal',
          afterFirst.start,
          ctx.source,
          ctx.filePath
        )
      }
      group = first.expression.value
      cursor = next(cursor)
      const nextValue = parseExpression(cursor, ctx)
      values.push(nextValue.expression)
      cursor = nextValue.cursor
    } else {
      values.push(first.expression)
    }

    while (current(cursor).type === 'Punct' && (current(cursor) as TokenPunct).value === ',') {
      cursor = next(cursor)
      const nextValue = parseExpression(cursor, ctx)
      values.push(nextValue.expression)
      cursor = nextValue.cursor
    }

    const derivedGroup = group ?? values.map(value => {
      if (value.type === 'Literal') return String(value.value)
      if (value.type === 'Var') return value.path.join('.')
      return '(non-variable expression)'
    }).join('.')
    
    return { type: 'Cycle', group: derivedGroup, values }
  }

  throw new ParserError(
    `Unsupported tag starting with ${token.type} "${token.value}"`,
    token.start,
    ctx.source,
    ctx.filePath
  )
}

function parseIterationHeader (innerTokens: InnerToken[], ctx: ParseContext, keyword: 'for' | 'tablerow'): ParseIterationHeaderResult {
  let cursor: CursorState = { tokens: innerTokens, index: 0 }

  const kw = current(cursor)
  if (kw.type !== 'Keyword' || kw.value !== keyword) {
    throw new ParserError(
      `Expected "${keyword}" keyword but got ${kw.type}`,
      kw.start,
      ctx.source,
      ctx.filePath
    )
  }
  cursor = next(cursor)

  const variable = current(cursor)
  if (!variable || variable.type !== 'Ident') {
    throw new ParserError(
      `Expected "Ident" but got ${variable.type}`,
      variable.start,
      ctx.source,
      ctx.filePath
    )
  }
  cursor = next(cursor)

  const inKeyword = current(cursor)
  if (!inKeyword || inKeyword.type !== 'Keyword' || inKeyword.value !== 'in') {
    throw new ParserError(
      `Expected "in" keyword but got ${inKeyword.type}`,
      inKeyword.start,
      ctx.source,
      ctx.filePath
    )
  }
  cursor = next(cursor)

  const { expression, cursor: collectionCursor } = parseExpression(({ tokens: innerTokens, index: 3 }), ctx)
  return { variable, expression, cursor: collectionCursor }
}

function parseIfChain (tokens: Token[], tagTokens: InnerToken[], startIndex: number, ctx: ParseContext): IfChainResult {
  const { expression: condition } = parseCondition({ tokens: tagTokens, index: 1 }, ctx)
	const { nodes: body, stoppedAt, stoppedAtTokens, endIndex } = parseNodes(tokens, startIndex, ctx, ['elsif', 'else', 'endif'])

	if (stoppedAt === 'elsif') {
		const nested = parseIfChain(tokens, stoppedAtTokens!, endIndex, ctx)
		return {
      node: { type: 'If', condition, body, elseBody: [nested.node] },
      endIndex: nested.endIndex
    }
	}
	
  if (stoppedAt === 'else') {
		const elseResult = parseNodes(tokens, endIndex, ctx, ['endif'])
		return {
      node: { type: 'If', condition, body, elseBody: elseResult.nodes },
      endIndex: elseResult.endIndex
    }
	}
	
  return { node: { type: 'If', condition, body }, endIndex }
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
      case 'Output': {
        const { expression } = parseExpression({
          tokens: tokenizeInner(token.value, token.innerStart),
          index: 0
        }, ctx)
        nodes.push({ type: 'Output', expression })
        index++
        break
      }
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
          const { node, endIndex } = parseIfChain(tokens, innerTokens, index + 1, ctx)

          nodes.push(node)
          index = endIndex

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
          const { variable, expression: iterable, cursor: iterableCursor } = parseIterationHeader(innerTokens, ctx, 'for')
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

        if (isToken('tablerow')) {
          const { variable, expression: iterable, cursor: iterableCursor } = parseIterationHeader(innerTokens, ctx, 'tablerow')
          let cursor = iterableCursor
          const tableRowParams: NodeTableRowParams[] = []

          while (current(cursor).type === 'Ident') {
            const param = current(cursor) as TokenIdent
            if (param.value !== 'cols' && param.value !== 'limit' && param.value !== 'offset') break

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
            const { expression: value, cursor: valueCursor } = parseExpression(cursor, ctx)
            if (value.type !== 'Literal' || typeof value.value !== 'number') {
              throw new ParserError(
                `Expected "Literal" but got ${param.value}`,
                param.start,
                ctx.source,
                ctx.filePath
              )
            }

            tableRowParams.push({
              type: param.value as 'cols' | 'limit' | 'offset',
              value: value.value
            })
            cursor = valueCursor
          }

          // reuse the body from parseNodes but re-parse to get the body nodes
          const { nodes: body, endIndex } = parseNodes(tokens, index + 1, ctx, ['endtablerow'])
          index = endIndex
          nodes.push({
            type: 'TableRow',
            variable: variable.value,
            collection: iterable,
            body,
            params: tableRowParams.length > 0 ? tableRowParams : undefined,
          })

          continue
        }
        
        if (isToken('raw')) {
          if (
            tokens[index + 1]?.type !== 'Text'
            || tokens[index + 2]?.type !== 'Tag'
            || tokens[index + 2]?.value !== 'endraw'
          ) {
            throw new ParserError(
              'Expected "Text" or "Tag" tag after "raw" tag',
              tokens[index + 1]?.start ?? token.start,
              ctx.source,
              ctx.filePath
            )
          }  

          nodes.push({ type: 'Raw', body: [{ type: 'Text', value: tokens[index + 1].value }] })
          index += 3 // skip the text and endraw tag
          continue
        }

        if (firstToken.type === 'Ident') {
          if (innerTokens.length === 2 && innerTokens[1].type === 'EOF') {
            nodes.push({ type: 'ShortCode', name: firstToken.value })
            index++
            break
          }

          const tagName = firstToken.value
          const endTagName = `end${tagName}`
          const args = innerTokens
            .slice(1)
            .filter(t => t.type !== 'EOF')
            .map(t => t.value)
            .join(' ')
          
          let searchIndex = index + 1
          let found = false
          while (searchIndex < tokens.length) {
            const token = tokens[searchIndex]
            if (token.type === 'Tag') {
              const inner = tokenizeInner(token.value, token.innerStart)
              if (inner[0].type === 'Ident' && inner[0].value === endTagName) {
                found = true
                break
              }
            }
            searchIndex++
          }

          if (found) {
            const parts: string[] = []
            for (let i = index + 1; i < searchIndex; i++) {
              parts.push(tokens[i].value)
            }
            nodes.push({
              type: 'Unknown',
              name: tagName,
              args,
              body: parts.join(''),
            })
            index = searchIndex + 1
            continue
          }

          nodes.push({ type: 'Unknown', name: tagName, body: '', args })
          index++
          break
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
