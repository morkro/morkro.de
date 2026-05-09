import config, { type RenderServices } from '#config';
import { BreakSignal, ContinueSignal, ParserError } from "#parser/utils.ts";
import { logger } from "#utils/log.ts";
import { getFromObject } from "#utils/object.ts";
import { applyFilter } from "./filters.ts";
import type { templateResolver } from "./resolver.ts";
import type {
  Expression,
  ExpressionBinary,
  ForLoopContext,
  Node,
  TableRowLoopContext,
  Template
} from "./types.ts";

const log = logger('Parser')

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
    return evaluateBinary(expression, localContext)
  }
  if (expression.type === 'Unary') {
    return evaluateExpression(expression, localContext)
  }
  if (expression.type === 'Range') {
    const from = Number(resolveExpression(expression.from, localContext))
    const to = Number(resolveExpression(expression.to, localContext))
    return Array.from({ length: to - from + 1 }, (_, i) => from + i)
  }
  if (expression.type === 'Access') {
    const object = resolveExpression(expression.object, localContext)
    if (object === null || object === undefined) return undefined
    const key = resolveExpression(expression.key, localContext)
    return (object as Record<string, unknown>)[String(key)]
  }
  if (expression.type === 'Filter') {
    let value = resolveExpression(expression.input, localContext)
    for (const filter of expression.filters) {
      const args = filter.args.map(arg => resolveExpression(arg, localContext))
      value = applyFilter(filter.name, value, args, localContext.__filters__ as RenderServices["__filters__"])
    }
    return value
  }
  return undefined
}

