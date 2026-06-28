import { describe, it } from 'node:test'
import assert from 'node:assert'
import { loadDataFiles } from '#data/index.ts'

describe('loadDataFiles function', () => {
	it('overrides site.url with userConfig.baseUrl', async () => {
		const data = await loadDataFiles({ baseUrl: 'https://example.test' })
		const site = data.get('site')

		assert.strictEqual(typeof site, 'object')
		assert.notStrictEqual(site, null)
		assert.strictEqual((site as { url: string }).url, 'https://example.test')
	})

	it('leaves site.url unchanged when baseUrl is not set', async () => {
		const data = await loadDataFiles()
		const site = data.get('site')

		assert.strictEqual(typeof site, 'object')
		assert.notStrictEqual(site, null)
		assert.strictEqual((site as { url: string }).url, 'https://moritz.berlin')
	})
})
