import type { Template } from "./types.ts";
import type { templateResolver } from "./resolver.ts";
import { getFromObject } from "#utils/object.ts";
import { log } from "#utils/log.ts";

export type RenderContext = Record<string, unknown>

export async function render(
  template: Template,
  context: RenderContext,
  resolver: typeof templateResolver
): Promise<string> {
  let result = ''
  const localContext: RenderContext = structuredClone(context)

  for (const node of template.body) {
    switch (node.type) {
      case 'Text':
        result += node.value
        break
      case 'Render':
        const includes = await resolver(template.meta.path, node.file)
        // Renders should have isolated scope, so not passing the local context
        result += await render(includes, context, resolver)
        break
      case 'Assign':
        if (node.expression.type === 'Literal') {
          localContext[node.name] = node.expression.value
        } else if (node.expression.type === 'Var') {
          localContext[node.name] = getFromObject(node.expression.path, localContext)
        }
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

  log(JSON.stringify(localContext, null, 2), { lvl: 'debug' })

  return result
}