function evaluateExpression (expression: Expression, localContext: RenderContext) {
  if (expression.type === 'Binary') {
    return evaluateBinary(expression, localContext)
  }
  if (expression.type === 'Unary') {
    const operand = evaluateExpression(expression.operand, localContext)
    if (expression.operator === 'not') {
      return !operand
    }
    if (expression.operator === '-') {
      return -Number(operand)
    }
    throw new ParserError(`Unexpected unary operator: ${expression.operator}`, 0)
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
    case '+': {
      const { left, right } = operands()
      if (typeof left !== 'number' || typeof right !== 'number') {
        return String(left) + String(right)
      }
      return Number(left) + Number(right)
    }
    case '-': {
      const { left, right } = operands()
      return Number(left) - Number(right)
    }
    case '*': {
      const { left, right } = operands()
      return Number(left) * Number(right)
    }
    case '/': {
      const { left, right } = operands()
      return Number(left) / Number(right)
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

  if (!localContext.__counters__) {
    localContext.__counters__ = new Map<string, number>()
  }

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

        const renderContext: RenderContext = {
          __shortCodes__: localContext.__shortCodes__ as RenderServices["__shortCodes__"],
          __filters__: localContext.__filters__ as RenderServices["__filters__"]
        }
        if (node.variables.length > 0) {
          for (const variable of node.variables) {
            renderContext[variable.name] = resolveExpression(variable.expression, localContext)
          }
        }
        
        // Renders should have isolated scope, so not passing the global context
        result.push(await renderNodes(
          file.body,
          file.meta.source,
          renderContext,
          resolver,
          renderCache
        ))
        break
      }
      case 'Assign':
        if (config.reservedKeys.has(node.name as keyof RenderServices)) {
          log.error('Cannot assign to reserved key', {
            name: node.name,
            templateSource,
          })
          break
        }
        localContext[node.name] = resolveExpression(node.expression, localContext)
        break
      case 'Capture':
        localContext[node.name] = await renderNodes(
          node.body,
          templateSource,
          localContext,
          resolver,
          renderCache
        )
        break
      case 'Comment':
        break
      case 'Output':
        result.push(
          String(
            resolveExpression(node.expression, localContext)))
        break
      case 'If': {
        let condition = evaluateExpression(node.condition, localContext)
        if (node.negated) condition = !condition

        if (Boolean(condition)) {
          result.push(await renderNodes(
            node.body,
            templateSource,
            localContext,
            resolver,
            renderCache
          ))
        } else {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await renderNodes(
              node.elseBody,
              templateSource,
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
            result.push(await renderNodes(
              when.body,
              templateSource,
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
          log.error('Expected array but got', {
            type: typeof rawCollection,
            collection: colName,
            templateSource,
          })
          collection = []
        }

        if (collection.length === 0) {
          if (node.elseBody && node.elseBody.length > 0) {
            result.push(await renderNodes(
              node.elseBody,
              templateSource,
              localContext,
              resolver,
              renderCache
            ))
          }
        } else {
          let _collection = collection
          for (const param of node.params ?? []) {
            if (param.type === 'offset') _collection = _collection.slice(param.value)
            if (param.type === 'limit') _collection = _collection.slice(0, param.value)
            if (param.type === 'reversed') _collection = _collection.toReversed()
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
              result.push(await renderNodes(
                node.body,
                templateSource,
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
        result.push(await renderNodes(
          node.body,
          templateSource,
          localContext,
          resolver,
          renderCache
        ))
        break
      case 'ShortCode': {
        const shortCodes = localContext.__shortCodes__ as RenderServices["__shortCodes__"]
        const fn = shortCodes?.[node.name]
        if (!fn || typeof fn !== 'function') {
          log.error('Unknown shortcode', {
            name: node.name,
            templateSource,
          })
          break
        }
        result.push(String(fn()))
        break
      }
      case 'Echo':
        result.push(String(evaluateExpression(node.expression, localContext)))
        break
      case 'Increment': {
        // Liquid outputs first, then increments
        const counters = localContext.__counters__ as Map<string, number>
        const current = counters.get(node.variable) ?? 0
        result.push(String(current))
        counters.set(node.variable, current + 1)
        break
      }
      case 'Decrement': {
        // Liquid decrements first, then outputs
        const counters = localContext.__counters__ as Map<string, number>
        const current = counters.get(node.variable) ?? 0
        result.push(String(current - 1))
        counters.set(node.variable, current - 1)
        break
      }
      case 'Cycle': {
        if (!localContext.__cycles__) {
          localContext.__cycles__ = new Map<string, number>()
        }

        const cycles = localContext.__cycles__ as Map<string, number>
        const index = cycles.get(node.group) ?? 0
        const value = resolveExpression(node.values[index % node.values.length], localContext)
        result.push(String(value))
        cycles.set(node.group, index + 1)
        break
      }
      case 'TableRow': {
        const rawCollection = resolveExpression(node.collection, localContext)
        let collection = rawCollection as unknown[]
        if (!Array.isArray(collection)) {
          const colName = getCollectionName(node.collection)
          log.error('Expected array but got', {
            type: typeof rawCollection,
            collection: colName,
            templateSource,
          })
          collection = []
        }

        let cols = collection.length
        for (const param of node.params ?? []) {
          if (param.type === 'offset') collection = collection.slice(param.value)
          if (param.type === 'limit') collection = collection.slice(0, param.value)
          if (param.type === 'cols') cols = param.value
        }

        for (let index = 0; index < collection.length; index++) {
          const col0 = index % cols
          const row = Math.floor(index / cols) + 1
          const colLast = col0 === cols - 1 || index === collection.length - 1

          if (col0 === 0) {
            result.push(`<tr class="row${row}">`)
          }

          const isolatedContext = Object.create(localContext)
          isolatedContext[node.variable] = collection[index]
          isolatedContext.tablerowloop = {
            index: index + 1,
            index0: index,
            rindex: collection.length - index,
            rindex0: collection.length - index - 1,
            first: index === 0,
            last: index === collection.length - 1,
            length: collection.length,
            col: col0 + 1,
            col0,
            colFirst: col0 === 0,
            colLast,
            row,
          } satisfies TableRowLoopContext

          result.push(`<td class="col${col0 + 1}">`)
          result.push(await renderNodes(
            node.body,
            templateSource,
            isolatedContext,
            resolver,
            renderCache
          ))
          result.push('</td>')

          if (colLast) {
            result.push('</tr>')
          }
        }

        break
      }
      case 'Unknown': {
        log.warn(`Unknown tag: ${node.name}`, { templateSource })
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