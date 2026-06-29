import type {
  Expression,
  Filter,
  FilterArg,
  InnerToken,
  ParseContext,
  TokenOperator,
  TokenPunct
} from '#parser/liquid/types.ts'
import { type CursorState, current, next } from '#parser/liquid/utils.ts'
import { ParserError } from '#parser/utils.ts'

export type ParseExpressionResult = {
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

export function parseExpression (_cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
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

export function parseWhenExpressions (innerTokens: InnerToken[], ctx: ParseContext): Expression[] {
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

export function parseComparisonExpression (cursor: CursorState,ctx: ParseContext): ParseExpressionResult {
	let { expression: left, cursor: leftCursor } = parseAdditiveExpression(cursor, ctx)
	
  const currentToken = current(leftCursor)
	if (currentToken.type !== 'Operator' || !comparisonOperators.has(currentToken.value)) {
		return { expression: left, cursor: leftCursor }
	}

	const operator = currentToken.value
	leftCursor = next(leftCursor)

	const { expression: right, cursor: rightCursor } = parseAdditiveExpression(leftCursor, ctx)
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

export function parseContainsExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseComparisonExpression, 'contains')
}

export function parseAndExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseContainsExpression, 'and')
}

export function parseOrExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
	return parseLeftAssociative(cursor, ctx, parseAndExpression, 'or')
}

export function parseUnaryExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  let _cursor = cursor
  const token = current(_cursor)

  if (token.type === 'Operator' && (token.value === 'not' || token.value === '-')) {
    const operator = token.value as 'not' | '-'
    _cursor = next(cursor)
    const { expression: operand, cursor: operandCursor } = parseUnaryExpression(_cursor, ctx)
    return {
      expression: { type: 'Unary', operator, operand },
      cursor: operandCursor
    }
  }

  return parseExpression(_cursor, ctx)
}

export function parseMultiplicativeExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  let { expression: left, cursor: leftCursor } = parseUnaryExpression(cursor, ctx)

  let currentToken = current(leftCursor)
  while (currentToken.type === 'Operator' && (currentToken.value === '*' || currentToken.value === '/')) {
    const operator = currentToken.value as '*' | '/'
    leftCursor = next(leftCursor)
    const { expression: right, cursor: rightCursor } = parseUnaryExpression(leftCursor, ctx)
    left = { type: 'Binary', left, right, operator }
    leftCursor = rightCursor
    currentToken = current(leftCursor)
  }

  return { expression: left, cursor: leftCursor }
}

export function parseAdditiveExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  let { expression: left, cursor: leftCursor } = parseMultiplicativeExpression(cursor, ctx)

  let currentToken = current(leftCursor)
  while (currentToken.type === 'Operator' && (currentToken.value === '+' || currentToken.value === '-')) {
    const operator = currentToken.value as '+' | '-'
    leftCursor = next(leftCursor)
    const { expression: right, cursor: rightCursor } = parseMultiplicativeExpression(leftCursor, ctx)
    left = { type: 'Binary', left, right, operator }
    leftCursor = rightCursor
    currentToken = current(leftCursor)
  }

  return { expression: left, cursor: leftCursor }
}

export function parseFilterExpression (cursor: CursorState, ctx: ParseContext): ParseExpressionResult {
  const { expression: input, cursor: expressionCursor } = parseOrExpression(cursor, ctx)
  let _cursor = expressionCursor
  const filters: Filter[] = []

  while (current(_cursor).type === 'Punct' && (current(_cursor) as TokenPunct).value === '|') {
    _cursor = next(_cursor)
    
    const filterNameToken = current(_cursor)
    if (filterNameToken.type !== 'Ident') {
      throw new ParserError(
        `Expected filter name but got ${filterNameToken.type}`,
        filterNameToken.start,
        ctx.source,
        ctx.filePath
      )
    }

    const filterName = filterNameToken.value
    _cursor = next(_cursor)

    const filterArgs: FilterArg[] = []
    // Check for colon after filter name
    if (current(_cursor).type === 'Punct' && (current(_cursor) as TokenPunct).value === ':') {
      _cursor = next(_cursor)

      const { expression: firstArg, cursor: argCursor } = parseOrExpression(_cursor, ctx)
      filterArgs.push(firstArg)
      _cursor = argCursor

      // Parse additional arguments
      while (current(_cursor).type === 'Punct' && (current(_cursor) as TokenPunct).value === ',') {
        _cursor = next(_cursor)
        const { expression: arg, cursor: nextArgCursor } = parseOrExpression(_cursor, ctx)
        filterArgs.push(arg)
        _cursor = nextArgCursor
      }
    }

    filters.push({ name: filterName, args: filterArgs })
  }

  if (filters.length === 0) {
    return { expression: input, cursor: _cursor }
  }

  return {
    expression: { type: 'Filter', input, filters },
    cursor: _cursor,
  }
}