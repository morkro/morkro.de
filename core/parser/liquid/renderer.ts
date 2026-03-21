import type { Expression, ExpressionBinary, Template, ForLoopContext } from "./types.ts";
import type { templateResolver } from "./resolver.ts";
import { getFromObject } from "#utils/object.ts";
import { ParserError, BreakSignal, ContinueSignal } from "./utils.ts";

export type RenderContext = Record<string, unknown>

function resolveExpression (expression: Expression, localContext: RenderContext): unknown {
  if (expression.type === 'Literal') {
    return expression.value
  } else if (expression.type === 'Var') {
    return getFromObject(expression.path, localContext)
  } else if (expression.type === 'Binary') {
    throw new ParserError(`Unexpected binary expression`, 0)
  } else if (expression.type === 'Range') {
    const from = Number(resolveExpression(expression.from, localContext))
    const to = Number(resolveExpression(expression.to, localContext))
    return Array.from({ length: to - from + 1 }, (_, i) => from + i)
  }
  return undefined
}

function evaluateBinary (condition: ExpressionBinary, localContext: RenderContext) {
  const left = resolveExpression(condition.left, localContext)
  const right = resolveExpression(condition.right, localContext)

  switch (condition.operator) {
    case 'or':
      return left || right
    case 'and':
      return left && right
    case 'contains':
      return String(left).includes(String(right))
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
      return Number(left) > Number(right)
    case '<':
      return Number(left) < Number(right)
    case '>=':
      return Number(left) >= Number(right)
    case '<=':
      return Number(left) <= Number(right)
  }
}

export async function render(
  template: Template,
  context: RenderContext,
  resolver: typeof templateResolver,
  renderCache = new Map<string, Template>()
): Promise<string> {
  let result: string[] = []
  const localContext: RenderContext = Object.create(context)

  for (const node of template.body) {
    switch (node.type) {
      case 'Text':
        result.push(node.value)
        break
      case 'Render':
        let file: Template
        if (renderCache.has(node.file)) {
          file = renderCache.get(node.file)!
        } else {
          const resolved = await resolver(template.meta.source, node.file)
          renderCache.set(node.file, resolved)
          file = resolved
        }

        const renderContext = {}
        if (node.variables.length > 0) {
          for (const variable of node.variables) {
            renderContext[variable.name] = resolveExpression(variable.expression, localContext)
          }
        }
        
        // Renders should have isolated scope, so not passing the global context
        result.push(await render(file, renderContext, resolver, renderCache))
        break
      case 'Assign':
        localContext[node.name] = resolveExpression(node.expression, localContext)
        break
      case 'Capture':
        localContext[node.name] = await render(
          { type: 'Template', body: node.body, meta: template.meta },
          localContext,
          resolver,
          renderCache
        )
        break
      case 'Output':
        result.push(String(resolveExpression(node.expression, localContext)))
        break
      case 'If':
        let condition: unknown
        if (node.condition.type === 'Binary') {
          condition = evaluateBinary(node.condition, localContext)
        } else {
          condition = resolveExpression(node.condition, localContext)
        }

        if (node.negated) condition = !condition

        if (Boolean(condition)) {
          result.push(await render(
            { type: 'Template', body: node.body, meta: template.meta },
            localContext,
            resolver,
            renderCache
          ))
        } else {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await render(
              { type: 'Template', body: node.elseBody, meta: template.meta },
              localContext,
              resolver,
              renderCache
            ))
          }
        }
        break
      case 'For':
        const collection = resolveExpression(node.collection, localContext)
        if (!Array.isArray(collection)) {
          throw new ParserError(`Expected array but got ${typeof collection}`, 0)
        }

        if (collection.length === 0) {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await render(
              { type: 'Template', body: node.elseBody, meta: template.meta },
              localContext,
              resolver,
              renderCache
            ))
          }
        } else {
          let _collection: unknown[] = collection
          for (const param of node.params ?? []) {
            if (param.type === 'reversed') _collection = _collection.toReversed()
            if (param.type === 'offset') _collection = _collection.slice(param.value)
            if (param.type === 'limit') _collection = _collection.slice(0, param.value)
          }

          for (let i = 0; i < _collection.length; i++) {
            const isolatedContext = Object.create(localContext) // Isolated scope for the loop
            isolatedContext[node.variable] = _collection[i]
            isolatedContext['forloop'] = {
              index: i + 1,
              index0: i,
              rindex: _collection.length - i,
              rindex0: _collection.length - i - 1,
              first: i === 0,
              last: i === _collection.length - 1,
              length: _collection.length,
            } satisfies ForLoopContext

            try {
              result.push(await render(
                { type: 'Template', body: node.body, meta: template.meta },
                isolatedContext,
                resolver,
                renderCache
              ))
            } catch (error) {
              if (error instanceof BreakSignal) {
                break
              }
              if (error instanceof ContinueSignal) {
                continue
              }
              throw error
            }
          }
        }
        break
      case 'ForBreak':
        throw new BreakSignal()
      case 'ForContinue':
        throw new ContinueSignal()
    }
  }

  return result.join('')
}