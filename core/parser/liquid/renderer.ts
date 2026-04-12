import { BreakSignal, ContinueSignal, ParserError } from "#parser/utils.ts";
import { logParser } from "#utils/log.ts";
import { getFromObject } from "#utils/object.ts";
import type { templateResolver } from "./resolver.ts";
import type { Expression, ExpressionBinary, ForLoopContext, Node, Template } from "./types.ts";

export type RenderContext = Record<string, unknown>

function getCollectionName (expression: Expression): string {
  if (expression.type === 'Var') {
    return expression.path.join('.')
  }
  return '(non-variable collection)'
}

function resolveExpression (expression: Expression, localContext: RenderContext): unknown {
  if (expression.type === 'Literal') {
    return expression.value
  }
  if (expression.type === 'Var') {
    return getFromObject(expression.path, localContext)
  }
  if (expression.type === 'Binary') {
    throw new ParserError('Unexpected binary expression', 0)
  }
  if (expression.type === 'Range') {
    const from = Number(resolveExpression(expression.from, localContext))
    const to = Number(resolveExpression(expression.to, localContext))
    return Array.from({ length: to - from + 1 }, (_, i) => from + i)
  }
  return undefined
}

function evaluateExpression (expression: Expression, localContext: RenderContext) {
  if (expression.type === 'Binary') {
    return evaluateBinary(expression, localContext)
  }
  return resolveExpression(expression, localContext)
}

function evaluateBinary (condition: ExpressionBinary, localContext: RenderContext) {
	const operands = () => ({
		left: evaluateExpression(condition.left, localContext),
		right: evaluateExpression(condition.right, localContext),
	})

	switch (condition.operator) {
		case 'or':
			return (
				evaluateExpression(condition.left, localContext)
				|| evaluateExpression(condition.right, localContext)
			)
		case 'and':
			return (
				evaluateExpression(condition.left, localContext)
				&& evaluateExpression(condition.right, localContext)
			)
		case 'contains': {
			const { left, right } = operands()
			return String(left).includes(String(right))
		}
		case '==': {
			const { left, right } = operands()
			return left === right
		}
		case '!=': {
			const { left, right } = operands()
			return left !== right
		}
		case '>': {
			const { left, right } = operands()
			return Number(left) > Number(right)
		}
		case '<': {
			const { left, right } = operands()
			return Number(left) < Number(right)
		}
		case '>=': {
			const { left, right } = operands()
			return Number(left) >= Number(right)
		}
		case '<=': {
			const { left, right } = operands()
			return Number(left) <= Number(right)
		}
		default:
			throw new ParserError(`Unexpected binary operator: ${condition.operator}`, 0)
	}
}

async function renderNodes(
  nodes: Node[],
  templateSource: string,
  localContext: RenderContext,
  resolver: typeof templateResolver,
  renderCache: Map<string, Template>
) : Promise<string> {
  const result: string[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'Text':
        result.push(node.value)
        break
      case 'Render': {
        let file: Template
        if (renderCache.has(node.file)) {
          file = (
            renderCache.get(node.file)
            ?? { type: 'Template', body: [], meta: { source: templateSource } }
          )
        } else {
          const resolved = await resolver(templateSource, node.file)
          renderCache.set(node.file, resolved)
          file = resolved
        }

        const renderContext = { shortCodes: localContext.shortCodes }
        if (node.variables.length > 0) {
          for (const variable of node.variables) {
            renderContext[variable.name] = resolveExpression(variable.expression, localContext)
          }
        }
        
        // Renders should have isolated scope, so not passing the global context
        result.push(await render(file, renderContext, resolver, renderCache))
        break
      }
      case 'Assign':
        localContext[node.name] = resolveExpression(node.expression, localContext)
        break
      case 'Capture':
        localContext[node.name] = await render(
          { type: 'Template', body: node.body, meta: { source: templateSource } },
          localContext,
          resolver,
          renderCache
        )
        break
      case 'Comment':
        break
      case 'Output':
        result.push(String(resolveExpression(node.expression, localContext)))
        break
      case 'If': {
        let condition = evaluateExpression(node.condition, localContext)
        if (node.negated) condition = !condition

        if (Boolean(condition)) {
          result.push(await render(
            { type: 'Template', body: node.body, meta: { source: templateSource } },
            localContext,
            resolver,
            renderCache
          ))
        } else {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await render(
              { type: 'Template', body: node.elseBody, meta: { source: templateSource } },
              localContext,
              resolver,
              renderCache
            ))
          }
        }
        break
      }
      case 'Case': {
        const subject = evaluateExpression(node.subject, localContext)
        let matched = false

        for (const when of node.whens) {
          const values = when.values.map(value => evaluateExpression(value, localContext))
          if (values.includes(subject)) {
            result.push(await render(
              { type: 'Template', body: when.body, meta: { source: templateSource } },
              localContext,
              resolver,
              renderCache
            ))
            matched = true
            break
          }
        }

        if (!matched && node.elseBody && node.elseBody.length > 0) {
          result.push(await render(
            { type: 'Template', body: node.elseBody, meta: { source: templateSource } },
            localContext,
            resolver,
            renderCache
          ))
        }
        break
      }
      case 'For': {
        const rawCollection = resolveExpression(node.collection, localContext)
        let collection = rawCollection as unknown[]
        if (!Array.isArray(collection)) {
          const colName = getCollectionName(node.collection)
          logParser(
            `Expected array but got ${typeof rawCollection} for collection "${colName}" in ${templateSource}`,
            { lvl: 'error' }
          )
          collection = []
        }

        if (collection.length === 0) {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await render(
              { type: 'Template', body: node.elseBody, meta: { source: templateSource } },
              localContext,
              resolver,
              renderCache
            ))
          }
        } else {
          let _collection = collection
          for (const param of node.params ?? []) {
            if (param.type === 'reversed') _collection = _collection.toReversed()
            if (param.type === 'offset') _collection = _collection.slice(param.value)
            if (param.type === 'limit') _collection = _collection.slice(0, param.value)
          }

          for (let i = 0; i < _collection.length; i++) {
            const isolatedContext = Object.create(localContext) // Isolated scope for the loop
            isolatedContext[node.variable] = _collection[i]
            isolatedContext.forloop = {
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
                { type: 'Template', body: node.body, meta: { source: templateSource } },
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
      }
      case 'ForBreak':
        throw new BreakSignal()
      case 'ForContinue':
        throw new ContinueSignal()
      case 'Raw':
        result.push(await render(
          { type: 'Template', body: node.body, meta: { source: templateSource } },
          localContext,
          resolver,
          renderCache
        ))
        break
      case 'ShortCode': {
        const shortCodes = localContext.shortCodes as Record<string, () => unknown>
        const fn = shortCodes?.[node.name]
        if (!fn) {
          logParser(`Unknown short code: ${node.name}`, { lvl: 'error' })
        }
        result.push(String(fn?.()))
        break
      }
      case 'Unknown': {
        logParser(`Unknown tag: ${node.name}`, { lvl: 'warn' })
        break
      }
    }
  }

  return result.join('')
}

export async function render(
  template: Template,
  context: RenderContext,
  resolver: typeof templateResolver,
  renderCache = new Map<string, Template>()
): Promise<string> {
  const localContext: RenderContext = Object.create(context)
  return await renderNodes(
    template.body,
    template.meta.source,
    localContext,
    resolver,
    renderCache
  )
}