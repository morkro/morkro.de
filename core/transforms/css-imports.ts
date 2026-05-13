import { dirname, relative } from 'node:path';
import { loadFile } from '#utils/fs.ts';
import { resolveWithin } from '#utils/path-resolve.ts';

const cssImportRuleRegex = /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^'")\s;]+))\s*\)?\s*([^;]*);/g
const cssExternalUrlRegex = /^(?:[a-z]+:)?\/\//i

/**
 * Example:
 * {
    start: 135,
    end: 179,
    specifier: 'globals/system.css',
    qualifier: 'layer(globals)',
    raw: '@import "globals/system.css" layer(globals);'
  }
 */
type CssImportDeclaration = {
  start: number
  end: number
  specifier: string
  qualifier: string
  raw: string
}

type CssImportQualifier = {
  layerToken?: string
  supportsToken?: string
  mediaToken?: string
}

function indentCssBlock (css: string): string {
	return css
		.split('\n')
		.map((line) => (line.length > 0 ? `\t${line}` : line))
		.join('\n')
}

function maskBlockComments(css: string): string {
	return css.replace(
    /\/\*[\s\S]*?\*\//g,
    (comment) => comment.replace(/[^\n]/g, ' '))
}

function wrapCssWithAtRule (css: string, atRule: string): string {
  return `@${atRule} {\n${indentCssBlock(css)}\n}`
}

function getImportStatements(css: string): CssImportDeclaration[] {
  const statements: CssImportDeclaration[] = []
  const maskedCss = maskBlockComments(css)
  cssImportRuleRegex.lastIndex = 0

  /**
   * match[0] = the entire match
   * match[1] = the quoted specifier, e.g. "globals/system.css"
   * match[2] = the unquoted specifier, e.g. "globals/system.css"
   * match[3] = the unquoted specifier, e.g. "globals/system.css"
   * match[4] = the qualifier, e.g. "layer(globals)"
   */
  let match = cssImportRuleRegex.exec(maskedCss)
  while (match) {
    const specifier = match[1] ?? match[2] ?? match[3]
    if (specifier) {
      statements.push({
        start: match.index,
        end: match.index + match[0].length,
        specifier,
        qualifier: (match[4] ?? '').trim(),
        raw: match[0],
      })
    }

    match = cssImportRuleRegex.exec(maskedCss)
  }

  return statements
}

function consumeFunctionToken (source: string, name: string): { token: string, end: number} | null {
	const prefix = `${name}(`
	if (!source.startsWith(prefix)) return null

	let cursor = 0
	for (let index = name.length; index < source.length; index++) {
		const char = source[index]

		if (char === '(') {
      cursor++
      continue
    }

		if (char === ')') {
			cursor--
			if (cursor === 0) {
				return {
					token: source.slice(0, index + 1),
					end: index + 1
				}
			}
		}
	}

	throw new Error(`Unclosed qualifier function "${name}(...)" in "${source}"`)
}

function parseImportQualifier(qualifier: string): CssImportQualifier {
  let trimmed = qualifier.trim()
  let layerToken: string | undefined
  let supportsToken: string | undefined

  if (trimmed.startsWith('layer(')) {
		const layerFunction = consumeFunctionToken(trimmed, 'layer')
		if (!layerFunction) throw new Error(`Invalid layer qualifier "${qualifier}"`)

		layerToken = layerFunction.token
		trimmed = trimmed.slice(layerFunction.end).trimStart()
	} else if (trimmed === 'layer' || trimmed.startsWith('layer ')) {
		layerToken = 'layer'
		trimmed = trimmed.slice('layer'.length).trimStart()
	}

	if (trimmed.startsWith('supports(')) {
		const supportsFunction = consumeFunctionToken(trimmed, 'supports')
		if (!supportsFunction) throw new Error(`Invalid supports qualifier "${qualifier}"`)
		
    supportsToken = supportsFunction.token
		trimmed = trimmed.slice(supportsFunction.end).trimStart()
	}

  return {
    layerToken,
    supportsToken,
    mediaToken: trimmed.length > 0 ? trimmed : undefined,
  }
}

function applyImportQualifier(css: string, qualifier: string): string {
  const parsed = parseImportQualifier(qualifier)
  const wrapper: string[] = []

  if (parsed.layerToken) {
    const token = parsed.layerToken.trim()
    if (token.startsWith('layer(') && token.endsWith(')')) {
      wrapper.push(`layer ${token.slice('layer('.length, -1).trim()}`)
    } else {
      wrapper.push(token)
    }
  }
  
  if (parsed.supportsToken) {
    const token = parsed.supportsToken.trim()
    if (token.startsWith('supports(') && token.endsWith(')')) {
      wrapper.push(`supports ${token.slice('supports('.length, -1).trim()}`)
    } else {
      wrapper.push(token)
    }
  }
  
  if (parsed.mediaToken) {
    wrapper.push(`media ${parsed.mediaToken}`)
  }

  let wrappedCss = css.trim()
  for (let index = wrapper.length - 1; index >= 0; index--) {
    wrappedCss = wrapCssWithAtRule(wrappedCss, wrapper[index])
  }

  return wrappedCss
}

async function loadImportFile(filePath: string, input: string, stack: Set<string>): Promise<string> {
  if (stack.has(filePath)) {
    const chain = [...stack, filePath].join(' -> ')
		throw new Error(`Circular CSS @import detected: ${chain}`)
  }

  stack.add(filePath)
  try {
    const fileName = relative(input, filePath)
    const content = await loadFile<string>(input, fileName)
    return await walkCssImports(content, filePath, input, stack)
  } finally {
    stack.delete(filePath)
  }
}

async function walkCssImports (
  css: string,
  filePath: string,
  input: string,
  stack: Set<string>
): Promise<string> {
  const statements = getImportStatements(css)
  if (statements.length === 0) return css

  let cursor = 0
  let result = ''

  for (const statement of statements) {
    result += css.slice(cursor, statement.start)

    if (
      statement.specifier.startsWith('/') ||
      statement.specifier.startsWith('data:') ||
      cssExternalUrlRegex.test(statement.specifier)
    ) {
      result += statement.raw
      cursor = statement.end
      continue
    }

    const resolvedPath = resolveWithin(dirname(filePath), statement.specifier)
    const importContent = await loadImportFile(resolvedPath, input, stack)
    const qualifierContent = statement.qualifier.trim().length > 0
      ? applyImportQualifier(importContent, statement.qualifier)
      : importContent
    result += `${qualifierContent}\n`
    cursor = statement.end
  }

  result += css.slice(cursor)
  return result
}

export async function bundleCssImports (
  css: string,
  filePath: string,
  input: string
): Promise<string> {
  const resolvedPath = resolveWithin(input, filePath)
  return await walkCssImports(css, resolvedPath, input, new Set<string>())
}