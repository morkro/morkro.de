import type { NodeVariable, Template } from "./types.ts";
import type { templateResolver } from "./resolver.ts";
import { getFromObject } from "#utils/object.ts";

export type RenderContext = Record<string, unknown>

function getVariableValue (node: NodeVariable, localContext: RenderContext): unknown {
  if (node.expression.type === 'Literal') {
    return node.expression.value
  } else if (node.expression.type === 'Var') {
    return getFromObject(node.expression.path, localContext)
  }
  return undefined
}

export async function render(
  template: Template,
  context: RenderContext,
  resolver: typeof templateResolver
): Promise<string> {
  let result = ''
  const localContext: RenderContext = structuredClone(context)
  const renderCache = new Map<string, Template>()

  for (const node of template.body) {
    switch (node.type) {
      case 'Text':
        result += node.value
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
            renderContext[variable.name] = getVariableValue(variable, localContext)
          }
        }
        
        // Renders should have isolated scope, so not passing the global context
        result += await render(file, renderContext, resolver)
        break
      case 'Assign':
        localContext[node.name] = getVariableValue(node, localContext)
        break
      case 'Output':
        if (node.expression.type === 'Var') {
          result += getFromObject(node.expression.path, localContext)
        } else {
          result += node.expression.value
        }
        break
    }
  }

  return result
}