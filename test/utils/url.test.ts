import { describe, it } from 'node:test'
import assert from 'node:assert'
import { toUrl } from '#utils/url.ts'

describe('toUrl function', () => {
	it('returns path relative to output root', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build', '.build/about/index.html'),
			'https://moritz.berlin/about/'
		)
	})

	it('strips trailing index.html from the URL', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build', '.build/index.html'),
			'https://moritz.berlin/'
		)
	})

	it('keeps non-index filenames intact', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build', '.build/feed.xml'),
			'https://moritz.berlin/feed.xml'
		)
	})

	it('removes trailing slash from base before joining', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin/', '.build', '.build/about/index.html'),
			'https://moritz.berlin/about/'
		)
	})

	it('handles deeply nested output paths', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build', '.build/blog/2024/post/index.html'),
			'https://moritz.berlin/blog/2024/post/'
		)
	})

	it('handles output that is just the output root with no subpath', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build', '.build/'),
			'https://moritz.berlin/'
		)
	})

	it('uses output root instead of final build directory during atomic builds', () => {
		assert.strictEqual(
			toUrl('https://moritz.berlin', '.build.tmp.123', '.build.tmp.123/is/index.html'),
			'https://moritz.berlin/is/'
		)
	})
})
