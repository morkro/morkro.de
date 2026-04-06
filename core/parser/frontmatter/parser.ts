type IndentedBlockResult =
	| { variant: 'list'; list: string[]; nextIndex: number }
	| { variant: 'map'; map: Record<string, string>; nextIndex: number }

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/

function parseQuotedString(raw: string) {
	const string = raw.trim()
	if (string.length < 2) return string

	const open = string[0]
	const close = string[string.length - 1]
	if ((open === "'" && close === "'") || (open === '"' && close === '"')) {
		return string.slice(1, -1)
	}
  
	return string.replace(/^['"]|['"]$/g, '')
}

function contentIndent(line: string): number {
	return line.length - line.trimStart().length
}

function findNextNonEmpty(lines: string[], from: number): number {
	for (let index = from; index < lines.length; index++) {
		const trim = lines[index].trim()
		if (trim && !trim.startsWith('#')) {
			return index
		}
	}
	return -1
}

/**
 * Parses lines more indented than `parentIndent` until dedent or EOF.
 * List vs map is decided from the first non-comment line: `- ` → list, `key:` → map.
 */
function parseIndentedBlock(
	lines: string[],
	start: number,
	parentIndent: number
): IndentedBlockResult {
	let index = start

	while (index < lines.length) {
		const raw = lines[index]
		const trimmed = raw.trim()

		if (!trimmed || trimmed.startsWith('#')) {
			index++
			continue
		}

		if (contentIndent(raw) <= parentIndent) {
			return { variant: 'map', map: {}, nextIndex: index }
		}

		break
	}

	if (index >= lines.length) {
		return { variant: 'map', map: {}, nextIndex: index }
	}

	const firstRaw = lines[index]
	if (/^\s*-\s/.test(firstRaw)) {
		const list: string[] = []
		let _index = index

		while (_index < lines.length) {
			const raw = lines[_index]
			const t = raw.trim()
			if (!t || t.startsWith('#')) {
				_index++
				continue
			}

			if (contentIndent(raw) <= parentIndent) break
			const m = /^\s*-\s+(.*)$/.exec(raw)
			if (!m) break
			
      list.push(parseQuotedString(m[1]))
			_index++
		}

		return { variant: 'list', list, nextIndex: _index }
	}

	const map: Record<string, string> = {}
	while (index < lines.length) {
		const raw = lines[index]
		const trimmed = raw.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			index++
			continue
		}

		if (contentIndent(raw) <= parentIndent) {
			break
		}

		const colon = trimmed.indexOf(':')
		if (colon === -1) {
			index++
			continue
		}

		const key = trimmed.slice(0, colon).trim()
		map[key] = parseQuotedString(trimmed.slice(colon + 1))
		index++
	}

	return { variant: 'map', map, nextIndex: index }
}

export function removeFrontmatter(file: string) {
	const frontmatter = file.match(FRONTMATTER_REGEX)
	let result = file
	if (frontmatter) {
		result = result.replace(frontmatter[0], '')
	}
	return result.trim()
}

export function parseFrontmatter<T>(content: string): T {
  // files can have some frontmatter meta data at the top, wrapped in "---" lines.
  // the wrapped text structure is in YAML format. we parse the content using regex and return it as an object.
	const result: Record<string, unknown> = {}
	const inner = content.match(FRONTMATTER_REGEX)?.[1]
	if (!inner) {
		return result as T
	}

	const lines = inner.split('\n')

	let index = 0
	while (index < lines.length) {
		const raw = lines[index]
		const trimmed = raw.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			index++
			continue
		}

		const colonIdx = trimmed.indexOf(':')
		if (colonIdx === -1) {
			index++
			continue
		}

		const key = trimmed.slice(0, colonIdx).trim()
		const value = parseQuotedString(trimmed.slice(colonIdx + 1))
		const indent = contentIndent(raw)

		if (value !== '') {
			result[key] = value
			index++
			continue
		}

		const next = findNextNonEmpty(lines, index + 1)
		if (next === -1) {
			result[key] = ''
			index++
			continue
		}

		if (contentIndent(lines[next]) > indent) {
			const block = parseIndentedBlock(lines, next, indent)
			if (block.variant === 'list') {
				result[key] = block.list
			} else {
				result[key] = block.map
			}
			index = block.nextIndex
			continue
		}

		result[key] = ''
		index++
	}

	return result as T
}
