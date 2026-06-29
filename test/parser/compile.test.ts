import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { compile, createPageContext } from '#parser/compile.ts'

const baseUrl = 'https://moritz.berlin'
const outputRoot = '.build.tmp.test'

function emptyCompileOptions (overrides: Partial<Parameters<typeof compile>[2]> = {}) {
	return {
		layoutCache: new Map(),
		data: new Map(),
		baseUrl,
		shortCodes: {},
		filters: {},
		outputRoot,
		...overrides,
	}
}

describe('createPageContext function', () => {
	it('builds page.url from baseUrl and output paths under a temp build root', () => {
		const context = createPageContext(
			new Map(),
			'src/pages/is/index.liquid',
			`${outputRoot}/is/index.html`,
			outputRoot,
			baseUrl,
			{},
		)

		assert.strictEqual(context.page.url, 'https://moritz.berlin/is/')
		assert.strictEqual(context.page.outputPath, `${outputRoot}/is/index.html`)
	})

	it('builds the homepage URL when output is the temp root index file', () => {
		const context = createPageContext(
			new Map(),
			'src/pages/home/index.liquid',
			`${outputRoot}/index.html`,
			outputRoot,
			baseUrl,
			{},
		)

		assert.strictEqual(context.page.url, 'https://moritz.berlin/')
	})

	it('builds nested post URLs from deeply nested output paths', () => {
		const context = createPageContext(
			new Map(),
			'src/posts/2026-05-15-markdown-test.md',
			`${outputRoot}/writes/2026/markdown-test/index.html`,
			outputRoot,
			baseUrl,
			{ layout: 'post' },
			{ date: new Date('2026-05-15T00:00:00.000Z') },
		)

		assert.strictEqual(context.page.url, 'https://moritz.berlin/writes/2026/markdown-test/')
		assert.strictEqual(
			(context.page.date as Date).getTime(),
			new Date('2026-05-15T00:00:00.000Z').getTime(),
		)
	})
})

describe('compile function', () => {
	it('renders page.url into template output', async () => {
		const fixturePath = resolve('test/fixtures/compile/page-url.liquid')
		const source = await readFile(fixturePath, 'utf-8')

		const { rendered } = await compile(source, fixturePath, {
			...emptyCompileOptions(),
			outputPath: `${outputRoot}/is/index.html`,
		})

		assert.match(rendered, /content="https:\/\/moritz\.berlin\/is\/"/)
	})
})
