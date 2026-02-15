import type { InnerToken, TokenIdent, Token, Expression, Node, Template, TokenKeyword } from './types.ts'
import { tokenize, tokenizeInner } from './tokenizer.ts'
import { logParser as log } from '#utils/log.ts'

type CursorState = {
  readonly tokens: InnerToken[]
  readonly index: number
}

type ParseResult = {
  readonly nodes: Node[]
  readonly endIndex: number
  readonly stoppedAt?: TokenKeyword['value']
}

const current = (cursor: CursorState) => cursor.tokens[cursor.index]
const next = (cursor: CursorState): CursorState => ({
  ...cursor,
  index: cursor.index + 1
})
const expect = <T extends InnerToken>(
  cursor: CursorState,
  fn: (tok: InnerToken) => tok is T,
  msg: string
): T => {
  const token = current(cursor)
  if (!fn(token)) {
    throw new Error(msg)
  }
  return token
}
const isIdent = (token: InnerToken): token is TokenIdent => token.type === 'Ident'

function parseExpression (tokens: InnerToken[]): Expression {
  let cursor: CursorState = { tokens, index: 0 }
  const token = current(cursor)

  if (token.type === 'String' || token.type === 'Number') {
    return { type: 'Literal', value: token.value }
  }

  if (token.type === 'Ident') {
    const path = [token.value]
    cursor = next(cursor) 
    
    let currentToken = current(cursor)
    while (currentToken.type === 'Punct' && currentToken.value === '.') {
      cursor = next(cursor)
      const identToken = expect(cursor, isIdent, 'Expected identifier after \'.\'')
      path.push(identToken.value)
      cursor = next(cursor)
      currentToken = current(cursor)
    }

    return { type: 'Var', path }
  }

  throw new Error(`Unsupported expression starting with ${token.type}`)
}

function parseTag (tokens: InnerToken[]): Node | null {
  let cursor: CursorState = { tokens, index: 0 }
  const token = current(cursor)

  if (token.type !== 'Keyword') {
    throw new Error(`Unknown keyword ${token.type}`)
  }
  
  // {% assign key = value %}
  if (token.value === 'assign') {
    cursor = next(cursor)

    const nameToken = current(cursor)
    if (nameToken.type !== 'Ident') {
      throw new Error(`Expected "Ident" but got ${nameToken.type}`)
    }
    cursor = next(cursor)

    const punctToken = current(cursor)
    if (punctToken.type !== 'Punct' || punctToken.value !== '=') {
      throw new Error(`Expected "Punct" but got ${punctToken.type}`)
    }
    cursor = next(cursor)

    return {
      type: 'Assign',
      name: nameToken.value,
      expression: parseExpression(cursor.tokens.slice(cursor.index)) // until EOF
    }
  }

  // {% render "file.html", key: value %}
  // {% render 'file.html', key: value %}
  if (token.value === 'render') {
    cursor = next(cursor)
    
    const fileToken = current(cursor)
    if (fileToken.type !== 'Ident' && fileToken.type !== 'String') {
      throw new Error(`Expected filename (identifier or string) but got ${fileToken.type}`)
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
        throw new Error(`Expected ":" but got ${colonToken.type}`)
      }
      cursor = next(cursor)

      const valueToken = current(cursor)
      let expression: Expression
      if (valueToken.type === 'String' || valueToken.type === 'Number') {
        expression = { type: 'Literal', value: valueToken.value }
      } else if (valueToken.type === 'Ident') {
        expression = { type: 'Var', path: [valueToken.value] }
      } else {
        expression = parseExpression(cursor.tokens.slice(cursor.index))
      }
      cursor = next(cursor)

      variables.push({ name: keyName, expression })

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

  log(`Unsupported tag starting with ${token.type} "${token.value}"`, { lvl: 'error' })
  return null
  // throw new Error(`Unsupported tag starting with ${token.type} "${token.value}"`)
}

function parseNodes(tokens: Token[], startIndex: number, stopKeywords?: TokenKeyword['value'][]): ParseResult {
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
        nodes.push({
          type: 'Output',
          expression: parseExpression(tokenizeInner(token.value))
        })
        index++
        break
      case 'Tag': {
        const innerTokens = tokenizeInner(token.value)
        const firstToken = innerTokens[0]

        if (stopKeywords && firstToken.type === 'Keyword' && stopKeywords.includes(firstToken.value)) {
          return { nodes, endIndex: index + 1, stoppedAt: firstToken.value }
        }

        if (firstToken.type === 'Keyword' && firstToken.value === 'if') {
          const condition = parseExpression(innerTokens.slice(1))
          const body = parseNodes(tokens, index + 1, ['else', 'endif'])
          let elseBody: Node[] = []

          if (body.stoppedAt === 'else') {
            const result = parseNodes(tokens, body.endIndex, ['endif'])
            elseBody = result.nodes
            index = result.endIndex
            nodes.push({ type: 'If', condition, body: body.nodes, elseBody })
          } else {
            index = body.endIndex
            nodes.push({ type: 'If', condition, body: body.nodes })
          }

          continue
        }

        const node = parseTag(innerTokens)
        if (node) {
          nodes.push(node)
        }

        index++
        break
      }
      default:
        log(`Unknown token type: ${(token as Token).type}`, { lvl: 'error' })
    }
  }

  return { nodes, endIndex: index }
}

export function parseLiquid(input: string): Template {
  return {
    type: 'Template',
    body: parseNodes(tokenize(input), 0).nodes
  }
}
