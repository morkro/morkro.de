import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import config from '#config'
import { indexCollections, loadCollection } from '#data/collections.ts'

const postsSpec = {
	input: 'posts',
	sortBy: 'date' as const,
	sortOrder: 'desc' as const,
	permalink: `/writes/{{ page.date | date: 'year' }}/{{ page.slug }}/`,
}

describe('loadCollection function', () => {
	it('resolves permalink URLs from filename date and slug', async () => {
		const entries = await loadCollection('posts', postsSpec)
		const markdownTest = entries.find((entry) =>
			entry.meta.inputPath.endsWith('2026-05-15-markdown-test.md'))

		assert.ok(markdownTest)
		assert.strictEqual(markdownTest.url, '/writes/2026/markdown-test/')
		assert.strictEqual(markdownTest.date.toISOString(), '2026-05-15T00:00:00.000Z')
		assert.strictEqual(markdownTest.data.title, 'Testing all Markdown features for my parser')
	})

	it('sorts posts by date descending', async () => {
		const entries = await loadCollection('posts', postsSpec)

		for (let index = 0; index < entries.length - 1; index++) {
			assert.ok(entries[index].date.getTime() >= entries[index + 1].date.getTime())
		}
	})

	it('strips frontmatter from collection entry content', async () => {
		const entries = await loadCollection('posts', postsSpec)
		const markdownTest = entries.find((entry) =>
			entry.meta.inputPath.endsWith('2026-05-15-markdown-test.md'))

		assert.ok(markdownTest)
		assert.doesNotMatch(markdownTest.content, /^---/)
		assert.match(markdownTest.content, /^## Headings/)
	})
})

describe('indexCollections function', () => {
	it('maps collection input paths to their entries', async () => {
		const posts = await loadCollection('posts', postsSpec)
		const inputPath = resolve(config.directories.input, 'posts', '2026-05-15-markdown-test.md')
		const index = indexCollections(new Map([['collections', { posts }]]))

		assert.strictEqual(index.get(inputPath)?.name, 'posts')
		assert.strictEqual(index.get(inputPath)?.entry.url, '/writes/2026/markdown-test/')
	})

	it('returns an empty map when collections are missing', () => {
		assert.strictEqual(indexCollections(new Map()).size, 0)
	})
})
