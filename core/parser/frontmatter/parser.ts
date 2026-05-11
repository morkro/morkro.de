import { coerceValue, getIndentWidth, stripQuotes } from '#parser/utils.ts'

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/
const YAML_LINE_REGEX = /^\s*-\s+(.*)$/

export type Cursor = {
	readonly lines: readonly string[]
	index: number
}

export const createCursor = (lines: readonly string[]): Cursor => ({ lines, index: 0 })

type WalkStep = {
	cursor: Cursor
	line?: { raw: string; trimmed: string }
}

type BlockResult = {
	result?: string[] | Record<string, string | number | boolean>
	index: number
}

function isBlankOrComment(line: string): boolean {
	const trimmed = line.trim()
	return !trimmed || trimmed.startsWith('#')
}

function findNextNonEmpty(lines: string[], from: number): number {
	for (let index = from; index < lines.length; index++) {
		if (!isBlankOrComment(lines[index])) {
			return index
		}
	}
	return -1
}

function walkUntilIndent(cursor: Cursor, parentIndent: number): WalkStep {
	let index = cursor.index
	const { lines } = cursor

	while (index < lines.length) {
		const raw = lines[index]
		const trimmed = raw.trim()
		if (isBlankOrComment(trimmed)) {
			index++
			continue
		}

		// we found the end of the indented block
		if (getIndentWidth(raw) <= parentIndent) {
			return { cursor: { lines, index } }
		}

		// we found the start of the indented block
		return { cursor: { lines, index }, line: { raw, trimmed } }
	}

	// we reached the end of the file
	return { cursor: { lines, index } }
}

/**
 * Parses lines more indented than `parentIndent` until dedent or EOF.
 * List vs map is decided from the first non-comment line: `- ` → list, `key:` → map.
 */
function parseIndentedBlock(cursor: Cursor, parentIndent: number): BlockResult {
	const { lines } = cursor
	const step = walkUntilIndent(cursor, parentIndent)
	if (step.line === undefined) {
		return { index: step.cursor.index }
	}

	const { raw, trimmed: firstTrimmed } = step.line
	const match = YAML_LINE_REGEX.exec(raw)
	if (match) {
		const list: string[] = []
		list.push(stripQuotes(match[1]))

		let lineCursor: Cursor = { lines, index: step.cursor.index + 1 }
		while (lineCursor.index < lines.length) {
			const inner = walkUntilIndent(lineCursor, parentIndent)
			if (inner.line === undefined) {
				return { result: list, index: inner.cursor.index }
			}

			const itemMatch = YAML_LINE_REGEX.exec(inner.line.raw)
			if (!itemMatch) {
				return { result: list, index: inner.cursor.index }
			}

			list.push(stripQuotes(itemMatch[1]))
			lineCursor = { lines, index: inner.cursor.index + 1 }
		}

		return { result: list, index: lineCursor.index }
	}

	const map: Record<string, string | number | boolean> = {}
	const colon0 = firstTrimmed.indexOf(':')
	if (colon0 !== -1) {
		const key = firstTrimmed.slice(0, colon0).trim()
		map[key] = coerceValue(stripQuotes(firstTrimmed.slice(colon0 + 1)))
	}

	let lineCursor: Cursor = { lines, index: step.cursor.index + 1 }
	while (lineCursor.index < lines.length) {
		const inner = walkUntilIndent(lineCursor, parentIndent)
		if (inner.line === undefined) {
			return { result: map, index: inner.cursor.index }
		}

		const trimmed = inner.line.trimmed
		const colon = trimmed.indexOf(':')
		if (colon === -1) {
			lineCursor = { lines, index: inner.cursor.index + 1 }
			continue
		}

		const key = trimmed.slice(0, colon).trim()
		map[key] = coerceValue(stripQuotes(trimmed.slice(colon + 1)))
		lineCursor = { lines, index: inner.cursor.index + 1 }
	}

	return { result: map, index: lineCursor.index }
}

export function removeFrontmatter(file: string) {
	const frontmatter = file.match(FRONTMATTER_REGEX)
	let result = file
	if (frontmatter) {
		result = result.replace(frontmatter[0], '')
	}
	return result
}

type PotentialFMValue = string | number | boolean | undefined | string[]

export function parseFrontmatter(content: string): Record<string, PotentialFMValue | Record<string, PotentialFMValue>> {
	const out: Record<string, PotentialFMValue | Record<string, PotentialFMValue>> = {}
	const inner = content.match(FRONTMATTER_REGEX)?.[1]
	if (!inner) {
		return out
	}

	const lines = inner.split('\n')
	let cursor = createCursor(lines)

	while (cursor.index < lines.length) {
		const raw = lines[cursor.index]
		const trimmed = raw.trim()
		if (isBlankOrComment(raw)) {
			cursor = { lines, index: cursor.index + 1 }
			continue
		}

		const colon = trimmed.indexOf(':')
		if (colon === -1) {
			cursor = { lines, index: cursor.index + 1 }
			continue
		}

		const key = trimmed.slice(0, colon).trim()

		const value = stripQuotes(trimmed.slice(colon + 1))
		if (value !== '') {
			out[key] = coerceValue(value)
			cursor = { lines, index: cursor.index + 1 }
			continue
		}
		
		const next = findNextNonEmpty(lines, cursor.index + 1)
		if (next === -1) {
			out[key] = ''
			cursor = { lines, index: cursor.index + 1 }
			continue
		}
		
		const indent = getIndentWidth(raw)
		if (getIndentWidth(lines[next]) > indent) {
			const block = parseIndentedBlock({ lines, index: next }, indent)
			out[key] = block.result
			cursor = { lines, index: block.index }
			continue
		}

		out[key] = ''
		cursor = { lines, index: cursor.index + 1 }
	}

	return out
}
