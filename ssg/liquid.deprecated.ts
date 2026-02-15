import { DIRECTORIES } from "#config"
import { logParser as log } from "#utils/log.ts"
import { loadFile } from "#utils/fs.ts"

export type Variables = Record<string, string>

export function replaceVariables (content: string, variables: Variables): string {
  let result = content
  const pattern = new RegExp(`{{\\s*(.+?)\\s*}}`, 'g')
  result = result.replaceAll(pattern, (match, variableName) => {
    return variables[variableName] ?? match
    
  })
  return result
}

/**
 * Liquid syntax:
 * {% render "file.html" %}
 * {% render "file.html", foo: "value", bar: "20" } %}
 */
function parseRenderVariables(liquidString?: string): Variables {
  if (!liquidString) return {}
  const matches = liquidString.matchAll(/(\w+)\s*:\s*(?:"([^"]+)"|([^,}%\s]+))/g)
  return Array
    .from(matches)
    .reduce((acc, match) => {
      acc[match[1]] = match[2] ?? match[3]
      return acc
    }, {})
}

async function handleRender(content: string, renderPath: string): Promise<string> {
  const renderName = renderPath
    .replace(/{%\s*render\s+([^\s,]+)[\s\S]*?%}/, '$1')
    .trim()
  
  let renderContent = await loadFile(
    DIRECTORIES.INTERNAL.INCLUDES,
    renderName.endsWith('.html') ? renderName : `${renderName}.html`)

  const syntaxMatch = renderPath.match(/{%.*?%}/gs)
  const includeVariables = parseRenderVariables(syntaxMatch ? syntaxMatch[0] : undefined)
  if (Object.keys(includeVariables).length > 0) {
    renderContent = replaceVariables(renderContent, includeVariables) 
  }

  return content.replace(renderPath, renderContent)
}

export async function parseLiquid(content: string): Promise<string> {
  const liquid = content.match(/{%.*?%}/gs)
  if (!liquid) {
    return content
  }
  
  let result = content
  
  for (let index= 0; index < liquid.length; index++) {
    const line = liquid[index]
    if (line.includes('render')) {
      result = await handleRender(result, line)
    } else {
      log(`Skipping Liquid syntax: ${line}`, { lvl: 'debug' })
    }
  }

  return result
}