import { tokenize, tokenizeInner } from '#parser/liquid/tokenizer.ts'
import type {
  Expression,
  InnerToken,
  Node,
  NodeCaseWhen,
  NodeForParams,
  NodeIf,
  NodeTableRowParams,
  ParseContext,
  Template,
  Token,
  TokenIdent,
  TokenKeyword,
  TokenPunct
} from '#parser/liquid/types.ts'
import { type CursorState, current, next } from '#parser/liquid/utils.ts'
import { ParserError } from '#parser/utils.ts'
import {
  type ParseExpressionResult,
  parseExpression,
  parseFilterExpression,
  parseOrExpression,
  parseWhenExpressions
} from './expressions.ts'

type ParseResult = {
  readonly nodes: Node[]
  readonly endIndex: number
  readonly stoppedAt?: TokenKeyword['value']
  readonly stoppedAtTokens?: InnerToken[]
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

function parseOptionalElse (
  tokens: Token[],
  body: Node[],
  stoppedAt: string | undefined,
  endIndex: number,
  ctx: ParseContext,
  stopKeywords: TokenKeyword['value']
): { body: Node[], elseBody?: Node[], endIndex: number } {
  if (stoppedAt !== 'else') {
    return { body, endIndex }
  }
  
  const elseResult = parseNodes(tokens, endIndex, ctx, [stopKeywords])
  return {
    body,
    elseBody: elseResult.nodes,
    endIndex: elseResult.endIndex
  }
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

    const { expression, cursor: newCursor } = parseFilterExpression(cursor, ctx)
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
    const { expression } = parseFilterExpression(cursor, ctx)
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

  const { expression, cursor: collectionCursor } = parseExpression(({
    tokens: innerTokens,
    index: cursor.index
  }), ctx)
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
        const { expression } = parseFilterExpression({
          tokens: tokenizeInner(token.value, token.innerStart),
          index: 0
        }, ctx)
        nodes.push({ type: 'Output', expression })
        index++
        break
      }
      case 'Tag': {
        const trimmedValue = token.value.trimStart()
        const isLiquidBlock = trimmedValue === 'liquid'
          || trimmedValue.startsWith('liquid\n')
          || trimmedValue.startsWith('liquid\r\n')

        if (isLiquidBlock) {
          const firstLine = token.value.indexOf('\n')
          // Empty liquid block
          if (firstLine === -1) {
            index++
            continue
          }

          const rawBody = token.value.slice(firstLine + 1)
          const lines = rawBody
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'))

          const syntheticTokens: Token[] = lines.map(line => ({
            type: 'Tag',
            value: line,
            start: token.start,
            end: token.end,
            innerStart: token.innerStart,
          }))

          const { nodes: liquidNodes } = parseNodes(syntheticTokens, 0, ctx)
          nodes.push(...liquidNodes)
          index++
          continue
        }

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

          let stopped = stoppedAt
          let cursor = endIndex
          let tagTokens = stoppedAtTokens
          const whens: NodeCaseWhen[] = []

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

          const parsedElseResult = parseOptionalElse(tokens, leadingNodes, stopped, cursor, ctx, 'endcase')
          index = parsedElseResult.endIndex
          nodes.push({
            type: 'Case',
            subject,
            whens,
            elseBody: parsedElseResult.elseBody
          })

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

          const parsedElseResult = parseOptionalElse(tokens, body, stoppedAt, endIndex, ctx, 'endunless')
          index = parsedElseResult.endIndex
          nodes.push({
            type: 'If',
            condition,
            body: parsedElseResult.body,
            elseBody: parsedElseResult.elseBody,
            negated: true
          })

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
          const parsedElseResult = parseOptionalElse(tokens, body, stoppedAt, endIndex, ctx, 'endfor')
          index = parsedElseResult.endIndex
          nodes.push({
            type: 'For',
            variable: variable.value,
            collection: iterable,
            body: parsedElseResult.body,
            elseBody: parsedElseResult.elseBody,
            params: hasParams ? forParams : undefined
          })

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
