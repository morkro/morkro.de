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

const samplePost = '2015-08-27-how-to-setup-your-own-es6-project.md'

describe('loadCollection function', () => {
	it('resolves permalink URLs from filename date and slug', async () => {
		const entries = await loadCollection('posts', postsSpec)
		const sample = entries.find((entry) =>
			entry.meta.inputPath.endsWith(samplePost))

		assert.ok(sample)
		assert.strictEqual(sample.url, '/writes/2015/how-to-setup-your-own-es6-project/')
		assert.strictEqual(sample.date.toISOString(), '2015-08-27T00:00:00.000Z')
		assert.strictEqual(sample.data.title, 'How to setup an ES6 production-ready project')
	})

	it('sorts posts by date descending', async () => {
		const entries = await loadCollection('posts', postsSpec)

		for (let index = 0; index < entries.length - 1; index++) {
			assert.ok(entries[index].date.getTime() >= entries[index + 1].date.getTime())
		}
	})

	it('strips frontmatter from collection entry content', async () => {
		const entries = await loadCollection('posts', postsSpec)
		const sample = entries.find((entry) =>
			entry.meta.inputPath.endsWith(samplePost))

		assert.ok(sample)
		assert.doesNotMatch(sample.content, /^---/)
		assert.match(sample.content, /^As ES6 is really hyped/)
	})
})

describe('indexCollections function', () => {
	it('maps collection input paths to their entries', async () => {
		const posts = await loadCollection('posts', postsSpec)
		const inputPath = resolve(config.directories.input, 'posts', samplePost)
		const index = indexCollections(new Map([['collections', { posts }]]))

		assert.strictEqual(index.get(inputPath)?.name, 'posts')
		assert.strictEqual(index.get(inputPath)?.entry.url, '/writes/2015/how-to-setup-your-own-es6-project/')
	})

	it('returns an empty map when collections are missing', () => {
		assert.strictEqual(indexCollections(new Map()).size, 0)
	})
})
