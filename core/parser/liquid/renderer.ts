import type { Template } from "./types.ts";
import type { templateResolver } from "./resolver.ts";

export async function render(template: Template, resolver: typeof templateResolver): Promise<string> {
  let result = ''

  for (const node of template.body) {
    switch (node.type) {
      case 'Text':
        result += node.value
        break
      case 'Render':
        const includes = await resolver(template.meta.path, node.file)
        result += await render(includes, resolver)
        break
    }
  }

  return result
}